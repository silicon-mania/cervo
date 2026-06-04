# PRD: Browser Extension Instant Capture Area

GitHub issue: https://github.com/silicon-mania/cervo/issues/1

## Problem Statement

Cervo users need a way to capture thoughts, text, URLs, and images without interrupting their browser workflow. Today, the main app already centers on the Current Daily Note, but a user who is reading, browsing, or working elsewhere still has to switch context before they can dump what is in their mind. That friction weakens Cervo's core promise: fast Capture into the daily note and later retrieval through the workspace.

The user needs an extremely simple Chrome-compatible extension popup that opens instantly, lets them write or paste immediately, supports image attachments, and completes the Capture into the Current Daily Note with minimal visible process.

## Solution

Build a v1 browser extension for Chrome-compatible browsers that exposes a minimalist popup Capture Area. The user can type plain text, paste plain text, paste images, import one or more local images, and enter URLs as plain text. The Capture Draft is persisted locally while the user writes, whether authenticated or signed out.

When authenticated, the user can click Append or use Cmd+Enter/Ctrl+Enter to complete the Capture. Append clears the Capture Area optimistically, keeps the popup open, shows a short success message such as "Appended to your mind", and lets the user immediately start another Capture. A dedicated server Append endpoint creates the Current Daily Note if needed, appends text to the end of the note content, and stores images as note-owned Attachments. Images are not inserted into the note content in v1.

When signed out, the popup still allows local drafting, but the primary action becomes Sign in. After authentication, the Capture Draft remains local and the user explicitly clicks Append or Open Cervo. Open Cervo is always available as a secondary action; when authenticated and a Capture Draft exists, it uses the same Append endpoint before opening the main app at /.

## User Stories

