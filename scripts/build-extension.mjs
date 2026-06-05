import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const DEFAULT_CERVO_BASE_URL = "http://localhost:3000";
const sourceDir = new URL("../extension/", import.meta.url);
const outputDir = new URL("../dist/extension/", import.meta.url);

function normalizeBaseUrl(value) {
  const url = new URL(value || DEFAULT_CERVO_BASE_URL);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("CERVO_EXTENSION_BASE_URL must use http or https.");
  }

  return url.href.replace(/\/$/, "");
}

function hostPermissionForBaseUrl(baseUrl) {
  return `${new URL(baseUrl).origin}/*`;
}

async function buildExtension() {
  const baseUrl = normalizeBaseUrl(process.env.CERVO_EXTENSION_BASE_URL);
  const manifestUrl = new URL("manifest.json", outputDir);
  const configUrl = new URL("config.js", outputDir);

  await mkdir(outputDir, { recursive: true });
  await cp(sourceDir, outputDir, { recursive: true });

  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  manifest.host_permissions = [hostPermissionForBaseUrl(baseUrl)];

  await writeFile(manifestUrl, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    configUrl,
    `window.CERVO_CAPTURE_CONFIG = Object.freeze(${JSON.stringify({ baseUrl }, null, 2)});\n`,
  );

  console.log(`Built Cervo Capture extension for ${baseUrl} at dist/extension`);
}

await buildExtension();
