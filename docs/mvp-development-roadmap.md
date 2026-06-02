# MVP development roadmap

This document defines the implementation order for the Cervo MVP.

Use it to keep future development aligned with the product context, technical foundation, and design system. The goal is not to build every possible productivity feature; the goal is to reach the MVP demo described in `product-context.md`: open Cervo, land on today's note, capture information quickly, organize it into boxes and tasks, retrieve it through search, and use contextual AI to help structure the workspace.

## North star

The MVP should prove this core loop:

```txt
Sign in -> choose workspace -> open today -> write -> autosave -> organize -> retrieve -> ask AI
```

Everything that does not strengthen this loop should wait.

## Current foundation

Already implemented:

- Next.js App Router scaffold with TypeScript, Tailwind, shadcn/ui, and app shell.
- Clerk email OTP authentication.
- Clerk organization onboarding with invite-only workspace joining.
- Clerk `OrganizationProfile` embedded in Settings as the single organization management surface.
- Local `workspaces` and `workspace_members` mirror through server-side Clerk sync.
- Supabase Postgres + Drizzle schema and migrations.
- Direct OpenAI provider configuration through centralized server helpers.
- Connected UI testing documentation for Clerk test users.

Current principle:

- Clerk is the organization source of truth.
- Cervo keeps a local workspace mirror only for app data joins and workspace-scoped authorization.
- The left sidebar should stay minimal and product-focused.

## Phase 1: DB-backed daily note

Status: implemented.

Goal: opening the app should load or create the current workspace's daily note from the database.

Build:

- Add a server helper such as `getOrCreateTodayDocument()`.
- Use `requireWorkspace()` to resolve the active local workspace.
- Query `documents` by `workspaceId`, `type = daily_note`, and today's date.
- Create the daily note automatically when missing.
- Render real daily note metadata in `/today`.
- Keep the placeholder editor area until `DocumentEditor` lands.

Acceptance criteria:

- A signed-in user with an active organization reaches `/today`.
- The local workspace mirror exists.
- A daily note row exists for the active workspace and current date.
- Reloading `/today` returns the same document, not a duplicate.

## Phase 2: Shared TipTap `DocumentEditor`

Status: implemented.

Goal: every editable document uses one shared editor foundation.

Build:

- Create `src/components/editor/DocumentEditor`.
- Centralize TipTap extensions and editor commands.
- Support basic text editing, placeholder, links, bold, italic, task list, and checkboxes.
- Ensure Cmd+B and Cmd+I work.
- Expose both `content_json` and `content_text` from the editor.
- Use the same editor API for daily notes and future box home documents.

Acceptance criteria:

- `/today` renders the daily note through `DocumentEditor`.
- The editor can produce JSON content and plain text content.
- No feature creates a second TipTap setup.

## Phase 3: Autosave

Status: implemented.

Goal: the daily note should persist without a manual save flow.

Build:

- Add an autosave endpoint or server action for documents.
- Debounce saves between 800 and 1200 ms.
- Persist `content_json`, `content_text`, and `updated_by`.
- Show subtle `saving`, `saved`, and `error` states without exposing timestamps or technical metadata.
- Do not show a saving animation while the user is still inside the debounce window and no network save has started yet.
- Use a tiny inline loader while saving.
- Use a small low-opacity check icon when all changes are saved.
- Keep autosave status near the daily note title rather than as a separate metadata row under the title.
- Show an error state only when saving fails.
- Avoid toast notifications for normal autosave status.
- Do not add a primary manual save button.
- Flush pending editor content with a best-effort page-hide/unload save so abrupt tab closes do not depend only on the debounce timer.

Acceptance criteria:

- Typing in `/today` saves automatically.
- Refreshing the page preserves the note content.
- Normal saved state does not show `updated_at`, "last saved", workspace, timezone, or document id text.
- Failed saves are visible without disrupting writing.

## Phase 4: Boxes

Status: after daily note persistence.

Goal: prove the project box mental model.

Build:

- Add box creation.
- Create a `box_home` document automatically for each box.
- List active boxes in the app shell or a dedicated boxes view without cluttering the sidebar.
- Add `/boxes/[boxId]`.
- Render the box home document with the shared `DocumentEditor`.
- Support box statuses: `active`, `future`, `archived`.

