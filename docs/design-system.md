# Design system

This file defines the visual and interaction direction for the MVP.

The product is a work tool for founders and small teams drowning in information. It must feel calm, fast, familiar, and precise. The reference is Obsidian enriched with useful side capabilities, not Notion, not a generic SaaS dashboard, and not a marketing site.

## Design principles

- Daily note first.
- Editor at the center.
- Panels around the editor, never instead of the editor.
- Familiar before flashy.
- Dense but breathable.
- Fast capture over decorative UI.
- Small reusable primitives over one-off components.
- Clear states over hidden magic.

## Visual references

Primary:

- Obsidian for daily-note mental model and writing focus.
- Apple Notes / Google Keep for immediate capture familiarity.
- Linear for restrained product polish and command ergonomics.
- Cursor for contextual side assistant and bottom drawer patterns.

Avoid:

- Notion-like all-purpose blocks as the product identity.
- SaaS landing-page composition.
- Heavy dashboards.
- Decorative gradients and abstract backgrounds.

## Theme direction

- Light-first.
- Background: white or very subtle off-white.
- Panels: subtle gray contrast.
- Borders: quiet and functional.
- Base palette: shadcn `zinc`.
- Accent color: restrained and used sparingly.
- Dark mode can come later, but is not the MVP default.

Use tokens, not scattered raw colors:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-muted`
- `bg-card` only for genuinely framed repeated items or modals.

## Layout

The default app shape:

```txt
┌─────────────────────────────────────────────────────────┐
│ Topbar: centered global search, workspace, commands     │
├──────────────┬─────────────────────────────┬────────────┤
│ Icon rail    │ Main content                │ Right rail │
│ Main/tasks   │ Daily note, then boxes      │ Inbox      │
│ Settings     │ Box pages or task pages     │ Calendar   │
└──────────────┴─────────────────────────────┴────────────┘
```

Rules:

- A centered global search bar must stay available in the top bar across app pages, including the main page, tasks, settings, and box pages.
- The main page route is `/`. The left rail main/home icon opens `/`, not `/today`.
- The left rail is icon-first and minimal. The main/home icon opens the default main page with today's note and boxes. The tasks icon opens a dedicated tasks page. Settings opens settings. Icon-only navigation items need hover tooltips.
- The central editor keeps priority in width and visual hierarchy.
- On the main page, the central scroll surface shows today's daily note first and boxes directly below it. The daily note should take roughly three quarters of the main content height in the default state, with the first boxes visible below the fold or near the bottom of the first viewport.
- The main page box list shows all top-level boxes only. Child boxes are shown after opening their parent box, not in the main page top-level list.
- The `Unsorted` box appears first and should be visually differentiated from normal project boxes in a subtle way.
- The daily note has an expansion control that grows the note section to fit its content for writing-focused sessions. Expanding the note should not hide the right rail.
- Box lists should feel like a lightweight file/folder surface, not a dashboard. On box pages, child boxes, notes/documents, and breadcrumbs should support a familiar Google Drive-like navigation model.
- The right rail is simple for the current MVP interface: inbox on top, calendar/upcoming events on bottom. Do not build heavy panel behavior for it yet.
- Bottom drawers may be used for mail, command output, or contextual tools.
- Do not create multiple competing navigation systems.
- Do not create nested cards for page sections.

## Surfaces

Use cards only for:

- Repeated items.
- Modals/dialogs.
- Small framed tools that genuinely need containment.

Do not use cards for:

- Whole page sections.
- App shell layout.
- Editor container when a simple pane is enough.
- Nested information groups inside other cards.

## Typography

- Use Geist Sans for interface text.
- Use Geist Mono for dates, keyboard shortcuts, technical metadata, IDs, and compact counters.
- Do not scale font size with viewport width.
- Do not use negative letter spacing.
- Keep headings modest inside tool surfaces.
- Reserve large display type for rare brand/hero contexts, not the app UI.

## Radius and density

- Default radius: small to medium.
- Prefer `rounded-md` or less.
- Avoid oversized rounded rectangles.
- Icon buttons must have stable square dimensions.
- Toolbars, panels, and rows must not resize when state changes.

## Icons

- Use `lucide-react`.
- Use icons for common actions: search, calendar, inbox, archive, plus, settings, command, bold, italic, link, checkbox.
- Use a brain-like icon for the main page only if `lucide-react` provides a suitable one; otherwise use the closest clear navigation metaphor rather than custom-drawing an icon.
- For boxes, prefer existing `lucide-react` box/archive/package icons. A simple closed/open icon state is enough for the MVP; do not build heavy custom animation.
- Add tooltips for icon-only controls that are not obvious.
- Do not hand-roll SVG icons unless the icon is product-specific.

## Editor UX

The editor should feel like a fast note surface:

- Click and type immediately.
- Paste should just work.
- Drag/drop files should feel natural.
- Cmd+B and Cmd+I must work.
- Slash commands must support quick task/checkbox creation.
- Selected text should open a compact contextual menu.

Selection menu actions can include:

- Turn into task.
- Ask assistant.
- Summarize selection.

Creating a new note from selected text and attaching it to boxes is a later workflow. Do not present move/copy selected text to box as a Phase 4 or Phase 5 action.

## States

Required states:

- Empty.
- Loading.
- Error.
- Saving.
- Saved.
- Offline or failed save when relevant.

Autosave status should be subtle but visible. The user should feel the app is dependable without being interrupted.

Toast notifications:

- Use Sonner when toast feedback is needed.
- Toasts should be rare, short, and action-oriented.
- Do not use toasts for persistent state that belongs in the UI, such as autosave status.

## Motion

- Use motion sparingly.
- Panel open/close can animate quickly.
- Menus should feel immediate.
- Avoid decorative animation.

## Content style

- Product UI copy must stay in English.
- Keep labels short.
- Avoid explanatory marketing text inside the app.
- Prefer concrete nouns: Today, Unsorted, Boxes, Tasks, Inbox, Calendar, People, Archive.
- Empty states can be helpful, but should not become tutorials.

## Accessibility

- Use semantic controls.
- Maintain visible focus states.
- Icon-only buttons need accessible labels.
- Menus and dialogs should use accessible primitives.
- Ensure contrast is readable on subtle gray backgrounds.

## Implementation rules

- Start from shadcn tokens and primitives.
- Put reusable app patterns in `src/components/primitives`.
- Do not duplicate visual patterns inside features.
- Do not introduce a new palette without updating this document.
- Do not introduce a new component variant without checking existing primitives.