1. As a Cervo user, I want to open the extension popup instantly, so that I can capture a thought without leaving my browser flow.
2. As a Cervo user, I want the Capture Area focused on open, so that I can start typing without another click.
3. As a Cervo user, I want to type simple text into the Capture Area, so that I can quickly dump what is in my mind.
4. As a Cervo user, I want pasted text to become plain text, so that copied material does not bring unwanted formatting into my daily note.
5. As a Cervo user, I want pasted URLs to stay as plain text, so that I can capture links without special link editing.
6. As a Cervo user, I want line breaks in my Capture Draft to be preserved, so that my captured thought keeps the structure I typed.
7. As a Cervo user, I want clipboard HTML and scripts normalized away, so that pasted content is safe and simple.
8. As a Cervo user, I want to paste an image from the clipboard, so that screenshots can be captured quickly.
9. As a Cervo user, I want to import local images, so that I can attach images from my computer to the Current Daily Note.
10. As a Cervo user, I want to import multiple local images at once, so that I can attach a batch without repeating the same action.
11. As a Cervo user, I want selected images to appear as small thumbnails, so that I can see what will be attached.
12. As a Cervo user, I want thumbnails to stack from left to right at the bottom-left of the Capture Area, so that images stay visible without dominating the popup.
13. As a Cervo user, I want to remove an image thumbnail with a hover cross, so that I can quickly correct a Capture Draft.
14. As a Cervo user, I want image removal to require no confirmation, so that the popup remains fast and minimal.
15. As a Cervo user, I want removed images deleted from local draft storage immediately, so that removed material does not come back later.
16. As a Cervo user, I want image uploads to accept common image types, so that normal screenshots and image files work.
17. As a Cervo user, I want obviously huge image files rejected with a small inline message, so that the extension does not become slow or expensive.
18. As a Cervo user, I do not want compression, cropping, or resizing workflows in the popup, so that Capture remains simple.
19. As a Cervo user, I want images stored as Attachments owned by the Current Daily Note, so that image Capture is preserved without complicating the note content.
20. As a Cervo user, I want image-only Capture Drafts to be valid, so that screenshots can be captured without text.
21. As a Cervo user, I want image-only appends to avoid placeholder text, so that the daily note content does not get artificial messages.
22. As a Cervo user, I want Append disabled only when the Capture Draft has no text and no images, so that invalid actions are quiet.
23. As a Cervo user, I want Append to feel instant, so that the extension does not interrupt my flow.
24. As a Cervo user, I want the Capture Area cleared immediately after Append, so that I can start the next Capture right away.
25. As a Cervo user, I want the popup to stay open after Append, so that I can capture several thoughts in a row.
26. As a Cervo user, I want focus ready after Append, so that I can continue typing without another click.
27. As a Cervo user, I want a short optimistic success message, so that I get lightweight feedback without waiting on the server.
28. As a Cervo user, I want failed Appends to restore my Capture Draft when possible, so that I do not lose material.
29. As a Cervo user, I want failure feedback to be minimal and inline, so that errors do not overwhelm the popup.
30. As a Cervo user, I want no automatic retry loop, so that duplicate appends are not created silently.
31. As a Cervo user, I want to retry deliberately after a failure, so that I stay in control.
32. As a Cervo user, I want to keep typing a new Capture while an earlier Append runs in the background, so that capture speed is not blocked.
33. As a Cervo user, I want failed background appends to avoid overwriting my active draft, so that a failure does not destroy what I am currently writing.
34. As a Cervo user, I want multiple rapid Appends to preserve click order when practical, so that the Current Daily Note follows my capture sequence.
35. As a Cervo user, I want Cmd+Enter or Ctrl+Enter to trigger Append when authenticated, so that keyboard capture is fast.
36. As a Cervo user, I want Enter to insert a line break, so that normal note writing works.
37. As a signed-out user, I want keyboard submission not to trigger sign-in or navigation, so that the shortcut does not surprise me.
38. As a signed-out user, I want to type and add images locally, so that I can capture in a hurry before authenticating.
39. As a signed-out user, I want a Sign in primary action instead of Append, so that the required next step is clear.
40. As a signed-out user, I want reassuring copy that my draft is stored locally until I connect Cervo, so that I trust the flow.
41. As a signed-out user, I want my local Capture Draft preserved after sign-in, so that I can decide when to Append.
42. As a signed-out user, I do not want automatic append after sign-in, so that authentication does not unexpectedly write content.
43. As a Cervo user, I want only the latest Capture Draft stored locally, so that the extension stays simple.
44. As a Cervo user, I want local draft persistence even when authenticated, so that accidental popup close does not lose my current Capture.
45. As a Cervo user, I want no draft history, so that the extension does not become a draft manager.
46. As a Cervo user, I want no dedicated clear-draft control in v1, so that the popup stays visually minimal.
47. As a Cervo user, I want to clear text manually and remove images manually, so that I still have basic control over the Capture Draft.
48. As a Cervo user, I want the extension to use my active Cervo workspace, so that captured material goes to the same place as the main app.
49. As a Cervo user, I do not want a workspace picker in v1, so that Capture stays fast.
50. As a Cervo user, I do not want the popup to show account or workspace names unless necessary, so that visual noise stays low.
51. As a Cervo user, I want Append to create the Current Daily Note if needed, so that Capture works even before I open Cervo that day.
52. As a Cervo user, I want Append to preserve the title of an existing daily note, so that the extension cannot accidentally rename notes.
53. As a Cervo user, I want the extension to use existing daily-note title logic when creating a note, so that new daily notes match the app.
54. As a Cervo user, I want no note title editing in the extension, so that it remains pure Capture.
55. As a Cervo user, I want Capture to target only the Current Daily Note, so that I never need to choose a destination.
56. As a Cervo user, I want no note picker, box picker, or target selection in v1, so that the popup stays tiny.
57. As a Cervo user, I want tasks and checkboxes treated as plain text in the extension, so that no task workflow is pulled into the popup.
58. As a Cervo user, I want no AI actions or automatic organization in the extension, so that it remains pure Capture.
59. As a Cervo user, I want no settings page in v1, so that behavior is fixed and simple.
60. As a Cervo user, I want no character count, attachment count, or draft metadata, so that the popup remains visually quiet.
61. As a Cervo user, I want minimal branding only, so that the Capture Area is the visual priority.
62. As a Cervo user, I want Open Cervo always available, so that I can jump to the main app whenever needed.
63. As an authenticated Cervo user, I want Open Cervo to open /, so that I land on the main app with the Current Daily Note in the editor.
64. As an authenticated Cervo user with a Capture Draft, I want Open Cervo to complete the Capture before opening /, so that the draft is visible as normal daily-note content.
65. As a signed-out user, I want Open Cervo to open sign-in or onboarding and keep my draft local, so that authentication does not lose my material.
66. As a Cervo user, I want Open Cervo to use the same Append endpoint as the Append button, so that there is only one write path.
67. As a Cervo user, I want Open Cervo failures to restore the local draft for later retry, so that failed navigation capture does not lose material.
68. As a Cervo user, I want the extension not to capture the current tab URL automatically, so that it does not require surprising permissions.
69. As a Cervo user, I want URLs captured only when I type or paste them, so that Capture remains explicit.
70. As a Cervo user, I want no browser context menu in v1, so that there is only one entry point.
71. As a Cervo user, I want no side panel in v1, so that the extension stays focused on an instant popup.
72. As a developer, I want the extension to target Chrome-compatible browsers first, so that platform work stays focused.
73. As a developer, I want load-unpacked Chromium testing first, so that we can prove the Capture flow before store packaging.
74. As a developer, I want a build-time Cervo base URL, so that local builds can point at localhost and production builds can point at the deployed app.
75. As a developer, I want the extension in a separate app or folder inside this repo, so that it stays close to Cervo contracts without mixing into main app routes.
76. As a developer, I want the popup UI standalone but visually aligned with Cervo, so that the extension is lightweight and still feels native to the product.
77. As a developer, I want a dedicated Append endpoint, so that extension captures merge server-side instead of replacing whole note content.
78. As a developer, I want the Append endpoint to accept multipart form data, so that text and image files can be submitted in one v1 request.
79. As a developer, I want the server to derive workspace from the active Cervo session, so that the extension never supplies a trusted workspace id.
80. As a developer, I want server-side image storage helpers, so that the extension does not upload directly to Supabase.
81. As a developer, I want the Append endpoint to return minimal status and ids, so that the popup is not coupled to editor state.
82. As a developer, I want a client-generated capture id in the request contract, so that lightweight duplicate protection is possible later.
83. As a developer, I want durable server dedupe deferred until testing proves it needed, so that v1 does not become over-engineered.
84. As a developer, I want the main app's polished attachment browsing UI deferred, so that extension attachment creation can be implemented first.

