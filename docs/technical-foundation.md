# Technical foundation

This document is the technical base for creating the MVP and guiding future development.

Project context: see `product-context.md`.

The product direction is an Obsidian-like company second brain: daily note first, project boxes, fast capture, global search, and contextual AI. The MVP must optimize for a magical demo, not for complete enterprise coverage.

## Product constraints that drive the tech

- The app must open on `/`, the main page. That page shows today's daily note by default plus the top-level boxes.
- Capture must be immediate: type, paste, drag, drop, save.
- The editor must feel closer to Obsidian than Notion.
- The central note must never be replaced by secondary panels.
- Boxes are the main project model: each box is both a page and a folder.
- Notes and boxes have a many-to-many relationship; linking a note to a box must not duplicate the note.
- The default box is named `Unsorted` in the UI and is a visible catch-all/untriaged view, not necessarily a normal user-managed `boxes` row.
- Boxes may contain child boxes, so box navigation should support a familiar folder/path model inside the main page `/`.
- Product UI copy must stay in English.
- Search must work across daily notes, boxes, tasks, people, inbox items, and later files.
- AI is an assistant around the workspace, not the main capture interface.
- Auth is not part of the core demo value proposition, but workspace/company access is required from day one.
- The codebase must stay simple enough for AI coding agents to extend without creating parallel patterns.

## Confirmed stack

```txt
Next.js App Router
TypeScript
pnpm
Clerk Auth + Organizations
Clerk email OTP authentication
Supabase Postgres
Supabase Storage
Drizzle ORM
dotenv for local Drizzle env loading
TipTap Simple Editor
Tailwind CSS
shadcn/ui when useful
Geist Sans and Geist Mono
Sonner for toast notifications when needed
Zustand
TanStack Query when useful
Vercel AI SDK
Postgres full-text search + pg_trgm
Vercel deployment
```

## Confirmed implementation decisions

- Project name: cervo.
- Git-tracked app path: `/Users/hugobayoud/prog/silicon-mania/cervo`.
- Package manager: pnpm.
- Repository structure: simple repository with `src/`, not a monorepo for the MVP.
- shadcn base color: zinc.
- Typography: Geist Sans for interface text and Geist Mono for metadata/code-like UI.
- Authentication method: email address with OTP code sent by email.
- Workspace requirement: users must have an organization/workspace before accessing the app.
- Onboarding: after signup, the user either accepts an invitation to an existing workspace or creates a new workspace.
- Workspace discovery: workspaces are invite-only; users must never browse a public list of organizations.
- Multi-workspace support: users may belong to multiple Clerk organizations and switch between them.
- Organization management UI: use Clerk prebuilt components as the single management surface for organizations, members, invitations, roles, rename, and delete.
- Cervo must not implement custom organization management UI while Clerk covers the need.
- Sidebar rule: keep the left sidebar minimal; do not place duplicate organization management controls there.
- MVP invitation and role rules: rely on Clerk's built-in organization roles and permissions.
- Database access: Drizzle + server-only Postgres connection.
- Supabase RLS strategy for MVP: no browser-side DB access; authorization lives in the Next.js server layer using Clerk `orgId`.
- Initial theme: light-first, subtle off-white/gray background, discreet panels.
- Daily note date key: resolve "today" on the server with `CERVO_APP_TIME_ZONE`, defaulting to `America/Los_Angeles` for the San Francisco-focused MVP. Do not use the deployment server timezone or browser-provided workspace ids for Phase 1. A future user/workspace timezone preference can replace this centralized default.
- Autosave: mandatory TipTap debounce between 800 and 1200 ms with `saving`, `saved`, and `error` status. No manual save as the primary flow.
- Search: no dedicated search table on day one; start with a SQL function over Postgres full-text search.
- Calendar, inbox, and people/CRM are mocked in the database for the MVP.
- Tests: Vitest for logic and Playwright for 2-3 critical flows, but tests are implemented only when explicitly requested.
- TipTap MVP: basic shortcuts such as Cmd+B and Cmd+I, slash commands from the start, quick task/checkbox creation, and a selection menu for actions like transforming selected text into a task. Creating a new note from selected text and attaching it to boxes is deferred until that UX is intentionally designed.
- AI provider path: OpenAI direct for the MVP. The implementation must stay centralized and easy to replace later, but switching to another provider path such as Vercel AI Gateway requires explicit human approval.
- OpenAI model names must not be hardcoded inside features. Use centralized environment variables such as `OPENAI_MODEL_ASSISTANT` and `OPENAI_MODEL_STRUCTURED`.

