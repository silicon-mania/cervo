# Chrome Extension Publication Guide

This guide starts after the Chrome Web Store developer account has been created and the registration fee has been paid. It assumes the production Cervo app is deployed at:

```txt
https://cervo-app-domain.com
```

## 1. Prepare the Cervo App

Before packaging the extension, verify that production Cervo is ready.

1. Confirm `https://cervo-app-domain.com` is deployed and reachable.
2. Confirm sign-in works in production.
3. Confirm daily notes work in production.
4. Confirm capture append works in production.
5. Confirm image upload and Supabase storage work in production.
6. Publish a privacy policy page, for example:

```txt
https://cervo-app-domain.com/privacy
```

Cervo Capture handles user-provided text and images, so the Chrome Web Store listing needs an accurate privacy policy URL.

## 2. Build the Production Extension

From the repository root, run:

```bash
CERVO_EXTENSION_BASE_URL=https://cervo-app-domain.com npm run build:extension
```

This creates:

```txt
dist/extension/
```

Verify the generated files:

```bash
cat dist/extension/manifest.json
cat dist/extension/config.js
```

The generated manifest should include:

```json
"host_permissions": ["https://cervo-app-domain.com/*"]
```

The generated config should include:

```js
baseUrl: "https://cervo-app-domain.com"
```

## 3. Test the Production Build Locally

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select:

```txt
dist/extension
```

6. Test signed-out behavior.
7. Sign in to Cervo production.
8. Test text append.
9. Test image-only append.
10. Test mixed text and image append.
11. Test Open Cervo.
12. Test popup close and reopen draft persistence.
13. Test failed append recovery if practical.

If the extension still sees the user as signed out after signing in to `https://cervo-app-domain.com`, stop and fix production auth, cookie, or session behavior before submitting to the Chrome Web Store.

## 4. Add Store-Ready Assets

Prepare the Chrome Web Store listing assets before upload:

- Extension icon
- Store screenshots
- Short description
- Full description
- Category
- Privacy policy URL
- Support or contact URL if available
- Optional homepage URL

The extension should include icons before public release. Add files such as:

```txt
extension/icons/icon-16.png
extension/icons/icon-48.png
extension/icons/icon-128.png
```

Then add them to `extension/manifest.json`:

```json
"icons": {
  "16": "icons/icon-16.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png"
}
```

Rebuild the extension after adding icons.

## 5. Zip the Extension Correctly

The Chrome Web Store ZIP must contain `manifest.json` at the root. Do not zip a parent folder that contains `extension/` inside it.

Run:

```bash
cd dist/extension
zip -r ../cervo-capture-0.1.0.zip .
```

The ZIP will be:

```txt
dist/cervo-capture-0.1.0.zip
```

Sanity check the archive:

```bash
unzip -l ../cervo-capture-0.1.0.zip | head
```

The output should show files like:

```txt
manifest.json
popup.html
popup.js
popup.css
config.js
```

## 6. Create the Chrome Web Store Item

1. Open the Chrome Developer Dashboard.
2. Click `Add new item`.
3. Upload:

```txt
dist/cervo-capture-0.1.0.zip
```

4. Wait for Chrome to validate the ZIP and manifest.
5. Continue once the item draft has been created.

## 7. Fill the Store Listing

Use a clear and literal listing.

Name:

```txt
Cervo Capture
```

Short description:

```txt
Capture text and images into today's Cervo daily note.
```

Full description:

```txt
Cervo Capture is a companion extension for Cervo. It opens a small popup where signed-in users can quickly capture text and images into today's daily note.

The extension does not read the current tab, inject scripts into pages, add context menus, or capture browsing activity. It only sends the draft you explicitly type, paste, or attach to your Cervo workspace.
```

That final paragraph matters because the extension intentionally avoids broad browser access.

## 8. Fill the Privacy Tab

Use an accurate single-purpose description:

```txt
Cervo Capture lets users explicitly save text and image drafts from the extension popup into their Cervo daily note.
```

Declare data handling honestly:

- It collects user-provided text.
- It collects user-provided images.
- It sends those captures to the user's Cervo account.
- It uses authentication and session state from Cervo.
- It does not collect browsing history.
- It does not inspect current tabs.
- It does not use the `clipboard-read` permission.
- It does not sell user data.

Set the privacy policy URL:

```txt
https://cervo-app-domain.com/privacy
```

## 9. Fill Distribution

For the first release, prefer a limited release path before going fully public.

Reasonable first-release options:

- Unlisted
- Trusted testers or limited test distribution, if available
- Deferred or manual publish after review, if available

This lets the extension pass review and then be installed from the real Chrome Web Store before a broader public launch.

## 10. Add Reviewer Test Instructions

If the app requires authentication, give the reviewer a clear path. Provide a test account if possible.

Example reviewer notes:

```txt
This extension is a companion popup for Cervo.

Testing steps:
1. Install the extension.
2. Open https://cervo-app-domain.com and sign in with the provided test account.
3. Click the extension icon.
4. Type text into the popup and click Append.
5. Open the Cervo daily note and confirm the capture was appended.

The extension does not read tabs, inject content scripts, use context menus, or request clipboard-read permission.
```

If no test account is provided, explain how the reviewer can create one.

## 11. Submit for Review

Click `Submit for Review`.

For the first release, prefer deferred or manual publish if the dashboard offers it. This lets review complete before the item becomes available more broadly.

If the submission is rejected:

1. Read the rejection reason carefully.
2. Fix the extension package, listing, privacy answer, or production app issue.
3. Bump the manifest `version` if required.
4. Rebuild the extension.
5. Re-zip the extension.
6. Resubmit.

## 12. Verify After Approval

After approval, install the extension from the actual Chrome Web Store listing.

Verify:

1. The store-installed extension opens.
2. Production sign-in works.
3. The popup detects the authenticated session.
4. Text append works.
5. Image-only append works.
6. Mixed text and image append works.
7. Open Cervo works.
8. Local draft persistence still works.
9. The Chrome extension permissions shown to the user are still minimal.

Only after this pass should the extension be treated as production-ready.

## Issue 008 Go-Live Checklist

Issue `008-end-to-end-capture-qa-pass.md` should be completed against the production extension bundle and, ideally, again against the Chrome Web Store installed version once approved.

Do not mark issue 008 done until the real production extension flow works end to end.
