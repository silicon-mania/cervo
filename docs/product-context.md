# Product context

## One-line direction

An Obsidian-like company second brain, connected to calendar, mail, CRM, and AI, centered on the daily note and project boxes so users can dump their thoughts instantly, then retrieve or activate information without friction.

## Product slogan

Dump your mind. Find everything. Move the company forward.

## Core problem

Users are overwhelmed by fragmented information flows: calendar, email, messages, CRM, sponsors, meetings, production tasks, content formats, magazine operations, and files. There is no natural place where he can quickly empty his mind, structure what matters, and retrieve the right information later.

Existing tools do not solve this well:

- Notion feels too heavy, too click-driven, and too much like an all-purpose workspace.
- Obsidian has the right mental model, but is not built for company workflows, sharing, and integrated operational context.
- ChatGPT and Codex are too chat-oriented; they do not feel like a daily work surface.
- Google Drive, Calendar, Gmail, Slack, and CRM tools fragment company memory.
- Agent-first tools often create new interfaces instead of starting from a familiar note-taking surface.

## Desired solution

The product should be a simple workspace that opens on today's note by default. The user can type, paste, drag, drop, create tasks, and capture raw thoughts without deciding where everything belongs first.

The app then helps organize and reuse that information through:

- Project boxes.
- Global search.
- Calendar and inbox context.
- People/CRM context.
- Contextual AI actions.

AI should support the workspace, not replace it. The primary capture interface is a living document, not a chatbot.

## Mental model

### Journal

The main app route `/` is the default product entry point. It opens on today's daily note by default, but the product should not be modeled as "one note per day only." Users should eventually be able to create as many notes as they need each day. The key product requirement is that there is always an immediately available note surface so users can start writing without thinking about where to click.

It should support:

- Automatic daily note availability without storing an untouched empty daily note.
- Multiple notes per day later.
- Fast capture.
- Explicit tasks and checkboxes.
- Weekly review later.
- Quarterly or yearly review later.

The date gives the workspace a natural structure and prevents the user from starting from a blank, abstract dashboard.

The daily note surface should always be available when the user enters the app. It becomes a stored note only after the user changes its title or content. If the user opens the app only to browse or edit older notes and leaves the default daily note untouched, the app should not create an unnecessary daily note row.

The main page combines today's daily note and boxes on one continuous surface. The daily note should dominate the first viewport, taking roughly three quarters of the main content height, with the first boxes visible just below it. Scrolling the main content reveals the rest of the boxes. The daily note area should have an expansion control that lets writing-focused users grow the note area to its content height and reduce box visual noise, while keeping the inbox and calendar rail visible.

### Boxes

Each project is a box. A box is a container for notes, child boxes, files, assets, attachments, and references.

Examples:

- Magazine.
- Sponsors.
- Recaps.
- Buzzer.
- Future ideas.

This is one of the strongest product metaphors from the meeting: a project should feel like a box you can open, inspect, add to, archive, or move to the future.

Boxes and notes have a many-to-many relationship through box placements. A note can be placed in several boxes without being duplicated, and a box can contain several placed notes. Assigning a daily note to a box links the existing document to that box; it does not create a second copy of the note.

The default box is named `Unsorted` in the UI. It is a visible catch-all for notes that have not been placed in any box. It should not behave like a normal user-managed project box: it cannot be renamed or deleted, and it may be represented as a virtual/system view rather than a normal database row. A daily note can start in `Unsorted`, then disappear from `Unsorted` once the user links the note to one or more specific boxes.

If the user removes the last box placement from a note, the note should immediately appear in `Unsorted`. The note remains open if it is the active editor document; only its placement state changes.

Boxes can also contain child boxes. Opening a box should happen inside the main page `/` as a smooth drill-down state in the boxes section, not by navigating to a separate route. The daily note area must remain stable while the boxes section changes. The navigation model can borrow from familiar file/folder interfaces such as Google Drive: visible child boxes, notes/documents, a back action, and a clear path or breadcrumb.

Creating a root box or child box should create only the empty box container. The app must not automatically create a note inside the box. Inside an empty or non-empty box, the user should have quick actions to create a new note or a new child box.

Opening a note from a box is a separate, deliberate action from opening a box. Box clicks only drill down the boxes section. Note clicks may replace the editor with that note, but the app should prefetch or cache note content once the box view is visible so opening the note feels close to instant and avoids a visible loading spinner.

Creating a new note from inside a box is an explicit writing action. It should immediately replace the current editor document with an empty note titled `Undefined`, autofocus the editor content, and link the note to the current box. It should not appear in `Unsorted`, because `Unsorted` only contains notes with no box placement.