## Stack decisions and justification

### Next.js App Router

Decision: use Next.js App Router as the full-stack app framework.

Why:

- Strong fit for React and TypeScript.
- Server Components are useful for layout and initial data loading.
- Route Handlers cover AI streaming, uploads, webhooks, and future integrations.
- Server Actions can cover simple in-app mutations where they stay ergonomic.
- Deployment on Vercel is the lowest-friction path for the demo.

Tradeoff:

- App Router patterns can become messy if every feature invents its own data flow.
- We must define strict server/client boundaries early.

Rule:

- Keep data access server-side by default.
- Use Route Handlers for APIs, streaming, uploads, webhooks, and AI.
- Use Server Actions only for small internal mutations.
- Push `"use client"` as low as possible in the component tree.

### Package manager

Decision: start with pnpm.

Why:

- Fast installs.
- Strict dependency resolution.
- Good long-term fit if the repo later becomes a monorepo.

Tradeoff:

- pnpm can be stricter around dependency build scripts and postinstall approval.
- That strictness is useful, but it should not slow MVP development with repeated installation friction.

Rule:

- Do not use obscure workarounds to force package installation.
- Use documented package-manager flows only.
- If pnpm repeatedly blocks normal dependency installation or wastes development time, switch the project to npm after explicit developer approval.
- Do not mix package managers in the repo.

### Clerk Auth + Organizations

Decision: use Clerk for email OTP authentication and organizations.

Why:

- Workspace/company logic will arrive quickly.
- Auth does not create demo value, so it should not consume build time.
- Clerk integrates cleanly with Next.js.
- Organization membership and switching are solved product areas.
- Email OTP keeps login simple and avoids password UX for the MVP.

Tradeoff:

- Data authorization must bridge Clerk orgs and Supabase/Postgres.
- We should not rely on client-provided workspace ids.
- Workspace onboarding adds a little setup friction, but keeps the product aligned with company use from day one.

Rule:

- The active workspace is derived from Clerk `orgId`.
- Server code must call a helper such as `requireWorkspace()`.
- The client never decides which workspace a mutation belongs to.
- Users cannot access the app until an organization/workspace exists.
- If a user signs up without joining an organization, onboarding must ask them to create a workspace.
- Joining an existing workspace happens only through a Clerk organization invitation.
- Do not expose a searchable or browsable list of organizations.
- Users may belong to multiple organizations; the active Clerk organization defines the current app workspace.
- Organization management actions must go through Clerk prebuilt UI or Clerk webhooks/server sync paths, not custom Cervo forms.
- The Settings page may host other settings later, but organization management inside it should be rendered with Clerk `OrganizationProfile`.
- Cervo keeps only a local mirror for app joins and workspace-scoped data.

### Supabase Postgres

Decision: use Supabase Postgres as the primary database.

Why:

- Postgres is enough for documents, tasks, boxes, people, events, inbox, and search.
- Supabase gives hosted Postgres, storage, migrations, and useful extensions.
- It keeps the architecture lighter than adding a custom backend early.

Tradeoff:

- If using Clerk rather than Supabase Auth, RLS is less straightforward.
- For MVP speed, server-only access can be simpler than browser Supabase clients.

Rule:

- MVP data access should go through server code using a database connection and Drizzle.
- RLS can be added later or used carefully once the Clerk/Supabase auth bridge is explicit.

### Drizzle ORM

Decision: use Drizzle for schema and queries.

Why:

- TypeScript-first.
- Keeps SQL close and understandable.
- Good fit for migrations and Postgres.
- Less magic than heavier ORMs.

Tradeoff:

- We still need to write clean query modules and avoid leaking DB details everywhere.

Rule:

- Put schema in `src/server/db/schema`.
- Put shared query helpers in feature-level `server/queries.ts`.
- Put mutations in feature-level `server/mutations.ts`.

### TipTap Simple Editor

Decision: use TipTap, starting from the Simple Editor idea.

Why:

- The editor is core to the product.
- TipTap is flexible enough for Obsidian-like writing with custom extensions.
- We can support tasks, mentions, slash commands, links, paste handling, and future custom nodes.
- It avoids the Notion-like block-product direction that BlockNote suggests.

Tradeoff:

- More implementation responsibility than BlockNote.
- We must centralize editor extensions and commands to avoid duplicated editor logic.

