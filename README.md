# Cervo

An Obsidian-like company second brain for fast capture, project boxes, global search,
and contextual AI.

Read the project documentation before coding:

1. [Product context](docs/product-context.md)
2. [Technical foundation](docs/technical-foundation.md)
3. [Design system](docs/design-system.md)
4. [AI coding rules](docs/ai-rules.md)

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser Extension

The Chrome-compatible capture extension lives in [extension](extension) as a
standalone load-unpacked target, separate from the Next.js route tree.

For local verification, run the app at `http://localhost:3000`, then load the
`extension/` folder from `chrome://extensions` with developer mode enabled. The
checked-in `extension/config.js` points the popup at localhost, and the manifest
only grants host access to that local Cervo origin.

For a deployable extension bundle, set the target Cervo origin at build time:

```bash
CERVO_EXTENSION_BASE_URL=https://cervo.app npm run build:extension
```

Load or package `dist/extension/`. The build rewrites `config.js` and the
manifest host permission to match `CERVO_EXTENSION_BASE_URL`. The extension does
not request tabs, activeTab, context menus, clipboard-read, side panel, or
options/settings permissions.
