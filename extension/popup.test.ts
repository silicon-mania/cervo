import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { describe, expect, it, vi } from "vitest";

type Listener = (event: TestEvent) => unknown;

class TestEvent {
  readonly type: string;
  readonly bubbles?: boolean;
  defaultPrevented = false;
  key?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  clipboardData?: {
    getData: (type: string) => string | undefined;
    items?: Array<{
      kind: string;
      getAsFile: () => TestFile | null;
    }>;
  };

  constructor(type: string, options: { bubbles?: boolean } = {}) {
    this.type = type;
    this.bubbles = options.bubbles;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class TestElement {
  disabled = false;
  hidden = false;
  textContent = "";
  value = "";
  selectionStart = 0;
  selectionEnd = 0;
  focused = false;
  className = "";
  type = "";
  src = "";
  alt = "";
  files: TestFile[] = [];
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }

  async dispatchEvent(typeOrEvent: string | TestEvent, event?: TestEvent) {
    const nextEvent =
      typeof typeOrEvent === "string" ? (event ?? new TestEvent(typeOrEvent)) : typeOrEvent;

    for (const listener of this.listeners.get(nextEvent.type) || []) {
      await listener(nextEvent);
    }

    return nextEvent;
  }

  focus() {
    this.focused = true;
  }

  click() {
    void this.dispatchEvent("click");
  }

  setRangeText(text: string, start: number, end: number) {
    this.value = `${this.value.slice(0, start)}${text}${this.value.slice(end)}`;
    this.selectionStart = start + text.length;
    this.selectionEnd = this.selectionStart;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  append(...elements: TestElement[]) {
    this.children.push(...elements);
  }

  replaceChildren(...elements: TestElement[]) {
    this.children.splice(0, this.children.length, ...elements);
  }
}

class TestFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly dataUrl: string;

  constructor({
    name,
    type,
    size = 12,
    dataUrl = `data:${type};base64,image-data`,
  }: {
    name: string;
    type: string;
    size?: number;
    dataUrl?: string;
  }) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.dataUrl = dataUrl;
  }
}

class TestFileReader {
  result: string | null = null;
  private readonly listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, [...(this.listeners.get(type) || []), listener]);
  }

  readAsDataURL(file: TestFile) {
    this.result = file.dataUrl;

    for (const listener of this.listeners.get("load") || []) {
      listener();
    }
  }
}

