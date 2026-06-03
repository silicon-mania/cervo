import { describe, expect, it } from "vitest";

import { splitDeletedSubtreeDocumentIds } from "./deletion";

describe("splitDeletedSubtreeDocumentIds", () => {
  it("preserves notes with placements outside the deleted subtree", () => {
    const result = splitDeletedSubtreeDocumentIds({
      linkedDocumentIds: ["shared-note", "subtree-only-note"],
      outsidePlacementDocumentIds: ["shared-note"],
    });

    expect(result).toEqual({
      preservedDocumentIds: ["shared-note"],
      deletedDocumentIds: ["subtree-only-note"],
    });
  });

  it("hard-deletes notes placed only inside the deleted subtree", () => {
    const result = splitDeletedSubtreeDocumentIds({
      linkedDocumentIds: ["child-note", "nested-note"],
      outsidePlacementDocumentIds: [],
    });

    expect(result).toEqual({
      preservedDocumentIds: [],
      deletedDocumentIds: ["child-note", "nested-note"],
    });
  });

  it("deduplicates repeated subtree placements before classifying documents", () => {
    const result = splitDeletedSubtreeDocumentIds({
      linkedDocumentIds: ["shared-note", "shared-note", "subtree-only-note"],
      outsidePlacementDocumentIds: ["shared-note"],
    });

    expect(result).toEqual({
      preservedDocumentIds: ["shared-note"],
      deletedDocumentIds: ["subtree-only-note"],
    });
  });
});