Rule:

- There is one shared `DocumentEditor`.
- Every editable document uses the same editor base.
- Extensions are registered in one place.
- Save both `content_json` and `content_text`.

### Tailwind CSS + shadcn/ui

Decision: use Tailwind for styling and shadcn/ui when a primitive is useful.

Why:

- Fast implementation.
- shadcn gives accessible primitives while keeping source ownership.
- Tailwind works well with product UI surfaces.

Tradeoff:

- AI agents often create inconsistent one-off Tailwind classes.
- shadcn can become a dump of components if not curated.

Rule:

- Use theme tokens before raw colors.
- Add only the shadcn components we actually use.
- Put reusable local UI in `src/components/primitives`.
- Do not create new button/input/dialog/card variants inside features.
- Use Sonner for toast notifications when toast feedback is needed.
- Do not create a custom toast system.

### Zustand

Decision: use Zustand for local UI state.

Why:

- Good fit for panel state, active box, drawers, selected block, command palette.
- Small and easy to reason about.

Tradeoff:

- It can become a global dumping ground.

Rule:

- Zustand stores are only for UI/client state.
- Server data stays in server queries or TanStack Query.

### TanStack Query

Decision: use TanStack Query when a feature has client-side async interactions.

Why:

- Useful for search, autosave status, optimistic task updates, and panel refreshes.
- Avoids hand-written loading/error/cache state.

Tradeoff:

- Not every query needs it in App Router.

Rule:

- Do not wrap every server read in TanStack Query by default.
- Use it for interactive client surfaces and repeated refetching.

### Vercel AI SDK

Decision: use Vercel AI SDK in Route Handlers with direct OpenAI access for the MVP.

Why:

- TypeScript-native AI integration.
- Works well with Next.js route handlers.
- Supports streaming and structured outputs.
- Keeps model/provider integration from spreading across the app.
- Allows the app code to stay relatively provider-agnostic if the provider access path changes later.

Tradeoff:

- AI actions can become vague if not typed.
- Direct OpenAI access is simpler now, but does not provide Vercel AI Gateway features such as provider routing, failover, and centralized multi-provider tracking.
- Future provider migration must be intentional and reviewed.

Rule:

- AI endpoints return either streamed assistant text or explicit structured actions.
- AI receives clean text context, not raw TipTap JSON unless required.
- Prompt files and action schemas live in `src/server/ai`.
- OpenAI model calls must be centralized behind a small internal AI service layer, for example `src/server/ai/provider.ts`.
- Model selection must be centralized in `src/server/ai/models.ts` or equivalent.
- `OPENAI_MODEL_ASSISTANT` is the default model for conversational/contextual assistant responses such as answering questions about the current note or box.
- `OPENAI_MODEL_STRUCTURED` is the default model for structured operations such as extracting tasks, classifying text, proposing boxes, or returning typed JSON actions.
- React components and feature modules must never import OpenAI provider clients directly.
- If the project later moves to Vercel AI Gateway or another provider layer, the switch must happen inside `src/server/ai` and only after explicit approval.

### Postgres search + pg_trgm

Decision: start with Postgres full-text search and trigram matching.

Why:

- Enough for MVP search.
- Avoids adding Meilisearch, Algolia, or Elasticsearch too early.
- Keeps data and search in one system.

Tradeoff:

- Ranking and multilingual behavior may need tuning.

Rule:

- Use `content_text` for indexing.
- Create a unified search function or materialized search table once needed.
- Add external search only after Postgres search becomes the bottleneck.

### No NestJS backend for MVP

Decision: do not create a separate NestJS backend yet.

Why:

- MVP does not need complex backend domains.
- A separate backend slows iteration and doubles conventions.
- Next.js can handle the demo requirements.

Tradeoff:

- If integrations, background jobs, queues, or mobile APIs become central, a backend may become useful later.

Rule:

- Revisit NestJS only when Route Handlers become a real constraint.

## Proposed folder architecture