## Implementation Decisions

- Use the project language: Capture, Capture Draft, Capture Area, Append, Current Daily Note, and Attachment.
- The extension is a Chrome-compatible, load-unpacked-first browser extension for v1. Firefox, Safari, Chrome Web Store packaging, and production distribution are deferred.
- The extension lives in this repository as a separate extension app or folder, not mixed into the Next.js app route/component tree.
- The extension popup UI is standalone while reusing Cervo design tokens and visual language where practical.
- The extension base URL is configured at build time or through environment, not through a user-facing settings screen.
- The popup is the only v1 browser extension entry point. No side panel, browser context menu, automatic current-tab capture, or settings/options page.
- The Capture Area accepts plain text input, pasted plain text, user-entered or pasted URLs as plain text, pasted images, and local image imports including multiple images.
- Pasted text is normalized to plain text. Clipboard HTML or scripts are not rendered or stored as HTML.
- Tasks, checkboxes, URLs, and any structured-looking text are treated as plain text in the extension.
- The Capture Draft persists locally as the user types or adds images, regardless of auth state. Only the latest local draft is retained.
- There is no dedicated clear-draft control and no draft history. Users clear text manually and remove images through thumbnails.
- Selected images appear as thumbnails at the bottom-left of the Capture Area, stacking left to right. Hover exposes a remove control with no confirmation.
- Image thumbnails are local Capture Draft data until Append succeeds. Removing a thumbnail removes the image from local extension storage immediately.
- Apply basic image guardrails only: accept common image types, reject obviously huge files with small inline feedback, and avoid compression/cropping/resizing workflows.
- When authenticated, the primary action is Append. When signed out, the primary action is Sign in.
- Append is disabled only when the Capture Draft contains no text and no images. Image-only drafts are valid.
- Append is optimistic: clear the Capture Area immediately, show a short success message, keep the popup open, and allow immediate new Capture.
- Append requests continue in the background. On failure, restore the failed draft if the Capture Area is empty, or expose a small recovery option if the user is already typing.
- No automatic retry loop. The user retries deliberately after recovery.
- Multiple Appends may be in flight. Each Append sends a snapshot of that draft. Preserve click order with the simplest reliable approach; do not add heavyweight queueing.
- Cmd+Enter on macOS and Ctrl+Enter on Windows/Linux trigger Append only when authenticated. Enter inserts a line break.
- The extension uses the active Cervo web session and active workspace. It does not ask the user to choose a workspace.
- The first version does not show account or workspace name unless it becomes necessary for trust.
- The dedicated Append endpoint receives multipart form data containing capture id, text, and image files.
- The Append endpoint derives the workspace from the active Cervo session. It does not trust client-provided workspace ids.
- The Append endpoint creates the Current Daily Note if needed, using existing daily-note title logic. It does not rename existing notes.
- Text appends to the end of the Current Daily Note. If existing content is present, insert one separator line break before appended text. If the note is empty, no leading separator is needed.
- In document JSON, appended plain text is converted into simple paragraph nodes matching user line breaks, preserving blank lines as empty paragraphs or equivalent spacing. In searchable text, preserve plain text line breaks.
- Images are stored as note-owned Attachments. They are not inserted into the note content and do not have a position relative to text in v1.
- Image-only Appends create or update the Current Daily Note so Attachments have an owner, but add no placeholder text.
- Image files are uploaded server-side through Cervo storage helpers backed by Supabase Storage. The extension does not upload directly to Supabase.
- Attachment rows use document ownership for the daily note and include file metadata plus storage path.
- The Append endpoint returns minimal status and ids, such as daily note id plus attachment ids or count. It does not return the full daily note.
- Each Append request includes a client-generated capture id. Durable server-side dedupe is deferred unless duplicate appends appear during testing.
- Open Cervo is a secondary action that is never disabled. If authenticated and a Capture Draft exists, it uses the same Append endpoint before opening /. If signed out, it opens sign-in/onboarding and keeps the draft local.
- Open Cervo with a Capture Draft uses the same optimistic local clear/restore model as Append, but the web app does not need special error UI in v1.
- Keep browser permissions minimal: local extension storage, Cervo app/API access, and auth/session integration only if needed. Avoid tab, activeTab, context menu, broad host, and clipboard-read permissions unless implementation genuinely requires them.
- The polished UI for browsing a note's image Attachments is a later task. The extension may create Attachments before that UI exists.
- Preserve current Cervo app behavior, but do not carry legacy compatibility for non-existent users if it complicates development.

