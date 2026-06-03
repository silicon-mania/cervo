# Instant Memory Boxes PRD

Labels: `ready-for-agent`

## Problem Statement

Box browsing currently feels too slow and heavy for a minimalist notes system. The user wants to move through boxes instantly, create and organize boxes without waiting on loading states, and open notes from boxes without a visible per-click fetch delay.

The current implementation also creates a `box_home` document when a box is created, which does not match the intended product behavior. A box should start as an empty container. Notes should only be created or placed in boxes through explicit user actions.

## Solution

Refactor the Memory data flow so boxes and note placement feel instant.

Clicking a box should only drill down inside the boxes section. It must not replace the current editor document. Creating, renaming, moving, placing notes in, removing notes from, and deleting boxes should update the visible UI optimistically before the server confirms the mutation.

Notes visible in the active box view should have their full content prefetched so clicking a note can replace the editor document without showing a visible loading spinner. Creating a note inside a box should immediately open an empty note titled `Undefined`, autofocus the writing surface, and place that note in the current box.

The data flow should use typed Route Handlers and TanStack Query for server-backed Memory data, including optimistic mutation, rollback, cache reconciliation, and visible-note prefetching.

## User Stories

1. As a notes user, I want clicking a box to drill down instantly, so that browsing project memory feels immediate.
2. As a notes user, I want clicking a box to leave my current editor document unchanged, so that browsing does not interrupt my writing.
3. As a notes user, I want a clear breadcrumb or path while drilling into boxes, so that I always know where I am.
4. As a notes user, I want to go back from a child box to its parent, so that nested browsing feels familiar.
5. As a notes user, I want root boxes to load without fetching every note body, so that the main page stays fast.
6. As a notes user, I want notes in the visible box to be ready before I click them, so that opening a note feels close to instant.
7. As a notes user, I want clicking a note card to replace the editor with that note, so that I can edit older notes from boxes.
8. As a notes user, I want note opening to avoid visible loading spinners whenever possible, so that the app feels lightweight.
9. As a notes user, I want creating a root box to show the new box immediately, so that organizing does not feel blocked by the server.
10. As a notes user, I want creating a child box to show the new child immediately, so that nested structure is fast to build.
11. As a notes user, I want a newly created box to start empty, so that the app does not create unwanted notes for me.
12. As a notes user, I want each box view to include a quick action for creating a note, so that I can start writing inside a box quickly.
13. As a notes user, I want each box view to include a quick action for creating a child box, so that I can structure a project without leaving the box.
14. As a notes user, I want creating a note inside a box to open it immediately, so that I can start writing without another click.
15. As a notes user, I want a new note created inside a box to be titled `Undefined`, so that I can begin with content before naming it.
16. As a notes user, I want a new note created inside a box to have empty content, so that I get a blank writing surface.
17. As a notes user, I want the editor content to autofocus after creating a note, so that I can start writing immediately.
18. As a notes user, I want a note created inside a box to be placed in that box automatically, so that it does not appear in `Unsorted`.
19. As a notes user, I want `Unsorted` to show only notes with no box placement, so that it is a true catch-all.
20. As a notes user, I want adding the first box placement to remove a note from `Unsorted`, so that `Unsorted` stays accurate.
21. As a notes user, I want removing the last box placement to move a note into `Unsorted`, so that unplaced notes remain findable.
22. As a notes user, I want the active note to stay open when I remove its last box placement, so that organization changes do not interrupt editing.
23. As a notes user, I want a top-right `Add to box` action on the editor, so that placing the current note is always nearby.
24. As a notes user, I want the `Add to box` action to open a minimalist popover, so that placing a note does not feel like a heavy management screen.
25. As a notes user, I want the popover to let me select several boxes, so that one note can live in multiple project contexts.
26. As a notes user, I want the popover to let me remove existing box placements, so that I can correct organization quickly.
27. As a notes user, I want the popover to let me create a new box, so that I can place a note into a box that does not exist yet.
28. As a notes user, I want a box created from the `Add to box` popover to be selected automatically, so that the intent to place the note is honored.
29. As a notes user, I want new boxes created from the popover to default to root boxes, so that quick creation stays simple.
30. As a notes user, I want to choose a parent box when creating from the popover, so that I can create a child box when needed.
31. As a notes user, I want renaming a box to update immediately, so that editing structure feels responsive.
32. As a notes user, I want moving a box to update immediately, so that reorganizing nested boxes feels responsive.
33. As a notes user, I want deleting a box to require confirmation, so that destructive actions are not accidental.
34. As a notes user, I want confirmed box deletion to remove the box subtree, so that deleting a project container cleans up its nested structure.
35. As a notes user, I want notes placed in boxes outside the deleted subtree to survive deletion, so that shared notes are not accidentally lost.
36. As a notes user, I want notes placed only inside the deleted subtree to be hard-deleted for now, so that the current simple model has no hidden trash state.
37. As a notes user, I want failed optimistic changes to roll back, so that the UI eventually matches the server.
38. As a notes user, I want errors to be quiet but visible, so that I understand when an instant action failed.
39. As a future implementer, I want existing `box_home` documents to be ignored by the new Memory UI, so that legacy rows do not block the refactor.
40. As a future implementer, I want no destructive `box_home` cleanup during this refactor, so that schema cleanup can happen after the new flow stabilizes.

