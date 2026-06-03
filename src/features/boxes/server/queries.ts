import { and, asc, eq, isNull, ne } from "drizzle-orm";

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
};

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
    boxes: rootBoxes,
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

  const path: BoxSummary[] = [];
  let currentBox: BoxSummary | undefined = box;

  for (let depth = 0; currentBox && depth < 12; depth += 1) {
    path.unshift(currentBox);

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
    box,
    path,
    childBoxes,
    documents: excludeBoxHomeDocumentIds(linkedDocuments, homeDocumentIds),
  };
}
