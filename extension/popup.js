const DEFAULT_CERVO_BASE_URL = "http://localhost:3000";
const LOCAL_DRAFT_TEXT_KEY = "cervoCaptureDraftText";
const LOCAL_DRAFT_IMAGES_KEY = "cervoCaptureDraftImages";
const MAX_LOCAL_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

const captureArea = document.querySelector("#capture-text");
const appendButton = document.querySelector("#append-button");
const imageFileButton = document.querySelector("#image-file-button");
const imageFileInput = document.querySelector("#image-file-input");
const imagePreviewList = document.querySelector("#image-preview-list");
const openCervoButton = document.querySelector("#open-cervo-button");
const recoveryButton = document.querySelector("#recovery-button");
const statusMessage = document.querySelector("#capture-status");

let isAuthenticated = false;
let imageDrafts = [];
let appendChain = Promise.resolve();
let recoverableAppend = null;

function getCervoBaseUrl() {
  const configuredUrl = localStorage.getItem("cervoBaseUrl");

  return (configuredUrl || DEFAULT_CERVO_BASE_URL).replace(/\/$/, "");
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function getSignedInIdleStatus() {
  return recoverableAppend ? "Append failed. Retry when ready." : "";
}

function getSignInUrl() {
  return `${getCervoBaseUrl()}/sign-in`;
}

function getAppUrl() {
  return `${getCervoBaseUrl()}/`;
}

function hasTextDraft() {
  return captureArea.value.trimEnd().length > 0;
}

function hasImageDraft() {
  return imageDrafts.length > 0;
}

function hasCaptureDraft() {
  return hasTextDraft() || hasImageDraft();
}

function saveLocalDraft() {
  localStorage.setItem(LOCAL_DRAFT_TEXT_KEY, captureArea.value);
  localStorage.setItem(LOCAL_DRAFT_IMAGES_KEY, JSON.stringify(imageDrafts));
}

function restoreLocalDraft() {
  captureArea.value = localStorage.getItem(LOCAL_DRAFT_TEXT_KEY) || "";
  try {
    const parsedImages = JSON.parse(localStorage.getItem(LOCAL_DRAFT_IMAGES_KEY) || "[]");
    imageDrafts = Array.isArray(parsedImages) ? parsedImages.filter(isStoredImageDraft) : [];
  } catch {
    imageDrafts = [];
  }
  renderImageDrafts();
}

function syncActionState() {
  appendButton.textContent = isAuthenticated ? "Append" : "Sign in";
  appendButton.disabled = isAuthenticated && !hasCaptureDraft();
  recoveryButton.hidden = !recoverableAppend;
}

function insertPlainText(text) {
  const start = captureArea.selectionStart;
  const end = captureArea.selectionEnd;

  captureArea.setRangeText(text, start, end, "end");
  captureArea.dispatchEvent(new Event("input", { bubbles: true }));
}

function isStoredImageDraft(value) {
  return (
    value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    ACCEPTED_IMAGE_TYPES.has(value.type) &&
    typeof value.size === "number" &&
    typeof value.dataUrl === "string" &&
    value.dataUrl.startsWith("data:")
  );
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read image."));
    });
    reader.addEventListener("error", () => reject(new Error("Unable to read image.")));
    reader.readAsDataURL(file);
  });
}

function validateImage(file) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Only PNG, JPEG, GIF, or WebP images can be added.";
  }

  if (file.size > MAX_LOCAL_IMAGE_BYTES) {
    return "That image is too large for a local draft.";
  }

  return "";
}

