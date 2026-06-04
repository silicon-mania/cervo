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
  clipboardData?: { getData: (type: string) => string | undefined };

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
  textContent = "";
  value = "";
  selectionStart = 0;
  selectionEnd = 0;
  focused = false;
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

  setRangeText(text: string, start: number, end: number) {
    this.value = `${this.value.slice(0, start)}${text}${this.value.slice(end)}`;
    this.selectionStart = start + text.length;
    this.selectionEnd = this.selectionStart;
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
  localDraft = "",
}: {
  authenticated: boolean;
  localDraft?: string;
}) {
  const captureArea = new TestElement();
  const appendButton = new TestElement();
  const openCervoButton = new TestElement();
  const statusMessage = new TestElement();
  const storage = createStorage({
    cervoCaptureDraftText: localDraft,
  });
  const windowListeners = new Map<string, Listener[]>();
  const open = vi.fn();
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/api/capture/session")) {
      return {
        json: async () => ({ authenticated }),
      };
    }

    return { ok: true };
  });
  const queryTargets = new Map<string, TestElement>([
    ["#capture-text", captureArea],
    ["#append-button", appendButton],
    ["#open-cervo-button", openCervoButton],
    ["#capture-status", statusMessage],
  ]);
  const script = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "popup.js"),
    "utf8",
  );
  const context = vm.createContext({
    crypto: { randomUUID: () => "capture-id" },
    document: {
      querySelector: (selector: string) => queryTargets.get(selector),
    },
    Error,
    Event: TestEvent,
    fetch,
    FormData,
    localStorage: storage,
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
    open,
    openCervoButton,
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
});
