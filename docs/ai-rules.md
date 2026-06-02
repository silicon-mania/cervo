# AI coding rules

This file is mandatory context for any AI agent working on this project.

Before coding, read:

- `docs/product-context.md`.
- `docs/technical-foundation.md`.
- `docs/design-system.md`.
- `docs/mvp-development-roadmap.md`.
- `docs/connected-ui-testing.md` when testing authenticated UI flows.

The product is an Obsidian-like company second brain. The MVP must prove fast capture, daily note, boxes, search, and contextual AI. Do not optimize for a generic SaaS dashboard.

## Non-negotiable product rules

- The daily note is the default product surface.
- The main app page is `/`; the left rail main/home icon must point to `/`, not `/today`.
- Product UI copy must stay in English.
- The editor is the center of the app.
- Side panels must support the note, not replace it.
- The app must feel closer to Obsidian than Notion.
- Follow the implementation order in `docs/mvp-development-roadmap.md` unless the developer explicitly changes priorities.
- Do not build a landing page unless explicitly requested.
- Do not add collaboration, sharing, desktop, mobile, queues, or complex permissions unless explicitly requested.

## Stack rules

- Use Next.js App Router.
- Use TypeScript only.
- Use Clerk for auth and organizations.
- Use Clerk email OTP as the MVP authentication method.
- The app requires an active organization/workspace before access.
- Use Supabase Postgres with Drizzle for server-side DB access.
- Do not use browser-side Supabase DB access in the MVP.
- Use TipTap for editing.
- Use Tailwind CSS and shadcn/ui where useful.
- Use Sonner for toast notifications when toast feedback is needed.
- Use Zustand only for local UI state.
- Use TanStack Query only when a client surface needs async cache/refetch/optimistic behavior.
- Use Vercel AI SDK for AI route handlers with direct OpenAI access.
- Do not introduce NestJS, GraphQL, Redis, React Native, Expo, Electron, Tauri, Meilisearch, Algolia, or Elasticsearch without explicit approval.

## Architecture rules

- Follow the folder architecture from `docs/technical-foundation.md`.
- Feature code belongs in `src/features/<feature-name>`.
- Shared product UI belongs in `src/components/primitives`.
- shadcn-generated components belong only in `src/components/ui`.
- App shell components belong in `src/components/layout`.
- TipTap editor components and extensions belong in `src/components/editor`.
- A feature may import another feature only through that feature's `index.ts`.
- If two features need the same logic, move it to `src/lib`, `src/hooks`, `src/server`, or `src/components/primitives`.

## Component rules

- Do not recreate buttons, inputs, dialogs, sheets, dropdowns, badges, separators, tooltips, or toasts when shadcn/ui, Sonner, or primitives already cover the need.
- Do not create a custom toast system; use Sonner.
- Do not create one-off visual variants inside feature components.
- Do not create cards inside cards.
- Do not use custom SVG icons when lucide-react has the icon.
- Keep component APIs small and explicit.
- Split components when a file mixes layout, data loading, and interaction in a way that becomes hard to scan.
- Prefer composition over configuration-heavy components.

## Editor rules

- There must be one shared `DocumentEditor`.
- Every editable document uses `DocumentEditor`.
- Do not create a second TipTap setup for another feature.
- TipTap extensions must be registered centrally.
- Every saved document must persist both `content_json` and `content_text`.
- `content_text` is used for search and AI context.
- Autosave is mandatory; do not add manual save as the primary flow.
- Autosave should debounce between 800 and 1200 ms and expose `saving`, `saved`, and `error` states.
- Keyboard shortcuts such as Cmd+B and Cmd+I must work.
- Slash commands are required early for tasks and checkboxes.
- Text selection must support contextual actions such as turning selected text into a task.
- Creating a new note from selected text and attaching that note to boxes is deferred until the note/box relationship UX is intentionally designed.
- Documents and boxes have a many-to-many relationship through a relationship table; do not duplicate a document when linking it to a box.
- The default catch-all box is labeled `Unsorted`, appears first on the main page, cannot be renamed or deleted, and can be modeled as a virtual/system view.
- The main page box list shows top-level boxes only; child boxes appear through a same-page drill-down state inside the boxes section on `/`.
- Opening a box must not navigate away from `/` during the MVP interaction.
- Linked notes inside boxes are not clickable until active-document state is intentionally designed.

