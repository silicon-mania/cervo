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
const statusMessage = document.querySelector("#capture-status");

let isAppending = false;
let isAuthenticated = false;
let imageDrafts = [];

function getCervoBaseUrl() {
  const configuredUrl = localStorage.getItem("cervoBaseUrl");

  return (configuredUrl || DEFAULT_CERVO_BASE_URL).replace(/\/$/, "");
}

function setStatus(message) {
  statusMessage.textContent = message;
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
  appendButton.disabled = isAppending || (isAuthenticated && !hasCaptureDraft());
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
  setStatus(isAuthenticated ? "" : "Stored locally until Cervo is connected.");
}

function removeImageDraft(imageId) {
  imageDrafts = imageDrafts.filter((image) => image.id !== imageId);
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
  setStatus(isAuthenticated ? "" : "Stored locally until Cervo is connected.");
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
    setStatus(isAuthenticated ? "" : "Stored locally until Cervo is connected.");
  } catch {
    isAuthenticated = false;
    setStatus("Stored locally until Cervo is connected.");
  } finally {
    syncActionState();
  }
}

async function appendCapture() {
  if (isAppending) {
    return;
  }

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

  const textSnapshot = captureArea.value.trimEnd();
  const imageSnapshot = [...imageDrafts];
  const formData = new FormData();

  formData.set("captureId", crypto.randomUUID());
  formData.set("text", textSnapshot);

  for (const image of imageSnapshot) {
    formData.append("images", dataUrlToBlob(image.dataUrl, image.type), image.name);
  }

  isAppending = true;
  captureArea.value = "";
  imageDrafts = [];
  saveLocalDraft();
  renderImageDrafts();
  syncActionState();
  setStatus("Appending...");

  try {
    const response = await fetch(`${getCervoBaseUrl()}/api/capture/append`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Unable to append.");
    }

    setStatus("Appended.");
  } catch (error) {
    captureArea.value = textSnapshot;
    imageDrafts = imageSnapshot;
    saveLocalDraft();
    renderImageDrafts();
    setStatus(error instanceof Error ? error.message : "Unable to append.");
  } finally {
    isAppending = false;
    syncActionState();
    captureArea.focus();
  }
}

function openCervo() {
  window.open(isAuthenticated ? getAppUrl() : getSignInUrl(), "_blank", "noopener");
}

captureArea.addEventListener("input", () => {
  saveLocalDraft();
  syncActionState();
  setStatus(isAuthenticated ? "" : "Stored locally until Cervo is connected.");
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

window.addEventListener("DOMContentLoaded", () => {
  restoreLocalDraft();
  captureArea.focus();
  syncActionState();
  void refreshSession();
});
