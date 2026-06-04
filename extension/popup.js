const DEFAULT_CERVO_BASE_URL = "http://localhost:3000";
const LOCAL_DRAFT_TEXT_KEY = "cervoCaptureDraftText";

const captureArea = document.querySelector("#capture-text");
const appendButton = document.querySelector("#append-button");
const openCervoButton = document.querySelector("#open-cervo-button");
const statusMessage = document.querySelector("#capture-status");

let isAppending = false;
let isAuthenticated = false;

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

function saveLocalDraft() {
  localStorage.setItem(LOCAL_DRAFT_TEXT_KEY, captureArea.value);
}

function restoreLocalDraft() {
  captureArea.value = localStorage.getItem(LOCAL_DRAFT_TEXT_KEY) || "";
}

function syncActionState() {
  appendButton.textContent = isAuthenticated ? "Append" : "Sign in";
  appendButton.disabled = isAppending || (isAuthenticated && !hasTextDraft());
}

function insertPlainText(text) {
  const start = captureArea.selectionStart;
  const end = captureArea.selectionEnd;

  captureArea.setRangeText(text, start, end, "end");
  captureArea.dispatchEvent(new Event("input", { bubbles: true }));
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

  if (!hasTextDraft()) {
    return;
  }

  const snapshot = captureArea.value.trimEnd();
  const formData = new FormData();

  formData.set("captureId", crypto.randomUUID());
  formData.set("text", snapshot);

  isAppending = true;
  captureArea.value = "";
  saveLocalDraft();
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
    captureArea.value = snapshot;
    saveLocalDraft();
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
  const text = event.clipboardData?.getData("text/plain");

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

openCervoButton.addEventListener("click", openCervo);

window.addEventListener("DOMContentLoaded", () => {
  restoreLocalDraft();
  captureArea.focus();
  syncActionState();
  void refreshSession();
});
