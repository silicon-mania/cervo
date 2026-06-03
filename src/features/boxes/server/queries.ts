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
  updatedAt: Date;
};

export type LinkedBoxDocumentSummary = BoxDocumentSummary & {
  boxId: string;
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

export async function getMainBoxesData() {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [allBoxes, unsortedDocuments, linkedDocuments] = await Promise.all([
    db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(eq(boxes.workspaceId, workspace.id))
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
    db
      .select({
        ...selectDocumentSummaryFields(),
        boxId: documentBoxes.boxId,
      })
      .from(documentBoxes)
      .innerJoin(
        documents,
        and(eq(documents.id, documentBoxes.documentId), eq(documents.workspaceId, workspace.id)),
      )
      .where(and(eq(documentBoxes.workspaceId, workspace.id), ne(documents.type, "box_home")))
      .orderBy(asc(documents.title)),
  ]);

  return {
    boxes: allBoxes,
    unsortedDocuments,
    linkedDocuments,
  };
}