function dataUrlToBlob(dataUrl, fallbackType) {
  const [metadata, data] = dataUrl.split(",");
  const mimeType = metadata?.match(/^data:([^;]+);base64$/)?.[1] || fallbackType;

  if (!data) {
    throw new Error("Unable to append image.");
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function cloneImageDraft(image) {
  return { ...image };
}

function getCaptureSnapshot() {
  return {
    captureId: crypto.randomUUID(),
    text: captureArea.value.trimEnd(),
    images: imageDrafts.map(cloneImageDraft),
  };
}

function restoreCaptureSnapshot(snapshot) {
  captureArea.value = snapshot.text;
  imageDrafts = snapshot.images.map(cloneImageDraft);
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
}

function clearCaptureDraft() {
  captureArea.value = "";
  imageDrafts = [];
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
}

function getAppendFormData(snapshot) {
  const formData = new FormData();

  formData.set("captureId", snapshot.captureId);
  formData.set("text", snapshot.text);

  for (const image of snapshot.images) {
    formData.append("images", dataUrlToBlob(image.dataUrl, image.type), image.name);
  }

  return formData;
}

async function postAppendSnapshot(snapshot) {
  const response = await fetch(`${getCervoBaseUrl()}/api/capture/append`, {
    method: "POST",
    body: getAppendFormData(snapshot),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to append.");
  }
}

function clearRecoverableAppend(snapshot) {
  if (!snapshot || recoverableAppend === snapshot) {
    recoverableAppend = null;
    syncActionState();
  }
}

function handleAppendFailure(snapshot, error) {
  if (!hasCaptureDraft()) {
    clearRecoverableAppend(snapshot);
    restoreCaptureSnapshot(snapshot);
    setStatus(error instanceof Error ? error.message : "Unable to append.");
    captureArea.focus();
    return;
  }

  recoverableAppend = snapshot;
  syncActionState();
  setStatus("Append failed. Retry when ready.");
  captureArea.focus();
}

function enqueueAppendSnapshot(snapshot) {
  const appendWork = appendChain.then(() => postAppendSnapshot(snapshot));

  appendChain = appendWork.catch(() => {});

  return appendWork;
}

function queueAppendSnapshot(snapshot, { recoveryRetry = false } = {}) {
  const appendWork = enqueueAppendSnapshot(snapshot);

  void appendWork
    .then(() => {
      if (recoveryRetry) {
        setStatus("Failed append retried.");
      }

      clearRecoverableAppend(snapshot);
    })
    .catch((error) => handleAppendFailure(snapshot, error))
    .finally(() => {
      syncActionState();
      captureArea.focus();
    });
}

async function addImageFiles(files) {
  const acceptedFiles = [];

  for (const file of files) {
    const validationMessage = validateImage(file);

    if (validationMessage) {
      setStatus(validationMessage);
      continue;
    }

    acceptedFiles.push(file);
  }

  if (acceptedFiles.length === 0) {
    syncActionState();
    return;
  }

  const nextImages = [];

  for (const file of acceptedFiles) {
    nextImages.push({
      id: crypto.randomUUID(),
      name: file.name || "Pasted image",
      type: file.type,
      size: file.size,
      dataUrl: await readImageAsDataUrl(file),
    });
  }

  imageDrafts = [...imageDrafts, ...nextImages];
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
  setStatus(isAuthenticated ? getSignedInIdleStatus() : "Stored locally until Cervo is connected.");
}

function removeImageDraft(imageId) {
  imageDrafts = imageDrafts.filter((image) => image.id !== imageId);
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
  setStatus(isAuthenticated ? getSignedInIdleStatus() : "Stored locally until Cervo is connected.");
  captureArea.focus();
}

function renderImageDrafts() {
  imagePreviewList.replaceChildren();
  imagePreviewList.hidden = imageDrafts.length === 0;

  for (const image of imageDrafts) {
    const preview = document.createElement("div");
    preview.className = "image-preview";

    const thumbnail = document.createElement("img");
    thumbnail.src = image.dataUrl;
    thumbnail.alt = image.name;

    const removeButton = document.createElement("button");
    removeButton.className = "image-remove-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ${image.name}`);
    removeButton.addEventListener("click", () => removeImageDraft(image.id));

    preview.append(thumbnail, removeButton);
    imagePreviewList.append(preview);
  }
}

async function refreshSession() {
  try {
    const response = await fetch(`${getCervoBaseUrl()}/api/capture/session`, {
      credentials: "include",
    });
    const payload = await response.json();

    isAuthenticated = Boolean(payload.authenticated);
    setStatus(isAuthenticated ? getSignedInIdleStatus() : "Stored locally until Cervo is connected.");
  } catch {
    isAuthenticated = false;
    setStatus("Stored locally until Cervo is connected.");
  } finally {
    syncActionState();
  }
}

async function appendCapture() {
  if (!isAuthenticated) {
    await refreshSession();
  }

  if (!isAuthenticated) {
    setStatus("Stored locally until Cervo is connected.");
    captureArea.focus();
    return;
  }

  if (!hasCaptureDraft()) {
    return;
  }

  const snapshot = getCaptureSnapshot();

  clearCaptureDraft();
  setStatus("Appended.");
  captureArea.focus();
  queueAppendSnapshot(snapshot);
}

async function openCervo() {
  if (!isAuthenticated) {
    await refreshSession();
  }

  if (!isAuthenticated) {
    window.open(getSignInUrl(), "_blank", "noopener");
    captureArea.focus();
    return;
  }

  if (!hasCaptureDraft()) {
    window.open(getAppUrl(), "_blank", "noopener");
    captureArea.focus();
    return;
  }

  const snapshot = getCaptureSnapshot();

  clearCaptureDraft();
  setStatus("Opening Cervo...");
  captureArea.focus();

  try {
    await enqueueAppendSnapshot(snapshot);
    clearRecoverableAppend(snapshot);
    window.open(getAppUrl(), "_blank", "noopener");
  } catch (error) {
    handleAppendFailure(snapshot, error);
  } finally {
    syncActionState();
    captureArea.focus();
  }
}

captureArea.addEventListener("input", () => {
  saveLocalDraft();
  syncActionState();
  setStatus(isAuthenticated ? getSignedInIdleStatus() : "Stored locally until Cervo is connected.");
});

captureArea.addEventListener("paste", (event) => {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file) => file && file.type.startsWith("image/"));
  const text = event.clipboardData?.getData("text/plain");

  if (files.length > 0) {
    event.preventDefault();
    void addImageFiles(files);
  }

  if (text !== undefined) {
    event.preventDefault();
    insertPlainText(text);
  }
});

captureArea.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) {
    return;
  }

  event.preventDefault();
  if (!isAuthenticated) {
    setStatus("Stored locally until Cervo is connected.");
    captureArea.focus();
    return;
  }

  void appendCapture();
});

appendButton.addEventListener("click", () => {
  if (isAuthenticated) {
    void appendCapture();
    return;
  }

  window.open(getSignInUrl(), "_blank", "noopener");
  captureArea.focus();
});

imageFileButton.addEventListener("click", () => {
  imageFileInput.click();
  captureArea.focus();
});

imageFileInput.addEventListener("change", () => {
  void addImageFiles(Array.from(imageFileInput.files || []));
  imageFileInput.value = "";
});

openCervoButton.addEventListener("click", openCervo);

recoveryButton.addEventListener("click", () => {
  if (!recoverableAppend) {
    return;
  }

  const snapshot = recoverableAppend;

  setStatus("Retrying failed append...");
  queueAppendSnapshot(snapshot, { recoveryRetry: true });
});

window.addEventListener("DOMContentLoaded", () => {
  restoreLocalDraft();
  captureArea.focus();
  syncActionState();
  void refreshSession();
});
