export type DeletedSubtreeDocumentSplit = {
  deletedDocumentIds: string[];
  preservedDocumentIds: string[];
};

export function splitDeletedSubtreeDocumentIds({
  linkedDocumentIds,
  outsidePlacementDocumentIds,
}: {
  linkedDocumentIds: string[];
  outsidePlacementDocumentIds: string[];
}): DeletedSubtreeDocumentSplit {
  const outsidePlacements = new Set(outsidePlacementDocumentIds);
  const uniqueLinkedDocumentIds = Array.from(new Set(linkedDocumentIds));

  return {
    preservedDocumentIds: uniqueLinkedDocumentIds.filter((documentId) =>
      outsidePlacements.has(documentId),
    ),
    deletedDocumentIds: uniqueLinkedDocumentIds.filter(
      (documentId) => !outsidePlacements.has(documentId),
    ),
  };
}