Acceptance criteria:

- A user can create a box.
- Opening a box shows its home document.
- Box documents use the same editor and autosave path as daily notes.

## Phase 5: Slash commands and selection actions

Status: after the shared editor is stable.

Goal: make capture feel fast and product-specific.

Build:

- Add slash commands for tasks and checkboxes.
- Add a compact selection menu.
- Support turning selected text into a task.
- Support sending or copying selected text to a box.
- Keep AI selection actions as a later addition if the data model is not ready.

Acceptance criteria:

- `/` can create a task-like item or checkbox quickly.
- Selecting text opens contextual actions.
- Selection actions reuse shared server mutation paths.

## Phase 6: Tasks

Status: after editor actions.

Goal: tasks become first-class app data, not just editor formatting.

Build:

- Create tasks from slash commands or selected text.
- Link tasks to `source_document_id`.
- Optionally link tasks to `box_id`.
- Render `/tasks` with workspace-scoped data.
- Keep the task model simple: `todo` and `done`.

Acceptance criteria:

- A task created from a document appears in `/tasks`.
- Tasks preserve their source document context.
- Workspace isolation is enforced server-side.

## Phase 7: DB-backed mock panels

Status: after core note/box/task data works.

Goal: prove Cervo can enrich the daily note with operational context without real integrations.

Build:

- Seed mock `events`, `inbox_items`, and `people`.
- Render Calendar, Inbox, and People context panels from the DB.
- Keep panels secondary to the central editor.
- Avoid production Gmail, Google Calendar, or CRM integrations in the MVP.

Acceptance criteria:

- `/today` shows DB-backed mock calendar and inbox context.
- People/CRM data is available where the demo needs it.
- Mock data is workspace-scoped.

## Phase 8: Global search

Status: after documents and core entities have meaningful content.

Goal: make company memory retrievable.

Build:

- Add a Postgres search function.
- Search `documents.content_text`, boxes, tasks, people, and inbox items.
- Keep search server-side.
- Avoid external search engines for the MVP.

Acceptance criteria:

- The user can search from the app shell.
- Results are grouped enough to understand what was found.
- Search returns relevant daily notes, boxes, tasks, people, and inbox items.

## Phase 9: Contextual AI assistant

Status: after enough real context exists.

Goal: AI helps organize and act on workspace context without replacing the editor.

Build:

- Add assistant route handlers using direct OpenAI through `src/server/ai`.
- Use environment-driven model names.
- Provide explicit context: current document, selected text, active box, tasks, and intent.
- Support summarizing a note, extracting tasks, and suggesting organization into boxes.
- Return typed action proposals before mutating data.

Acceptance criteria:

- The assistant can summarize current context.
- It can propose extracted tasks or organization actions.
- Data mutations still go through explicit server-side actions.

## Phase 10: Demo hardening

Status: final MVP pass.

Goal: make the demo coherent, fast, and robust.

Build:

- Add Clerk webhooks if out-of-session organization changes matter for the demo.
- Add focused connected UI verification for the MVP flows.
- Add tests only if explicitly requested.
- Fix empty, loading, error, and mobile/responsive states for demo-critical screens.
- Remove dead code and duplicate patterns.
- Keep docs updated when decisions change.

Acceptance criteria:

- The MVP demo flow works end to end with a connected test user.
- No duplicated organization management UI exists.
- The app feels like a daily note-centered company memory, not a generic SaaS dashboard.

## Immediate implementation sprint

The next sprint should focus on:

1. `getOrCreateTodayDocument()`.
2. `/today` backed by the real daily note row.
3. First shared `DocumentEditor`.
4. Autosave for the daily note.
5. Connected UI verification using `docs/connected-ui-testing.md`.

This is the shortest path from scaffold to product core.

## Deferred until explicitly needed

- Real-time collaboration.
- Public sharing.
- Complex custom permissions.
- Production Gmail or Google Calendar integrations.
- External search engine.
- Native desktop or mobile app.
- Autonomous background agents.
