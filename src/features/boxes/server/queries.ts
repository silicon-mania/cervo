import { and, asc, count, eq, inArray, isNull, ne, notInArray } from "drizzle-orm";

import { requireWorkspace } from "@/server/auth/require-workspace";
import { getDb } from "@/server/db/client";
import { boxes, documentBoxes, documents } from "@/server/db/schema";

export type BoxSummary = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "future" | "archived";
  parentBoxId: string | null;
  homeDocumentId: string | null;
  directNoteCount: number;
  directBoxCount: number;
};

type BoxSummaryFields = Omit<BoxSummary, "directNoteCount" | "directBoxCount">;

export type BoxDocumentSummary = {
  id: string;
  title: string;
  type: "daily_note" | "box_home" | "note";
  date: string | null;
  updatedAt: string;
};

export type RootMemoryData = {
  boxes: BoxSummary[];
  unsortedDocuments: BoxDocumentSummary[];
};

export type BoxMemoryData = {
  box: BoxSummary;
  path: BoxSummary[];
  childBoxes: BoxSummary[];
  documents: BoxDocumentSummary[];
};

export type DocumentBoxPlacementsData = {
  boxes: BoxSummary[];
  placements: BoxSummary[];
  document: BoxDocumentSummary;
};

function selectBoxSummaryFields() {
  return {
    id: boxes.id,
    name: boxes.name,
    slug: boxes.slug,
    status: boxes.status,
    parentBoxId: boxes.parentBoxId,
    homeDocumentId: boxes.homeDocumentId,
  };
}

async function attachDirectCounts(
  boxSummaries: BoxSummaryFields[],
  workspaceId: string,
): Promise<BoxSummary[]> {
  if (boxSummaries.length === 0) {
    return [];
  }

  const db = getDb();
  const boxIds = boxSummaries.map((box) => box.id);
  const homeDocumentIds = getWorkspaceHomeDocumentIds(workspaceId);
  const noteFilters = [
    eq(documentBoxes.workspaceId, workspaceId),
    inArray(documentBoxes.boxId, boxIds),
    ne(documents.type, "box_home"),
  ];
  const homeDocumentIdList = Array.from(await homeDocumentIds);

  if (homeDocumentIdList.length > 0) {
    noteFilters.push(notInArray(documents.id, homeDocumentIdList));
  }

  const [noteCounts, boxCounts] = await Promise.all([
    db
      .select({
        boxId: documentBoxes.boxId,
        directNoteCount: count(),
      })
      .from(documentBoxes)
      .innerJoin(
        documents,
        and(eq(documents.id, documentBoxes.documentId), eq(documents.workspaceId, workspaceId)),
      )
      .where(and(...noteFilters))
      .groupBy(documentBoxes.boxId),
    db
      .select({
        parentBoxId: boxes.parentBoxId,
        directBoxCount: count(),
      })
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspaceId), inArray(boxes.parentBoxId, boxIds)))
      .groupBy(boxes.parentBoxId),
  ]);

  const noteCountByBoxId = new Map(
    noteCounts.map((row) => [row.boxId, Number(row.directNoteCount)]),
  );
  const boxCountByBoxId = new Map(
    boxCounts.flatMap((row) =>
      row.parentBoxId ? [[row.parentBoxId, Number(row.directBoxCount)] as const] : [],
    ),
  );

  return boxSummaries.map((box) => ({
    ...box,
    directNoteCount: noteCountByBoxId.get(box.id) ?? 0,
    directBoxCount: boxCountByBoxId.get(box.id) ?? 0,
  }));
}

export async function getBoxSummaryForWorkspace(boxId: string, workspaceId: string) {
  const db = getDb();
  const [box] = await db
    .select(selectBoxSummaryFields())
    .from(boxes)
    .where(and(eq(boxes.workspaceId, workspaceId), eq(boxes.id, boxId)))
    .limit(1);

  if (!box) {
    throw new Error("Box not found.");
  }

  const [boxSummary] = await attachDirectCounts([box], workspaceId);

  if (!boxSummary) {
    throw new Error("Box not found.");
  }

  return boxSummary;
}

function selectDocumentSummaryFields() {
  return {
    id: documents.id,
    title: documents.title,
    type: documents.type,
    date: documents.date,
    updatedAt: documents.updatedAt,
  };
}

function serializeDocumentSummary(
  document: Omit<BoxDocumentSummary, "updatedAt"> & { updatedAt: Date },
): BoxDocumentSummary {
  return {
    ...document,
    updatedAt: document.updatedAt.toISOString(),
  };
}

