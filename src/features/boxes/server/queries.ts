import type { JSONContent } from "@tiptap/react";
import { and, asc, count, eq, isNull, ne } from "drizzle-orm";

import { requireWorkspace } from "@/server/auth/require-workspace";
import { getDb } from "@/server/db/client";
import { boxes, documentBoxes, documents } from "@/server/db/schema";

const emptyDocumentContent = {
  type: "doc",
  content: [],
};

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

export type BoxHomeDocument = BoxDocumentSummary & {
  contentJson: JSONContent;
  contentText: string;
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

function selectHomeDocumentFields() {
  return {
    ...selectDocumentSummaryFields(),
    contentJson: documents.contentJson,
    contentText: documents.contentText,
  };
}

function assertHomeDocument(
  document: Omit<BoxHomeDocument, "contentJson"> & { contentJson: unknown },
): BoxHomeDocument {
  return {
    ...document,
    contentJson: document.contentJson as JSONContent,
  };
}

export async function getTopLevelBoxes() {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  return db
    .select(selectBoxSummaryFields())
    .from(boxes)
    .where(and(eq(boxes.workspaceId, workspace.id), isNull(boxes.parentBoxId)))
    .orderBy(asc(boxes.name));
}

export async function getUnsortedNoteCount() {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [result] = await db
    .select({ value: count() })
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
    );

  return Number(result?.value ?? 0);
}

export async function getUnsortedDocuments() {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  return db
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
    .orderBy(asc(documents.title));
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
        and(
          eq(documents.id, documentBoxes.documentId),
          eq(documents.workspaceId, workspace.id),
        ),
      )
      .where(
        and(
          eq(documentBoxes.workspaceId, workspace.id),
          ne(documents.type, "box_home"),
        ),
      )
      .orderBy(asc(documents.title)),
  ]);

  return {
    boxes: allBoxes,
    unsortedDocuments,
    linkedDocuments,
  };
}

async function getBreadcrumbs({
  box,
  workspaceId,
}: {
  box: BoxSummary;
  workspaceId: string;
}) {
  const db = getDb();
  const breadcrumbs: BoxSummary[] = [box];
  let parentBoxId = box.parentBoxId;

  for (let depth = 0; parentBoxId && depth < 12; depth += 1) {
    const [parentBox] = await db
      .select(selectBoxSummaryFields())
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspaceId), eq(boxes.id, parentBoxId)))
      .limit(1);

    if (!parentBox) {
      break;
    }

    breadcrumbs.unshift(parentBox);
    parentBoxId = parentBox.parentBoxId;
  }

  return breadcrumbs;
}

async function ensureBoxHomeDocument({
  box,
  clerkUserId,
  workspaceId,
}: {
  box: BoxSummary;
  clerkUserId: string;
  workspaceId: string;
}) {
  const db = getDb();

  if (box.homeDocumentId) {
    const [existingHomeDocument] = await db
      .select(selectHomeDocumentFields())
      .from(documents)
      .where(
        and(
          eq(documents.id, box.homeDocumentId),
          eq(documents.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (existingHomeDocument) {
      return assertHomeDocument(existingHomeDocument);
    }
  }

  const now = new Date();

  return db.transaction(async (tx) => {
    const [homeDocument] = await tx
      .insert(documents)
      .values({
        workspaceId,
        type: "box_home",
        title: box.name,
        contentJson: emptyDocumentContent,
        contentText: "",
        createdBy: clerkUserId,
        updatedBy: clerkUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning(selectHomeDocumentFields());

    if (!homeDocument) {
      throw new Error("Unable to create box home document.");
    }

    await tx
      .update(boxes)
      .set({
        homeDocumentId: homeDocument.id,
        updatedAt: now,
      })
      .where(eq(boxes.id, box.id));

    return assertHomeDocument(homeDocument);
  });
}

export async function getBoxPageData(boxId: string) {
  const { clerkUserId, workspace } = await requireWorkspace();
  const db = getDb();

  const [box] = await db
    .select(selectBoxSummaryFields())
    .from(boxes)
    .where(and(eq(boxes.workspaceId, workspace.id), eq(boxes.id, boxId)))
    .limit(1);

  if (!box) {
    return null;
  }

  const [homeDocument, childBoxes, linkedDocuments, breadcrumbs] =
    await Promise.all([
      ensureBoxHomeDocument({
        box,
        clerkUserId,
        workspaceId: workspace.id,
      }),
      db
        .select(selectBoxSummaryFields())
        .from(boxes)
        .where(
          and(eq(boxes.workspaceId, workspace.id), eq(boxes.parentBoxId, box.id)),
        )
        .orderBy(asc(boxes.name)),
      db
        .select(selectDocumentSummaryFields())
        .from(documentBoxes)
        .innerJoin(
          documents,
          and(
            eq(documents.id, documentBoxes.documentId),
            eq(documents.workspaceId, workspace.id),
          ),
        )
        .where(
          and(
            eq(documentBoxes.workspaceId, workspace.id),
            eq(documentBoxes.boxId, box.id),
            ne(documents.type, "box_home"),
          ),
        )
        .orderBy(asc(documents.title)),
      getBreadcrumbs({ box, workspaceId: workspace.id }),
    ]);

  return {
    box,
    homeDocument,
    childBoxes,
    linkedDocuments,
    breadcrumbs,
  };
}
