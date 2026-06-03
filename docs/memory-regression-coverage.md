# Memory Regression Coverage

This document records the connected verification target for `.grilled/issues/009-memory-regression-coverage.md`.

Automated coverage protects the typed Route Handler contracts and recursive deletion preservation logic. Connected verification protects user-visible timing and optimistic UI behavior that is better judged through the authenticated app.

## Automated Coverage

- `src/app/api/memory-route-handlers.test.ts` verifies canonical responses for creating, updating, deleting, placing, removing, and creating a note inside a box.
- `src/features/boxes/server/deletion.test.ts` verifies that recursive deletion preserves notes with placements outside the deleted subtree and deletes notes placed only inside the subtree.

## Connected Verification Checklist

Use the standard credentials and workflow from `docs/connected-ui-testing.md`.

1. Open `/today` with an authenticated test workspace.
2. Create a root box from Memory and confirm it appears immediately before any visible full Memory reload.
3. Open the new box and confirm the active editor note does not change.
4. Create a child box and a note inside the active box. Confirm the note opens as `Undefined`, the editor content is blank and focused, and the note does not appear in `Unsorted`.
5. Return to root, open `Unsorted`, and confirm box drill-down/back navigation never replaces the active editor note.
6. Open `Add to box` for the active note, remove its last placement, and confirm the note appears in `Unsorted` while the active editor remains open.
7. Add the first placement back to a box and confirm the note disappears from `Unsorted` immediately.
8. Rename a visible box and confirm the new name appears immediately. If the request fails during testing, confirm the previous name returns and a quiet error toast appears.
9. Delete a box with a child box after confirming the modal. Confirm the subtree disappears immediately, notes only inside that subtree disappear, and notes also placed outside the subtree remain visible in their remaining boxes.
10. Open a note card that was visible in the active Memory view. Confirm the editor opens that note without a visible per-click spinner in the common prefetched path.

## Rollback Verification

Use browser request blocking, an intentionally stopped dev server, or a temporary local 500 response while staying on disposable test data.

- Block `POST /api/boxes`, create a root box, and confirm the optimistic box disappears with a quiet error toast.
- Block `PATCH /api/boxes/:boxId`, rename a box, and confirm the previous name returns with a quiet error toast.
- Block `POST /api/documents/:documentId/box-placements`, add a first placement, and confirm the note returns to `Unsorted` with a quiet error toast.
- Block `DELETE /api/documents/:documentId/box-placements`, remove a last placement, and confirm the note is removed from `Unsorted` again with a quiet error toast.
- Block `DELETE /api/boxes/:boxId`, confirm deletion, and confirm the removed box subtree and notes return with a quiet error toast.

## Reporting Template

```txt
Test user:
Workspace:
Routes:
Created test data:
Passed:
Could not verify:
Notes:
```