## Implementation Decisions

- Use the domain term **Box Placement** for the relationship that places one note inside one box without duplicating the note.
- Keep the active box or drill-down target as local UI state.
- Use TanStack Query for server-backed Memory data: boxes, note summaries, full note content, visible-note prefetching, optimistic mutations, invalidation, and rollback.
- Add a Query Client provider if the app does not already have one wired into the authenticated app shell.
- Use typed Route Handlers for Memory mutations instead of Server Actions when optimistic updates and rollback are needed.
- Create box endpoint: `POST /api/boxes`.
- Update box endpoint: `PATCH /api/boxes/:boxId`.
- Delete box endpoint: `DELETE /api/boxes/:boxId`.
- Add note placement endpoints for placing and removing notes from boxes.
- Create/update/move/rename box responses should return only the changed canonical box.
- Deletion responses should return `{ deletedBoxIds, deletedDocumentIds, preservedDocumentIds }`.
- TanStack Query should reconcile changed boxes into the cached Memory tree without full snapshot refetches for ordinary success paths.
- Full Memory snapshot refetching is reserved for unusual conflicts or recovery paths.
- Creating a root box or child box must create only the empty box container.
- New box creation must stop creating `box_home` documents.
- Existing `box_home` documents and `home_document_id` support should be ignored by the new Memory UI during this refactor.
- Do not destructively clean up existing `box_home` data yet.
- Deleting a box requires a confirmation modal before the optimistic deletion is applied.
- After confirmation, deleting a box hard-deletes its child box subtree.
- Notes that also have placements outside the deleted subtree must be preserved.
- Notes whose only placements are inside the deleted subtree should be hard-deleted for now.
- There is no trash lifecycle in this PRD.
- `Unsorted` is a derived view of notes with no box placement.
- Creating a note from inside a box should create a real note row, place it in the current box, open it in the editor, use title `Undefined`, use empty content, and autofocus the editor content.
- A note created inside a box should not appear in `Unsorted`.
- Removing the last placement from a note should make it appear in `Unsorted`.
- Adding the first placement to an unsorted note should remove it from `Unsorted`.
- The editor should expose a top-right `Add to box` action.
- The `Add to box` action should open a minimalist popover for adding/removing placements and creating boxes.
- A box created from inside the `Add to box` popover should automatically place the current note in that new box.
- New boxes created from the popover should default to root boxes.
- If the user has selected or navigated to a parent box in the popover, the created box should be a child of that parent.
- When a box view becomes visible, prefetch full note content only for notes visible in that box.
- Do not preload every note body for every box on initial page load.
- Clicking a box must only drill down the boxes section.
- Clicking a note is the deliberate action that may replace the editor document.
- Visual redesign of the full boxes UI is secondary to the focused data-flow refactor.

## Testing Decisions

- Test external behavior, not implementation details. Tests should assert what the user can see and do: instant visible changes, correct drill-down behavior, correct editor replacement, correct `Unsorted` behavior, and correct preservation/deletion outcomes.
- The highest-value seam is the connected app flow: authenticated user opens the main page, browses boxes, creates boxes, creates notes, places notes, removes placements, and deletes boxes.
- The next seam is API behavior for Memory Route Handlers: canonical box responses, deletion result responses, placement changes, and note creation from a box.
- The next seam is focused data logic around deletion preservation: notes with placements outside a deleted subtree are preserved, while notes placed only inside the subtree are deleted.
- TanStack Query behavior should be tested through user-visible outcomes rather than by asserting internal cache calls.
- Existing manual browser verification guidance for boxes and connected UI should be reused as prior art.
- Add tests only at seams that protect the refactor from regressions: box drill-down, optimistic create/rename/delete behavior, note prefetch/open behavior, and `Unsorted` placement transitions.
- Do not test visual styling details beyond user-visible behavior and accessibility-critical states.

## Out of Scope

- Full visual redesign of the boxes section.
- Final implementation of the rich polished `Add to box` popover beyond the data contracts and first usable flow.
- Trash, restore, or delete-forever lifecycle.
- Destructive cleanup or schema migration for existing `box_home` documents and `home_document_id`.
- Public deep links for boxes.
- Real-time collaboration.
- Changing the daily note lazy-persistence model.
- Replacing the editor architecture.
- Global search changes beyond keeping note/box data consistent.
- New AI behavior.

## Further Notes

- The focused refactor should happen before visual polish.
- The current project vocabulary prefers **Note**, **Box**, and **Box Placement**.
- The current schema may still contain legacy `box_home` support. This PRD intentionally stops new `box_home` creation but avoids destructive cleanup.
- The desired feeling is that Memory browsing is instantaneous and quiet: no spinner every time the user opens a box, and no mutation loading state blocking ordinary organization.