function createStorage(initialValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

function createPopup({
  authenticated,
  appendFetch = async () => ({ ok: true }),
  localDraft = "",
  localImages = [],
}: {
  authenticated: boolean;
  appendFetch?: (url: string, init?: RequestInit) => Promise<{ ok: boolean }>;
  localDraft?: string;
  localImages?: Array<Record<string, unknown>>;
}) {
  const captureArea = new TestElement();
  const appendButton = new TestElement();
  const imageFileButton = new TestElement();
  const imageFileInput = new TestElement();
  const imagePreviewList = new TestElement();
  const openCervoButton = new TestElement();
  const recoveryButton = new TestElement();
  const statusMessage = new TestElement();
  const storage = createStorage({
    cervoCaptureDraftText: localDraft,
    cervoCaptureDraftImages: JSON.stringify(localImages),
  });
  const windowListeners = new Map<string, Listener[]>();
  const open = vi.fn();
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/api/capture/session")) {
      return {
        json: async () => ({ authenticated }),
      };
    }

    return appendFetch(url, init);
  });
  const queryTargets = new Map<string, TestElement>([
    ["#capture-text", captureArea],
    ["#append-button", appendButton],
    ["#image-file-button", imageFileButton],
    ["#image-file-input", imageFileInput],
    ["#image-preview-list", imagePreviewList],
    ["#open-cervo-button", openCervoButton],
    ["#recovery-button", recoveryButton],
    ["#capture-status", statusMessage],
  ]);
  const script = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "popup.js"),
    "utf8",
  );
  const context = vm.createContext({
    crypto: { randomUUID: () => "capture-id" },
    atob,
    Blob,
    document: {
      createElement: () => new TestElement(),
      querySelector: (selector: string) => queryTargets.get(selector),
    },
    Error,
    Event: TestEvent,
    fetch,
    FileReader: TestFileReader,
    FormData,
    localStorage: storage,
    Uint8Array,
    window: {
      addEventListener: (type: string, listener: Listener) => {
        windowListeners.set(type, [...(windowListeners.get(type) || []), listener]);
      },
      open,
    },
  });

  vm.runInContext(script, context);

  return {
    appendButton,
    captureArea,
    fetch,
    imageFileButton,
    imageFileInput,
    imagePreviewList,
    open,
    openCervoButton,
    recoveryButton,
    statusMessage,
    storage,
    async load() {
      for (const listener of windowListeners.get("DOMContentLoaded") || []) {
        await listener(new TestEvent("DOMContentLoaded"));
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

async function waitForDraftWork() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe("extension popup local draft behavior", () => {
  it("restores and updates the latest local draft", async () => {
    const popup = createPopup({
      authenticated: false,
      localDraft: "Saved before close",
    });

    await popup.load();
    expect(popup.captureArea.value).toBe("Saved before close");
    expect(popup.appendButton.textContent).toBe("Sign in");
    expect(popup.appendButton.disabled).toBe(false);

    popup.captureArea.value = "Updated draft";
    await popup.captureArea.dispatchEvent("input");

    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("Updated draft");
    expect(popup.statusMessage.textContent).toBe("Stored locally until Cervo is connected.");
  });

  it("pastes plain text into the local draft without navigation", async () => {
    const popup = createPopup({ authenticated: false });

    await popup.load();
    const paste = new TestEvent("paste");
    paste.clipboardData = {
      getData: (type) => (type === "text/plain" ? "https://example.com\nTask" : undefined),
    };

    await popup.captureArea.dispatchEvent("paste", paste);

    expect(paste.defaultPrevented).toBe(true);
    expect(popup.captureArea.value).toBe("https://example.com\nTask");
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("https://example.com\nTask");
    expect(popup.open).not.toHaveBeenCalled();
  });

  it("does not submit or navigate from signed-out keyboard append", async () => {
    const popup = createPopup({ authenticated: false, localDraft: "Keep me local" });

    await popup.load();
    const keydown = new TestEvent("keydown");
    keydown.key = "Enter";
    keydown.metaKey = true;

    await popup.captureArea.dispatchEvent("keydown", keydown);

    expect(keydown.defaultPrevented).toBe(true);
    expect(popup.fetch).toHaveBeenCalledTimes(1);
    expect(popup.open).not.toHaveBeenCalled();
    expect(popup.captureArea.value).toBe("Keep me local");
  });

  it("keeps the local draft when sign-in or signed-out open cervo is selected", async () => {
    const popup = createPopup({ authenticated: false, localDraft: "Draft survives auth" });

    await popup.load();
    await popup.appendButton.dispatchEvent("click");
    await popup.openCervoButton.dispatchEvent("click");

    expect(popup.open).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/sign-in",
      "_blank",
      "noopener",
    );
    expect(popup.open).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/sign-in",
      "_blank",
      "noopener",
    );
    expect(popup.captureArea.value).toBe("Draft survives auth");
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("Draft survives auth");
  });

  it("preserves the local draft after the session becomes authenticated", async () => {
    const popup = createPopup({ authenticated: true, localDraft: "Append later" });

    await popup.load();

    expect(popup.captureArea.value).toBe("Append later");
    expect(popup.appendButton.textContent).toBe("Append");
    expect(popup.appendButton.disabled).toBe(false);
    expect(popup.fetch).toHaveBeenCalledTimes(1);
  });

  it("adds pasted clipboard images to the local draft", async () => {
    const image = new TestFile({ name: "clipboard.png", type: "image/png" });
    const popup = createPopup({ authenticated: false });

    await popup.load();
    const paste = new TestEvent("paste");
    paste.clipboardData = {
      getData: () => undefined,
      items: [{ kind: "file", getAsFile: () => image }],
    };

    await popup.captureArea.dispatchEvent("paste", paste);
    await waitForDraftWork();

    expect(paste.defaultPrevented).toBe(true);
    expect(JSON.parse(popup.storage.values.get("cervoCaptureDraftImages") || "[]")).toEqual([
      {
        dataUrl: "data:image/png;base64,image-data",
        id: "capture-id",
        name: "clipboard.png",
        size: 12,
        type: "image/png",
      },
    ]);
    expect(popup.imagePreviewList.children).toHaveLength(1);
    expect(popup.appendButton.disabled).toBe(false);
  });

  it("imports multiple local image files at once", async () => {
    const popup = createPopup({ authenticated: true });

    await popup.load();
    popup.imageFileInput.files = [
      new TestFile({ name: "first.jpg", type: "image/jpeg" }),
      new TestFile({ name: "second.webp", type: "image/webp" }),
    ];

    await popup.imageFileInput.dispatchEvent("change");
    await waitForDraftWork();

    const storedImages = JSON.parse(popup.storage.values.get("cervoCaptureDraftImages") || "[]");
    expect(storedImages).toMatchObject([
      { name: "first.jpg", type: "image/jpeg" },
      { name: "second.webp", type: "image/webp" },
    ]);
    expect(popup.imagePreviewList.children).toHaveLength(2);
    expect(popup.imageFileInput.value).toBe("");
  });

  it("sends image drafts as multipart append files and clears them on success", async () => {
    const popup = createPopup({
      authenticated: true,
      localDraft: "Caption",
      localImages: [
        {
          dataUrl: "data:image/png;base64,aW1hZ2UtZGF0YQ==",
          id: "stored-image",
          name: "stored.png",
          size: 10,
          type: "image/png",
        },
      ],
    });

    await popup.load();
    await popup.appendButton.dispatchEvent("click");
    await waitForDraftWork();

    const appendCall = popup.fetch.mock.calls[1] as [string, RequestInit?] | undefined;
    const appendInit = appendCall?.[1] as RequestInit | undefined;
    const body = appendInit?.body as FormData;

    expect(appendCall?.[0]).toBe("http://localhost:3000/api/capture/append");
    expect(body.get("captureId")).toBe("capture-id");
    expect(body.get("text")).toBe("Caption");
    expect(body.getAll("images")).toHaveLength(1);
    expect((body.getAll("images")[0] as File).name).toBe("stored.png");
    expect((body.getAll("images")[0] as File).type).toBe("image/png");
    expect(popup.captureArea.value).toBe("");
    expect(popup.imagePreviewList.children).toHaveLength(0);
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("");
    expect(JSON.parse(popup.storage.values.get("cervoCaptureDraftImages") || "[]")).toEqual([]);
    expect(popup.statusMessage.textContent).toBe("Appended.");
  });

  it("restores a failed optimistic append when the draft is still empty", async () => {
    const appendFetch = vi.fn(async () => ({ ok: false }));
    const popup = createPopup({
      authenticated: true,
      appendFetch,
      localDraft: "Restore me",
    });

    await popup.load();
    await popup.appendButton.dispatchEvent("click");

    expect(popup.captureArea.value).toBe("");
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("");
    expect(popup.statusMessage.textContent).toBe("Appended.");

    await waitForDraftWork();

    expect(appendFetch).toHaveBeenCalledTimes(1);
    expect(popup.captureArea.value).toBe("Restore me");
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("Restore me");
    expect(popup.statusMessage.textContent).toBe("Unable to append.");
    expect(popup.recoveryButton.hidden).toBe(true);
  });

  it("keeps an active newer draft and exposes deliberate retry after append failure", async () => {
    const firstAppend = createDeferred<{ ok: boolean }>();
    const secondAppend = createDeferred<{ ok: boolean }>();
    const appendBodies: FormData[] = [];
    let appendCount = 0;
    const appendFetch = vi.fn((_url: string, init?: RequestInit) => {
      appendBodies.push(init?.body as FormData);
      appendCount += 1;
      return appendCount === 1 ? firstAppend.promise : secondAppend.promise;
    });
    const popup = createPopup({
      authenticated: true,
      appendFetch,
      localDraft: "Failed snapshot",
    });

    await popup.load();
    await popup.appendButton.dispatchEvent("click");
    await waitForDraftWork();

    expect(popup.captureArea.value).toBe("");
    expect(popup.statusMessage.textContent).toBe("Appended.");

    popup.captureArea.value = "Newer draft";
    await popup.captureArea.dispatchEvent("input");

    firstAppend.resolve({ ok: false });
    await waitForDraftWork();

    expect(appendFetch).toHaveBeenCalledTimes(1);
    expect(popup.captureArea.value).toBe("Newer draft");
    expect(popup.storage.values.get("cervoCaptureDraftText")).toBe("Newer draft");
    expect(popup.statusMessage.textContent).toBe("Append failed. Retry when ready.");
    expect(popup.recoveryButton.hidden).toBe(false);

    await popup.recoveryButton.dispatchEvent("click");
    await waitForDraftWork();

    const retryBody = appendBodies[1];

    expect(appendFetch).toHaveBeenCalledTimes(2);
    expect(retryBody?.get("text")).toBe("Failed snapshot");
    expect(popup.captureArea.value).toBe("Newer draft");

    secondAppend.resolve({ ok: true });
    await waitForDraftWork();

    expect(popup.recoveryButton.hidden).toBe(true);
    expect(popup.statusMessage.textContent).toBe("Failed append retried.");
  });

  it("preserves rapid append order with the pending request chain", async () => {
    const firstAppend = createDeferred<{ ok: boolean }>();
    const secondAppend = createDeferred<{ ok: boolean }>();
    const appendTexts: string[] = [];
    const appendFetch = vi.fn((_url: string, init?: RequestInit) => {
      const body = init?.body as FormData;

      appendTexts.push(String(body.get("text")));

      return appendTexts.length === 1 ? firstAppend.promise : secondAppend.promise;
    });
    const popup = createPopup({
      authenticated: true,
      appendFetch,
      localDraft: "First",
    });

    await popup.load();
    await popup.appendButton.dispatchEvent("click");
    await waitForDraftWork();

    popup.captureArea.value = "Second";
    await popup.captureArea.dispatchEvent("input");
    await popup.appendButton.dispatchEvent("click");
    await waitForDraftWork();

    expect(appendTexts).toEqual(["First"]);

    firstAppend.resolve({ ok: true });
    await waitForDraftWork();

    expect(appendTexts).toEqual(["First", "Second"]);

    secondAppend.resolve({ ok: true });
    await waitForDraftWork();

    expect(popup.captureArea.value).toBe("");
    expect(popup.statusMessage.textContent).toBe("Appended.");
  });

  it("restores image drafts and removes thumbnails from local storage immediately", async () => {
    const popup = createPopup({
      authenticated: true,
      localImages: [
        {
          dataUrl: "data:image/gif;base64,image-data",
          id: "stored-image",
          name: "stored.gif",
          size: 20,
          type: "image/gif",
        },
      ],
    });

    await popup.load();
    expect(popup.imagePreviewList.children).toHaveLength(1);
    expect(popup.appendButton.disabled).toBe(false);

    const removeButton = popup.imagePreviewList.children[0]?.children[1];
    await removeButton?.dispatchEvent("click");

    expect(JSON.parse(popup.storage.values.get("cervoCaptureDraftImages") || "[]")).toEqual([]);
    expect(popup.imagePreviewList.children).toHaveLength(0);
    expect(popup.appendButton.disabled).toBe(true);
  });

  it("rejects unsupported and oversized local images", async () => {
    const popup = createPopup({ authenticated: false });

    await popup.load();
    popup.imageFileInput.files = [
      new TestFile({ name: "notes.txt", type: "text/plain" }),
      new TestFile({ name: "huge.png", type: "image/png", size: 6 * 1024 * 1024 }),
    ];

    await popup.imageFileInput.dispatchEvent("change");
    await waitForDraftWork();

    expect(JSON.parse(popup.storage.values.get("cervoCaptureDraftImages") || "[]")).toEqual([]);
    expect(popup.imagePreviewList.children).toHaveLength(0);
    expect(popup.statusMessage.textContent).toBe("That image is too large for a local draft.");
  });
});
