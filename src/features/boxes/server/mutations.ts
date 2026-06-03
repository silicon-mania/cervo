import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { boxes, documentBoxes, documents } from "@/server/db/schema";
import { requireWorkspace } from "@/server/auth/require-workspace";

import {
  boxPlacementRequestSchema,
  createBoxSchema,
  type BoxPlacementRequestInput,
  type CreateBoxInput,
  type UpdateBoxInput,
  updateBoxSchema,
} from "../schemas";
import { getBoxSummaryForWorkspace, type BoxDocumentSummary, type BoxSummary } from "./queries";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "box";
}

async function getAvailableSlug({
  baseSlug,
  workspaceId,
}: {
  baseSlug: string;
  workspaceId: string;
}) {
  const db = getDb();

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const [existingBox] = await db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspaceId), eq(boxes.slug, candidate)))
      .limit(1);

    if (!existingBox) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createBox(input: CreateBoxInput): Promise<BoxSummary> {
  const payload = createBoxSchema.parse(input);
  const { workspace } = await requireWorkspace();
  const db = getDb();

  if (payload.parentBoxId) {
    const [parentBox] = await db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.id, payload.parentBoxId), eq(boxes.workspaceId, workspace.id)))
      .limit(1);

    if (!parentBox) {
      throw new Error("Parent box not found.");
    }
  }

  const now = new Date();
  const slug = await getAvailableSlug({
    baseSlug: slugify(payload.name),
    workspaceId: workspace.id,
  });

  const [box] = await db
    .insert(boxes)
    .values({
      id: payload.id,
      workspaceId: workspace.id,
      name: payload.name,
      slug,
      parentBoxId: payload.parentBoxId ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: boxes.id,
      name: boxes.name,
      slug: boxes.slug,
      status: boxes.status,
      parentBoxId: boxes.parentBoxId,
      homeDocumentId: boxes.homeDocumentId,
    });

  if (!box) {
    throw new Error("Unable to create box.");
  }

  return getBoxSummaryForWorkspace(box.id, workspace.id);
}

export async function updateBox(boxId: string, input: UpdateBoxInput): Promise<BoxSummary> {
  const payload = updateBoxSchema.parse(input);
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [existingBox] = await db
    .select({ id: boxes.id })
    .from(boxes)
    .where(and(eq(boxes.id, boxId), eq(boxes.workspaceId, workspace.id)))
    .limit(1);

  if (!existingBox) {
    throw new Error("Box not found.");
  }

  const updates: Partial<typeof boxes.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (payload.name) {
    updates.name = payload.name;
  }

  await db.update(boxes).set(updates).where(eq(boxes.id, existingBox.id));

  return getBoxSummaryForWorkspace(existingBox.id, workspace.id);
}

type BoxPlacementMutationInput = BoxPlacementRequestInput & {
  documentId: string;
};

export type BoxPlacementMutationResult = {
  box: BoxSummary;
  document: BoxDocumentSummary;
};

function serializeDocumentSummary(document: {
  id: string;
  title: string;
  type: "daily_note" | "box_home" | "note";
  date: string | null;
  updatedAt: Date;
}): BoxDocumentSummary {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    date: document.date,
    updatedAt: document.updatedAt.toISOString(),
  };
}

async function getPlacementMutationSubjects({
  documentId,
  boxId,
  workspaceId,
}: BoxPlacementMutationInput & {
  workspaceId: string;
}) {
  const db = getDb();

  const [[document], [box]] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        date: documents.date,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.workspaceId, workspaceId),
          ne(documents.type, "box_home"),
        ),
      )
      .limit(1),
    db
      .select({
        id: boxes.id,
        name: boxes.name,
        slug: boxes.slug,
        status: boxes.status,
        parentBoxId: boxes.parentBoxId,
        homeDocumentId: boxes.homeDocumentId,
      })
      .from(boxes)
      .where(and(eq(boxes.id, boxId), eq(boxes.workspaceId, workspaceId)))
      .limit(1),
  ]);

  if (!document) {
    throw new Error("Document not found.");
  }

  if (!box) {
    throw new Error("Box not found.");
  }

  return {
    document: serializeDocumentSummary(document),
    box: await getBoxSummaryForWorkspace(box.id, workspaceId),
  };
}

export async function placeDocumentInBox(
  input: BoxPlacementMutationInput,
): Promise<BoxPlacementMutationResult> {
  const payload = boxPlacementRequestSchema.parse({ boxId: input.boxId });
  const { clerkUserId, workspace } = await requireWorkspace();
  const db = getDb();
  const subjects = await getPlacementMutationSubjects({
    documentId: input.documentId,
    boxId: payload.boxId,
    workspaceId: workspace.id,
  });

  await db
    .insert(documentBoxes)
    .values({
      workspaceId: workspace.id,
      documentId: input.documentId,
      boxId: payload.boxId,
      createdBy: clerkUserId,
      createdAt: new Date(),
    })
    .onConflictDoNothing({
      target: [documentBoxes.documentId, documentBoxes.boxId],
    });

  return {
    document: subjects.document,
    box: await getBoxSummaryForWorkspace(payload.boxId, workspace.id),
  };
}

export async function removeDocumentFromBox(
  input: BoxPlacementMutationInput,
): Promise<BoxPlacementMutationResult> {
  const payload = boxPlacementRequestSchema.parse({ boxId: input.boxId });
  const { workspace } = await requireWorkspace();
  const db = getDb();
  const subjects = await getPlacementMutationSubjects({
    documentId: input.documentId,
    boxId: payload.boxId,
    workspaceId: workspace.id,
  });

  await db
    .delete(documentBoxes)
    .where(
      and(
        eq(documentBoxes.workspaceId, workspace.id),
        eq(documentBoxes.documentId, input.documentId),
        eq(documentBoxes.boxId, payload.boxId),
      ),
    );

  return {
    document: subjects.document,
    box: await getBoxSummaryForWorkspace(payload.boxId, workspace.id),
  };
}