The current editor should have a lightweight `Add to box` action in the top-right document action area. The action should open a minimalist popover for placing the current note in one or more boxes, removing existing placements, and quickly creating a new box from inside the same flow. Creating a box from inside this popover should automatically place the current note in the new box. New boxes created from the popover should default to root boxes unless the user has selected or navigated to a parent box; in that case, the new box should be created as a child of that parent.

### Archives

Inactive work should not pollute active work.

Boxes can become:

- Active.
- Future.
- Archived.

The archive is not a trash bin. It is a way to clear the user's mind while preserving useful context.

## MVP experience

The MVP demo should prove this flow:

1. The user opens the app.
2. The app opens today's note.
3. The user captures raw thoughts, links, pasted text, and files.
4. The user creates a task or checkbox quickly through slash commands or keyboard interactions.
5. The user selects text and turns it into a task.
6. The user opens a project box and sees its child boxes and notes.
7. The user searches globally and finds something quickly.
8. The user sees calendar/inbox context without losing the central note.
9. The user asks the assistant to summarize, extract, or organize from the current context.

The target feeling is: "Finally, there is one place where I can empty my mind and the company remembers for me."

Later, users should be able to create a new note from a selected excerpt and attach that new note to one or more boxes. This selected-excerpt-to-new-note workflow is not the Phase 4 priority.

## MVP scope

Must have:

- Email OTP authentication.
- Organization/workspace onboarding before app access.
- Invite-only workspace joining: users can create a workspace or accept an invitation, but cannot browse public organizations.
- Daily note by default.
- Main page at `/` that shows the daily note and all top-level boxes together.
- TipTap editor with autosave.
- Basic keyboard shortcuts such as Cmd+B and Cmd+I.
- Slash commands for task and checkbox creation.
- Text selection menu with contextual actions.
- Project boxes with child boxes, explicit note creation, and many-to-many box placement.
- Tasks linked to documents and boxes.
- Global search across core entities, always reachable from the top bar.
- DB-backed mock calendar panel.
- DB-backed mock inbox panel.
- DB-backed mock people/CRM data.
- Contextual AI assistant for summarizing, extracting tasks, and organizing selected/current content.

Should have if quick:

- Drag-and-drop attachments.
- Attach the current note to one or more specific boxes.
- AI action preview before mutation.

Not required for MVP:

- Real-time collaboration.
- Public sharing.
- Complex permissions.
- Native desktop app.
- Mobile app.
- Gmail production integration.
- Google Calendar production integration.
- Folk production integration.
- Plugin marketplace.
- Autonomous background agents.

## Product principles

- Keep the in-app product UI in English only.
- Optimize for speed of capture.
- Optimize for demo magic.
- Keep the interface minimal and familiar.
- Do not add noise to User's workflow.
- Do not turn the product into Notion.
- Prefer documents, boxes, search, and context over dashboards.
- Make AI contextual and useful, not dominant.
- Start with a demo that creates desire, then iterate.

## Important integrations

MVP or demo-level:

- DB-backed mock calendar panel next to the daily note.
- DB-backed mock inbox panel or bottom drawer.
- DB-backed mock people/CRM context.
- Global search.
- Contextual AI assistant.

Later:

- Gmail API.
- Google Calendar API.
- Folk CRM API.
- Granola or meeting transcript ingestion.
- File and bookmark capture.

## Inspiration references

- Obsidian: daily notes, markdown-like writing, plugin mental model.
- Apple Notes / Google Keep: immediate familiarity and fast capture.
- MyMind: global search and retrieval experience.
- Cosmos: visual/search interaction inspiration.
- Folk: minimalist CRM and people/sponsor tracking.
- Granola: simple meeting note capture.
- Cora: daily brief and email synthesis.
- Cursor: contextual side assistant and bottom drawer patterns.
- Figma: long-term collaboration quality.
- Tiago Forte / PARA: capture, organize, prioritize, retrieve; useful but not copied directly.
- Andrej Karpathy / LLM knowledge base: high-quality knowledge base feeding AI.
- Farza-style demos: simple, magical demos that create hype and waitlist demand.

## Success criteria

The MVP is successful if a viewer understands the product in under one minute and believes:

- Capture is faster than their current workflow.
- The daily note is the natural starting point.
- Boxes make project memory understandable.
- Search makes the company memory retrievable.
- AI helps organize and act without forcing a chat-first workflow.

The MVP is not successful if it feels like:

- A generic SaaS dashboard.
- A Notion clone.
- A chatbot wrapped around notes.
- A complex productivity system that requires setup before it becomes useful.