## Testing Decisions

- Test external behavior rather than implementation details. The most important seam is the dedicated server Append endpoint, because it owns workspace derivation, daily-note creation, text merge behavior, and Attachment creation.
- Add automated tests for creating today's Current Daily Note when Append is called and no persisted daily note exists.
- Add automated tests for appending text to an existing daily note while preserving line breaks and adding the correct separator.
- Add automated tests for converting plain text into simple document paragraph JSON while preserving searchable text.
- Add automated tests for image-only Captures creating daily-note Attachments without adding placeholder text.
- Add automated tests for mixed text/image Captures appending text and storing images as Attachments without depending on relative ordering.
- Add automated tests that auth and active workspace are required.
- Add automated tests proving workspace is derived from the server-side active session, not client input.
- Add automated tests around multipart request validation, basic image type/size rejection, and minimal success response shape.
- Add lightweight testing around capture id handling in the request contract, but defer durable dedupe tests until server dedupe exists.
- Prefer existing route handler test patterns already used for API behavior in this codebase.
- Storage should be tested through the highest practical server-side helper seam. Avoid making tests depend on real Supabase Storage where a storage helper fake can verify behavior.
- Popup UI tests should remain light. Add implementation-level tests only if the chosen extension setup makes them cheap.
- Manually verify the load-unpacked Chromium popup flow for focus-on-open, local draft persistence, image thumbnails/removal, optimistic Append, signed-out drafting, Open Cervo behavior, and minimal permissions.

## Out of Scope

- Rich text capture, bold, italic, labeled links, or source formatting preservation.
- Inline image nodes in the note content.
- A polished image browsing/gallery UI in the main app.
- Drag-and-drop capture.
- Automatic current-tab URL capture.
- Browser side panel.
- Browser context menu actions.
- Target selection, note picker, or box picker.
- Workspace/account switching inside the popup.
- Extension settings/options page.
- Character counts, attachment counts, draft metadata, or heavy branding/header UI.
- AI actions, automatic organization, task extraction, slash commands, and task-specific parsing.
- Automatic retry loops or heavyweight queueing systems.
- Durable server-side capture id deduplication unless testing proves duplicate appends are a real problem.
- Firefox and Safari support.
- Chrome Web Store packaging and production extension distribution.
- Direct-to-Supabase uploads from the extension.
- User-facing image compression, cropping, or resizing workflows.
- Updating any note title from the extension.
- Supporting any target other than the Current Daily Note.

## Further Notes

- The core product feeling is "dump now, keep moving." The extension should favor an instant happy path and small recovery from rare failures.
- "Open Cervo" is not pure navigation when the user is authenticated and a Capture Draft exists; it is a secondary completion path that uses the same Append endpoint before opening the main app.
- The Current Daily Note is resolved using Cervo's app timezone and the same date logic as the main app.
- The extension can create note Attachments before the main app has a polished browsing surface for those images.
- No ADR was created for the multipart Append endpoint or same-repo extension folder because those decisions are documented and not yet hard enough to reverse.