```txt
.
├── docs/
│   ├── product-context.md
│   ├── technical-foundation.md
│   ├── ai-rules.md
│   ├── design-system.md
│   └── README.md
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (onboarding)/
│   │   │   └── onboarding/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── today/page.tsx
│   │   │   ├── boxes/page.tsx
│   │   │   ├── boxes/[boxId]/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── assistant/route.ts
│   │       ├── documents/[documentId]/autosave/route.ts
│   │       ├── attachments/route.ts
│   │       └── webhooks/clerk/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── primitives/
│   │   ├── layout/
│   │   └── editor/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── workspaces/
│   │   ├── documents/
│   │   ├── daily-notes/
│   │   ├── boxes/
│   │   ├── tasks/
│   │   ├── search/
│   │   ├── assistant/
│   │   ├── calendar/
│   │   ├── inbox/
│   │   └── people/
│   ├── server/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── storage/
│   │   └── ai/
│   ├── stores/
│   ├── hooks/
│   ├── lib/
│   └── types/
└── src/proxy.ts
```

`src/app/(app)/page.tsx` is the main product page and should be the left rail main/home destination. `/today` may remain as a compatibility route or redirect, but it is not the primary product navigation target. Box opening should also stay on `/`; dedicated `/boxes/[boxId]` routes may exist only as compatibility redirects or future deep-link infrastructure, not as the MVP interaction.

## Component architecture

### `src/components/ui`

Only shadcn-generated components.

Rules:

- Do not add product logic here.
- Do not manually create components here.
- Do not edit shadcn files unless the change is intentionally global.

### `src/components/primitives`

Small reusable app components built on top of shadcn and Tailwind.

Examples:

- `IconButton`
- `Panel`
- `PanelHeader`
- `Toolbar`
- `EmptyState`
- `LoadingState`
- `StatusBadge`
- `Kbd`
- `InlineMeta`

Rules:

- Use primitives for repeated visual patterns.
- Features should compose primitives instead of creating one-off variants.

### `src/components/layout`

Application shell components.

Examples:

- `AppShell`
- `AppSidebar`
- `Topbar`
- `RightRail`
- `BottomDrawer`
- `WorkspaceSwitcher`

Rules:

- App layout is defined once.
- Feature pages slot into the shell.
- Secondary panels must not replace the central editor.

### `src/components/editor`

Shared TipTap implementation.

Examples:

- `DocumentEditor`
- `EditorToolbar`
- `EditorBubbleMenu`
- `EditorFloatingMenu`
- `SlashCommandMenu`
- `TaskItemExtension`
- `MentionExtension`
- `AttachmentExtension`

Rules:

- One editor base.
- One extension registry.
- One autosave hook.
- All documents produce plain text for search and AI.

### `src/features/*`

Feature modules own product logic.

Recommended structure:

```txt
features/example/
├── components/
├── server/
│   ├── queries.ts
│   └── mutations.ts
├── hooks/
├── schemas.ts
├── types.ts
└── index.ts
```

Rules:

- Features expose public imports through `index.ts`.
- Avoid importing another feature's internals.
- Shared logic moves up to `components`, `server`, `hooks`, or `lib`.

## Data model direction

The MVP should centralize editable content in a `documents` table instead of creating separate note tables too early.

### Core tables

```txt
workspaces
workspace_members
documents
boxes
document_boxes
tasks
attachments
people
events
inbox_items
ai_actions
```

`workspaces` and `workspace_members` are local application mirrors of Clerk organizations and memberships. Clerk remains the auth and organization source of truth; local tables exist so app data can use stable internal ids and joins.

Workspaces are invite-only in the MVP. A signed-in user can create a new workspace or accept an invitation sent by another member, but the app must not expose a public organization directory. A user can belong to multiple workspaces, and the active Clerk organization is the only workspace context used by server mutations.

Clerk remains the source of truth for organization profile data, memberships, invitations, roles, and organization lifecycle operations. Cervo should not duplicate these management flows in custom forms. The local mirror exists only to connect Cervo product data to a stable internal `workspaceId`.

### `workspaces`

```txt
id
clerk_org_id unique
name
slug
created_by
created_at
updated_at
```

### `workspace_members`

```txt
id
workspace_id
clerk_user_id
role
created_at
updated_at
```

### `documents`

```txt
id
workspace_id
type: daily_note | box_home | note
date nullable
title
content_json
content_text
created_by
updated_by
created_at
updated_at
```

Justification:

- Daily notes and box home pages use the same editor.
- A note can belong to several boxes without content duplication.
- Autosave is implemented once.
- Search is implemented once.
- AI context extraction is implemented once.
- Future document types can be added without rebuilding the editor layer.

### `boxes`

```txt
id
workspace_id
name
slug
status: active | future | archived
parent_box_id nullable
home_document_id
created_at
updated_at
```