async function getWorkspaceHomeDocumentIds(workspaceId: string) {
  const db = getDb();
  const homeDocuments = await db
    .select({ id: boxes.homeDocumentId })
    .from(boxes)
    .where(eq(boxes.workspaceId, workspaceId));

  return new Set(
    homeDocuments
      .map((document) => document.id)
      .filter((documentId): documentId is string => Boolean(documentId)),
  );
}

function excludeBoxHomeDocumentIds(
  documents: (Omit<BoxDocumentSummary, "updatedAt"> & { updatedAt: Date })[],
  homeDocumentIds: Set<string>,
) {
  return documents
    .filter((document) => !homeDocumentIds.has(document.id))
    .map(serializeDocumentSummary);
}

export async function getRootMemoryData(): Promise<RootMemoryData> {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [rootBoxes, unsortedDocuments, homeDocumentIds] = await Promise.all([
    db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspace.id), isNull(boxes.parentBoxId)))
      .orderBy(asc(boxes.name)),
    db
      .select(selectDocumentSummaryFields())
      .from(documents)
      .leftJoin(
        documentBoxes,
        and(
          eq(documentBoxes.documentId, documents.id),
          eq(documentBoxes.workspaceId, workspace.id),
        ),
      )
      .where(
        and(
          eq(documents.workspaceId, workspace.id),
          ne(documents.type, "box_home"),
          isNull(documentBoxes.id),
        ),
      )
      .orderBy(asc(documents.title)),
    getWorkspaceHomeDocumentIds(workspace.id),
  ]);

  return {
    boxes: await attachDirectCounts(rootBoxes, workspace.id),
    unsortedDocuments: excludeBoxHomeDocumentIds(unsortedDocuments, homeDocumentIds),
  };
}

export async function getBoxMemoryData(boxId: string): Promise<BoxMemoryData> {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [box] = await db
    .select(selectBoxSummaryFields())
    .from(boxes)
    .where(and(eq(boxes.workspaceId, workspace.id), eq(boxes.id, boxId)))
    .limit(1);

  if (!box) {
    throw new Error("Box not found.");
  }

  const [childBoxes, linkedDocuments, homeDocumentIds] = await Promise.all([
    db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspace.id), eq(boxes.parentBoxId, boxId)))
      .orderBy(asc(boxes.name)),
    db
      .select(selectDocumentSummaryFields())
      .from(documentBoxes)
      .innerJoin(
        documents,
        and(eq(documents.id, documentBoxes.documentId), eq(documents.workspaceId, workspace.id)),
      )
      .where(
        and(
          eq(documentBoxes.workspaceId, workspace.id),
          eq(documentBoxes.boxId, boxId),
          ne(documents.type, "box_home"),
        ),
      )
      .orderBy(asc(documents.title)),
    getWorkspaceHomeDocumentIds(workspace.id),
  ]);

  const [boxSummary] = await attachDirectCounts([box], workspace.id);
  const pathRows: BoxSummaryFields[] = [];
  let currentBox: BoxSummaryFields | undefined = box;

  for (let depth = 0; currentBox && depth < 12; depth += 1) {
    pathRows.unshift(currentBox);

    if (!currentBox.parentBoxId) {
      break;
    }

    const [parentBox] = await db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspace.id), eq(boxes.id, currentBox.parentBoxId)))
      .limit(1);

    currentBox = parentBox;
  }

  return {
    box: boxSummary,
    path: await attachDirectCounts(pathRows, workspace.id),
    childBoxes: await attachDirectCounts(childBoxes, workspace.id),
    documents: excludeBoxHomeDocumentIds(linkedDocuments, homeDocumentIds),
  };
}

export async function getDocumentBoxPlacementsData(
  documentId: string,
): Promise<DocumentBoxPlacementsData> {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [document] = await db
    .select(selectDocumentSummaryFields())
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspace.id),
        ne(documents.type, "box_home"),
      ),
    )
    .limit(1);

  if (!document) {
    throw new Error("Document not found.");
  }

  const [allBoxes, placedBoxes] = await Promise.all([
    db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(eq(boxes.workspaceId, workspace.id))
      .orderBy(asc(boxes.name)),
    db
      .select(selectBoxSummaryFields())
      .from(documentBoxes)
      .innerJoin(boxes, and(eq(boxes.id, documentBoxes.boxId), eq(boxes.workspaceId, workspace.id)))
      .where(
        and(eq(documentBoxes.workspaceId, workspace.id), eq(documentBoxes.documentId, documentId)),
      )
      .orderBy(asc(boxes.name)),
  ]);

  return {
    boxes: await attachDirectCounts(allBoxes, workspace.id),
    placements: await attachDirectCounts(placedBoxes, workspace.id),
    document: serializeDocumentSummary(document),
  };
}