## Data and server rules

- All DB access goes through `src/server/db`.
- Do not trust `workspaceId` from the client.
- Derive the active workspace from Clerk server auth.
- If no organization exists after signup, onboarding must ask the user to create a workspace.
- Joining an existing workspace happens only through an invitation.
- Never expose a public searchable or browsable list of organizations.
- Users may belong to multiple Clerk organizations.
- Server code must sync the active Clerk organization to the local `workspaces` mirror before workspace-scoped data access.
- Do not build custom organization management forms while Clerk prebuilt components cover the need.
- Organization profile, members, invitations, roles, rename, and delete should be managed through Clerk UI for the MVP.
- The Settings page can embed Clerk `OrganizationProfile`, but it must not duplicate Clerk organization management logic.
- Use Clerk's built-in organization roles and permissions for MVP organization management.
- Add or update Clerk webhooks before depending on organization changes that may happen outside the active user flow.
- Server mutations must validate input with schemas.
- Route Handlers are used for AI, uploads, webhooks, and integrations.
- Server Actions are only for small internal mutations when they are simpler than a route.
- Database, storage, and SDK clients must be initialized lazily through getter functions.
- Do not initialize external clients at module scope.

## AI feature rules

- AI is contextual help around the note or box, not the main interface.
- Do not put prompts directly inside React components.
- AI prompts, model calls, and schemas live in `src/server/ai`.
- AI endpoints must receive explicit context: current document, selected text, active box, relevant tasks, and user intent.
- AI should return typed actions when it changes app data.
- Do not let AI mutate the database without an explicit server-side action path.
- Do not add autonomous background agents in the MVP.
- OpenAI direct is the approved MVP provider path.
- Provider access must be centralized in `src/server/ai`, not scattered across features or components.
- Do not hardcode OpenAI model names inside features or React components.
- Use centralized model config from environment variables, including `OPENAI_MODEL_ASSISTANT` and `OPENAI_MODEL_STRUCTURED`.
- Do not switch to Vercel AI Gateway, Anthropic, Gemini, or any other provider path unless explicitly requested by the developer.
- If a provider switch looks useful, explain why and ask for approval before editing code.

## Styling rules

- Use design tokens from Tailwind/shadcn.
- Do not scatter hard-coded colors through feature files.
- Do not introduce gradients, decorative blobs, or marketing backgrounds.
- Keep the interface light-first, calm, and productive.
- Use small radii by default.
- Every interactive surface should have hover, focus, disabled, loading, and error states when relevant.
- Text must not overflow buttons, panels, or cards.

## Testing rules

- The baseline stack is Vitest for logic and Playwright for critical flows.
- Do not add or implement tests unless explicitly requested.
- When tests are requested, keep them focused on critical MVP behavior rather than broad snapshot coverage.
- For manual/browser UI verification that requires a signed-in user, follow `docs/connected-ui-testing.md`.
- Use Clerk deterministic test users only in local development or approved staging environments.
- Do not ask the developer for an OTP when using Clerk test identifiers; use the documented test OTP.
- Do not use real user credentials for AI-driven testing.

## Dependency rules

- Do not add a dependency before checking whether existing stack primitives can solve the problem.
- If a dependency is added, document why it is needed.
- Avoid dependencies that duplicate TipTap, shadcn/Radix, Drizzle, Clerk, Supabase, or AI SDK responsibilities.
- Do not use obscure install workarounds to force a package manager through errors.
- If pnpm creates repeated installation friction, stop and ask whether to switch the project to npm.
- Do not mix pnpm and npm lockfiles.

## Before finishing a task

- Verify TypeScript when possible.
- Verify lint/build when possible.
- For UI changes, run the app and inspect the affected screen when possible.
- Report anything that could not be verified.
