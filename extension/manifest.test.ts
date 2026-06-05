import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const extensionDir = dirname(fileURLToPath(import.meta.url));

function readExtensionFile(fileName: string) {
  return readFileSync(join(extensionDir, fileName), "utf8");
}

describe("extension manifest shape", () => {
  it("stays Chrome load-unpacked compatible with a standalone popup", () => {
    const manifest = JSON.parse(readExtensionFile("manifest.json")) as {
      action?: { default_popup?: string };
      manifest_version?: number;
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.action?.default_popup).toBe("popup.html");
    expect(readExtensionFile("popup.html")).toContain('<script src="config.js"></script>');
  });

  it("limits permissions to the local Cervo target in source builds", () => {
    const manifest = JSON.parse(readExtensionFile("manifest.json")) as {
      host_permissions?: string[];
      permissions?: string[];
    };
    const disallowedPermissions = [
      "activeTab",
      "clipboardRead",
      "contextMenus",
      "sidePanel",
      "tabs",
    ];

    expect(manifest.host_permissions).toEqual(["http://localhost:3000/*"]);
    expect(manifest.permissions || []).not.toEqual(expect.arrayContaining(disallowedPermissions));
  });

  it("uses build-time config for the Cervo base URL", () => {
    const context = vm.createContext({
      Object,
      window: {},
    });

    vm.runInContext(readExtensionFile("config.js"), context);

    expect(context.window).toEqual({
      CERVO_CAPTURE_CONFIG: {
        baseUrl: "http://localhost:3000",
      },
    });
  });
});