`parent_box_id` supports nested boxes. The main page boxes section should be able to render child boxes, notes/documents, and a breadcrumb or path-like navigation pattern without leaving `/`.

The default catch-all box is labeled `Unsorted` in the UI. It should not be treated as a normal editable project box unless a later implementation decision explicitly requires it. Prefer modeling it as a system/virtual view of untriaged notes, so it cannot be renamed or deleted and does not complicate normal box mutations.

### `document_boxes`

```txt
id
workspace_id
document_id
box_id
created_by
created_at
```

Rules:

- Enforce uniqueness on `(document_id, box_id)`.
- Use this table for daily notes and regular notes assigned to boxes.
- Do not use this table for a box's own `home_document_id`; the home document relationship lives on `boxes`.
- Adding a document to a box creates a relationship row only. It must not copy `documents.content_json` or create a duplicate document row.

### `tasks`

```txt
id
workspace_id
source_document_id nullable
box_id nullable
title
status: todo | done
due_date nullable
created_at
updated_at
```

### `attachments`

```txt
id
workspace_id
source_type: document | box | task | person
source_id
storage_path
file_name
mime_type
size
created_at
```

### MVP mock tables

`people`, `events`, and `inbox_items` are database-backed mock data for the MVP. They should be modeled cleanly enough to be replaced later by Folk, Google Calendar, and Gmail integrations without changing the UI contract.

## Server/data access rules

- All DB access goes through `src/server/db`.
- Database and SDK clients must be lazily initialized, not created at module scope.
- All workspace-scoped queries require `workspaceId`.
- `workspaceId` comes from Clerk server auth, not from client input.
- `workspaceId` should resolve from the active Clerk `orgId` through the local `workspaces` mirror.
- The local workspace mirror should be created or updated whenever a user enters the app with an active Clerk organization.
- Workspace invitations and membership management are handled by Clerk prebuilt components for the MVP.
- Invitation acceptance and organization switching must lead through a sync step that ensures the local `workspaces` and `workspace_members` records exist.
- Clerk webhooks should be added before relying on out-of-session organization changes, such as renames, deletions, membership changes, or role updates, to keep the local mirror synchronized.
- Mutations validate input with Zod or equivalent schemas.
- Route Handlers are used for AI, uploads, webhooks, and external integrations.

## MVP implementation order

1. Project scaffold and design tokens.
2. Clerk email OTP auth.
3. Organization/workspace onboarding with invite-only joining and local workspace sync.
4. Organization-aware app shell.
5. Supabase Postgres + Drizzle schema.
6. Documents table and daily note auto-creation.
7. TipTap `DocumentEditor` with autosave.
8. Boxes with `box_home` documents, `document_boxes` membership, and nested box support.
9. Tasks linked to documents and boxes.
10. Global search over `content_text`, boxes, tasks, people, and inbox items.
11. DB-backed mock calendar, inbox, and people panels.
12. Assistant route with contextual summarize/extract/organize actions.
13. Demo polish: paste, keyboard shortcuts, command palette, loading states.

## Non-goals for MVP

- NestJS backend.
- Native desktop app.
- React Native mobile app.
- Real-time collaboration.
- Complex permissions.
- Public sharing.
- Plugin marketplace.
- Gmail/Google Calendar/Folk production integrations.
- Redis queues.
- External search engine.

## Files that should exist before heavy development

```txt
docs/product-context.md
docs/technical-foundation.md
docs/ai-rules.md
docs/design-system.md
docs/README.md
```

`ai-rules.md` should tell coding agents how to work.

`design-system.md` should tell coding agents how the product should look and feel.

## Open technical decisions

These must be decided before or during scaffold:

1. Whether the MVP needs local-first/offline constraints beyond normal local development. Deployment target remains Vercel.
2. Exact theme token palette around the zinc base.
3. Database connection method details for Drizzle and Supabase Postgres.
4. Exact OpenAI model defaults for each AI use case.

## References

- Next.js App Router: https://nextjs.org/docs/app
- Clerk Organizations: https://clerk.com/docs/nextjs/guides/organizations/getting-started
- TipTap Simple Editor: https://tiptap.dev/docs/ui-components/templates/simple-editor
- shadcn/ui configuration: https://ui.shadcn.com/docs/components-json
- Supabase full-text search: https://supabase.com/docs/guides/database/full-text-search
- Supabase RLS: https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security
- Vercel AI SDK with Next.js App Router: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
