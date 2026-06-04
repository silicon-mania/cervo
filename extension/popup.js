const DEFAULT_CERVO_BASE_URL = "http://localhost:3000";

const captureArea = document.querySelector("#capture-text");
const appendButton = document.querySelector("#append-button");
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

function hasTextDraft() {
  return captureArea.value.trimEnd().length > 0;
}

function syncAppendState() {
  appendButton.disabled = isAppending || !hasTextDraft();
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
    setStatus(isAuthenticated ? "" : "Sign in to Cervo before appending.");
  } catch {
    isAuthenticated = false;
    setStatus("Connect to Cervo before appending.");
  }
}

async function appendCapture() {
  if (isAppending || !hasTextDraft()) {
    return;
  }

  if (!isAuthenticated) {
    await refreshSession();
  }

  if (!isAuthenticated) {
    setStatus("Sign in to Cervo before appending.");
    captureArea.focus();
    return;
  }

  const snapshot = captureArea.value.trimEnd();
  const formData = new FormData();

  formData.set("captureId", crypto.randomUUID());
  formData.set("text", snapshot);

  isAppending = true;
  captureArea.value = "";
  syncAppendState();
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
    setStatus(error instanceof Error ? error.message : "Unable to append.");
  } finally {
    isAppending = false;
    syncAppendState();
    captureArea.focus();
  }
}

captureArea.addEventListener("input", () => {
  syncAppendState();
  setStatus("");
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
  void appendCapture();
});

appendButton.addEventListener("click", () => {
  void appendCapture();
});

window.addEventListener("DOMContentLoaded", () => {
  captureArea.focus();
  syncAppendState();
  void refreshSession();
});
