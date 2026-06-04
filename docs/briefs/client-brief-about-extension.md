# Browser Extension for Cervo

## Overview

Build a browser extension that enables users to quickly capture information and append it directly to their daily note in Cervo with minimal friction.

The primary goal is speed. Users should be able to capture thoughts, text, screenshots, images, links, and other content in just a few seconds without interrupting their workflow.

The first version should target Chrome-compatible browsers first, including Chrome, Arc, Brave, Edge, and other Chromium browsers if they work naturally. Firefox and Safari are out of scope for v1.

Development and testing should start with a load-unpacked Chromium extension. Chrome Web Store packaging and distribution are deferred until the capture flow works end to end.

The extension should live in this repository as a separate extension app or folder. Keep it close to Cervo's API contracts and documentation, but avoid mixing extension code into the Next.js app routes and components.

The extension UI should reuse Cervo design tokens and visual language where practical, but remain standalone. Browser-extension popup constraints are different from the main app, and the popup should not import heavy app UI or shell code unless it is clearly worth it.

The extension should support a build-time or environment-configured Cervo base URL so local development can point at `localhost` and production builds can point at the deployed app. This should not be exposed as a user-facing setting in v1.

## Authentication

The browser extension must be directly linked to the user's authenticated Cervo account.

If the user is already logged into Cervo, the extension should automatically recognize and use the same account without requiring a separate login flow.

All captured content must be saved to the active workspace from the user's existing Cervo web session and to that workspace's current daily note. The extension should not ask the user to choose a workspace in the first version.

The first version should not show the current account or workspace name unless it becomes technically necessary for user trust. The popup should silently use the active Cervo session and stay minimalist.

If there is no authenticated session or no active workspace, the extension should send the user to Cervo to sign in or finish onboarding.

When the user is not authenticated, the capture area should still open and allow a local-only capture draft. In this state, the primary action should be a sign-in button instead of Append. The screen should reassure the user that their draft is stored locally until they connect a Cervo account.

After authentication, the extension should preserve the local capture draft and show the Append action. It should not automatically append the draft after sign-in.

The extension should persist only the latest capture draft locally as the user types or adds images, whether the user is authenticated or signed out. Local draft persistence should protect against accidental popup close, browser focus changes, and auth/session issues. The draft should remain local until the user appends it successfully, clears the content manually, removes selected images, or clears/uninstalls the extension storage. The first version should not keep a draft history.

The first version should not add a dedicated clear-draft control. The popup should stay minimalist; users can clear text manually and remove images from their thumbnails.

Append should feel instant. When the user clicks Append, the extension should immediately clear the capture area, show a short success message such as "Appended to your mind", and allow the user to start a new capture right away without showing a loading state.

The popup should stay open after Append, keep focus ready for the next capture, and should not close automatically.

Append should be disabled when the capture draft is completely empty, meaning it contains no text and no images. Image-only capture drafts are valid and should allow Append. The secondary Open Cervo action should never be disabled.

The extension should support keyboard submission: `Cmd+Enter` on macOS and `Ctrl+Enter` on Windows/Linux should trigger Append only when the user is authenticated. Plain `Enter` should insert a line break. Keyboard submission should not trigger sign-in or navigation when the user is signed out.

The append request should continue in the background. If the request succeeds, the optimistic clear is final. If the request fails, the extension should restore the failed capture draft into the capture area so the user can retry.

The user should be able to create and append a new capture draft while a previous append request is still running. Each Append action should send a snapshot of the draft that existed at the moment the user clicked Append. If a background append fails, the extension should restore that failed draft only when the capture area is empty; if the user has already started a new draft, the extension should offer a small retry or recovery option instead of overwriting the active draft.

The first version should not run an automatic retry loop for failed background appends. After a failed draft is restored or exposed through recovery, the user can retry deliberately.

Append failures should use minimal inline feedback only. If a failed draft is restored into an empty capture area, show a small message such as "Couldn't append. Try again." If the user has already started a new draft, show the small recovery option with similar copy. Do not show modals, blocking alerts, or detailed technical errors.

When several capture drafts are appended quickly, the daily note should preserve the user's Append click order. This is an edge case and should be handled with the simplest reliable ordering approach, not a heavyweight queueing system.

The extension should use a dedicated append endpoint that receives the capture draft and appends it server-side to the current daily note. The extension should not read the full daily note, modify it locally, and save the whole note back through the autosave endpoint.

The append endpoint should accept multipart form data in the first version, with text plus image files in one request. The server should create the current daily note if needed, store image files as daily-note attachments, and append text to the daily note content. Avoid extra upload orchestration unless file-size constraints force it.

Image files should be stored through the planned Supabase Storage direction behind a server-side storage helper. The append endpoint should upload images server-side, then create attachment rows with `source_type = document`, `source_id` set to the daily note id, file metadata, and storage path. The extension should not upload directly to Supabase.

The append endpoint should return minimal status only, not the full daily note. A successful response should include enough information for confirmation, such as the daily note id, attachment ids or count, and success status.

Each Append action should include a client-generated capture id in the request contract. Durable server-side deduplication can be deferred unless duplicate appends appear during testing. This should stay lightweight and should not become a full queueing system.

The append endpoint should update both `content_json` and `content_text` for the daily note. Text and URLs should be represented in both fields. Images should be stored as note-owned attachments and should not be inserted into the note content in the first version.

Appended text should preserve user-entered line breaks. The append endpoint should insert one separator line break between existing daily-note content and appended text when the daily note already has content. If the daily note is empty, no leading separator is needed.

In `content_json`, appended plain text should be converted into simple TipTap paragraph nodes matching the user's line breaks, preserving blank lines as empty paragraphs or equivalent spacing. In `content_text`, preserve the plain text line breaks.

