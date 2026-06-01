# Product context

Source: meeting recap dated 2026-06-01.

In the transcript, `Me` means Adil, the client. `Them` means Hugo, the developer asking questions.

## One-line direction

An Obsidian-like company second brain, connected to calendar, mail, CRM, and AI, centered on the daily note and project boxes so users can dump their thoughts instantly, then retrieve or activate information without friction.

## Product slogan

Dump your mind. Find everything. Move the company forward.

## Core problem

Adil is overwhelmed by fragmented information flows: calendar, email, messages, CRM, sponsors, meetings, production tasks, content formats, magazine operations, and files. There is no natural place where he can quickly empty his mind, structure what matters, and retrieve the right information later.

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

The daily note is the default entry point.

It should support:

- Automatic daily note creation.
- Fast capture.
- Explicit tasks and checkboxes.
- Weekly review later.
- Quarterly or yearly review later.

The date gives the workspace a natural structure and prevents the user from starting from a blank, abstract dashboard.

### Boxes

Each project is a box.

A box is both:

- A home document: summary, tasks, status, context, people, links.
- A container: files, notes, assets, attachments, references.

Examples:

- Magazine.
- Sponsors.
- Recaps.
- Buzzer.
- Future ideas.

This is one of the strongest product metaphors from the meeting: a project should feel like a box you can open, inspect, add to, archive, or move to the future.

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
5. The user selects text and sends it to a box or turns it into a task.
6. The user opens a project box and sees its home document.
7. The user searches globally and finds something quickly.
8. The user sees calendar/inbox context without losing the central note.
9. The user asks the assistant to summarize, extract, or organize from the current context.

The target feeling is: "Finally, there is one place where I can empty my mind and the company remembers for me."

## MVP scope

Must have:

- Email OTP authentication.
- Organization/workspace onboarding before app access.
- Daily note by default.
- TipTap editor with autosave.
- Basic keyboard shortcuts such as Cmd+B and Cmd+I.
- Slash commands for task and checkbox creation.
- Text selection menu with contextual actions.
- Project boxes with home documents.
- Tasks linked to documents and boxes.
- Global search across core entities.
- DB-backed mock calendar panel.
- DB-backed mock inbox panel.
- DB-backed mock people/CRM data.
- Contextual AI assistant for summarizing, extracting tasks, and organizing selected/current content.

Should have if quick:

- Drag-and-drop attachments.
- Send selected content to a specific box.
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

- Optimize for speed of capture.
- Optimize for demo magic.
- Keep the interface minimal and familiar.
- Do not add noise to Adil's workflow.
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