If a capture draft contains both text and images, the relative position of images versus text does not matter in the first version. Text is appended to the daily note content; images are stored as daily-note attachments.

Image-only capture drafts should create or update the current daily note so attachments have an owner, but they should not add placeholder text to the note content.

## User Experience

### Fast Access

- Clicking the extension icon should instantly open a lightweight popup capture window.
- The first version should use a browser-extension popup only, not a side panel or browser context menu.
- The capture area should receive focus automatically on open.
- The user should be able to start typing immediately without any additional interaction.
- Pasting or importing images should not steal focus permanently; after adding images, the user should be able to keep typing immediately.

### Content Capture

The extension should support:

- Plain text input
- Text pasted from the clipboard, normalized to plain text
- Image paste directly from the clipboard
- Local image import, including multiple images at once
- URL capture as user-entered or pasted plain text

The extension should not automatically capture the current browser tab URL in the first version.

Tasks and checkboxes are plain text in the extension's first version. The extension should not include task extraction, slash commands, or task-specific parsing.

Pasted text should not preserve source formatting in the first version. URLs remain plain text.

Clipboard HTML or script content should not be rendered or stored as HTML. Through plain-text normalization, it should become harmless text or be ignored depending on the available clipboard data.

The extension is pure capture in the first version. It should not include AI actions or automatic organization.

The first version should not include a settings page or options surface. It should not offer configurable targets, shortcut settings, or image options.

The popup should not show character counts, attachment counts, or draft metadata. The visible image thumbnails are enough to show selected images.

Branding should be minimal in v1. A small Cervo wordmark or icon is acceptable when the right asset is provided, but the capture area should be the visual priority and the popup should avoid a heavy header.

Drag-and-drop capture is not part of the first version.

Selected images should appear as small thumbnails at the bottom-left of the capture area. Thumbnails should stack from left to right like a simple carousel strip. On hover, each thumbnail should expose a small remove control; clicking it removes the image from the capture draft immediately with no confirmation.

Until Append succeeds, selected images are only part of the local capture draft. Removing an image thumbnail should remove that image from the draft and local extension storage immediately. After Append succeeds, images become Cervo attachments owned by the daily note.

The first version should apply basic image guardrails only. It should accept common image types such as PNG, JPG/JPEG, WebP, and GIF if easy. It should reject obviously huge files with a small inline message. It should not add compression, cropping, or resizing workflows in the extension UI.

The capture experience should be frictionless and optimized for speed.

### Daily Note Integration

All submitted content should be appended to the user's current daily note in Cervo.

The extension should behave as an "Append to Daily Note" tool rather than a full note editor.

The first version should append only to the current daily note. It should not include a note picker, box picker, or any target selection.

Append should create the current daily note if it does not already exist. If the capture draft includes images, the daily note must be created before storing the image attachments.

Append should not change the title of an existing daily note. If Append creates the daily note, it should use the existing daily-note title logic. The extension should not support updating any note title in the first version.

When the capture draft contains images, each image should be stored as an attachment owned by the daily note. Images should not be positioned inside the note content in the first version; the UI for browsing a note's images will be designed later.

The extension may create daily-note attachments before the main app has a polished attachment browsing UI. For the first implementation, attachment rows and stored files can be verified directly; browsing images in the note UI is a separate later task.

### Quick Navigation

The extension should always show a small secondary "Open Cervo" action. If the user is authenticated, it should open the main app at `/`. If the user is not authenticated, it should open sign-in or onboarding. This action should stay secondary to Append or Sign in and should not replace the capture flow as the primary action.

If the user has a capture draft when they click Open Cervo, that draft should be visible at the end of the current daily note when the main app opens. In this case, Open Cervo also completes the capture instead of only navigating.

When Open Cervo completes a capture, it should use the same dedicated append endpoint as the Append button before opening `/`. The captured content should be added as normal daily-note content, with no special visual treatment after redirect.

Open Cervo should use a simple optimistic flow when a capture draft exists. If the user is authenticated, it should send the append request, open `/`, and clear the local draft optimistically. If the append request fails, the extension should restore the draft in local storage so it is available the next time the extension opens. The web app does not need to show a special error for this failure in the first version.

If the user is not authenticated and clicks Open Cervo with a local capture draft, the extension should open sign-in or onboarding and keep the draft local. It should not pass the draft into the web app during sign-in. After authentication, the user should explicitly Append or Open Cervo again.

## Design Principles

- Extremely fast and lightweight
- Minimal user interaction required
- Optimized for rapid knowledge capture
- Reliable synchronization with the user's Cervo account
- Consistent with the Cervo user experience
- Minimal browser permissions. The first version should require no permissions, or only the smallest set needed for local draft storage, Cervo app/API access, and authentication/session integration. Avoid tab, activeTab, context menu, broad host, and clipboard-read permissions unless the implementation genuinely requires them.

## Verification

The server append endpoint should be covered with automated tests for creating today's daily note, appending text with preserved line breaks, creating attachments for image-only captures, enforcing auth/workspace access, and deriving workspace from the active Cervo session rather than client input.

Popup UI tests should stay light. Add implementation-level tests only if the chosen extension setup makes them cheap; otherwise verify the popup manually for v1.

## V1 Success Criteria

- The user opens the popup and can type immediately.
- The user can append text to the current daily note in one click or with the keyboard shortcut.
- The user can paste or import images and attach them to the current daily note.
- A signed-out user can still create a local capture draft.
- Open Cervo can complete a capture draft when the user is signed in.
- The first version avoids target selection, settings, AI, drag-and-drop, and rich text.
