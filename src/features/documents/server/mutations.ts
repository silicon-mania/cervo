import { and, eq, sql } from "drizzle-orm";
import type { JSONContent } from "@tiptap/react";

import { requireWorkspace } from "@/server/auth/require-workspace";
import { getDb } from "@/server/db/client";
import { boxes, documentBoxes, documents } from "@/server/db/schema";
import type { BoxDocumentSummary } from "@/features/boxes/server/queries";

import { createNoteInputSchema, type CreateNoteInput, type DocumentAutosaveInput } from "../schemas";
import type { DocumentForEditor } from "./queries";

const blankNoteContent: JSONContent = {
  type: "doc",
  content: [],
};

export type CreatedNote = {
  document: DocumentForEditor;
  summary: BoxDocumentSummary;
  boxId: string | null;
};

export async function autosaveDocument({
  documentId,
  workspaceId,
  updatedBy,
  title,
  contentJson,
  contentText,
}: DocumentAutosaveInput & {
  documentId: string;
  workspaceId: string;
  updatedBy: string;
}) {
  const db = getDb();
  const now = new Date();

  const [document] = await db
    .update(documents)
    .set({
      title,
      contentJson,
      contentText,
      updatedBy,
      updatedAt: now,
    })
    .where(and(eq(documents.id, documentId), eq(documents.workspaceId, workspaceId)))
    .returning({
      id: documents.id,
      updatedAt: documents.updatedAt,
    });

  return document ?? null;
}

export async function autosaveDailyDocument({
  date,
  workspaceId,
  clerkUserId,
  title,
  contentJson,
  contentText,
}: DocumentAutosaveInput & {
  date: string;
  workspaceId: string;
  clerkUserId: string;
}) {
  const db = getDb();
  const now = new Date();

  const [document] = await db
    .insert(documents)
    .values({
      workspaceId,
      type: "daily_note",
      date,
      title,
      contentJson,
      contentText,
      createdBy: clerkUserId,
      updatedBy: clerkUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [documents.workspaceId, documents.date],
      targetWhere: sql`${documents.type} = 'daily_note'`,
      set: {
        title,
        contentJson,
        contentText,
        updatedBy: clerkUserId,
        updatedAt: now,
      },
    })
    .returning({
      id: documents.id,
      updatedAt: documents.updatedAt,
    });

  return document ?? null;
}

export async function createBlankNote(input: CreateNoteInput): Promise<CreatedNote> {
  const payload = createNoteInputSchema.parse(input);
  const { clerkUserId, workspace } = await requireWorkspace();
  const db = getDb();
  const now = new Date();
  const boxId = payload.boxId ?? null;

  return db.transaction(async (tx) => {
    if (boxId) {
      const [box] = await tx
        .select({ id: boxes.id })
        .from(boxes)
        .where(and(eq(boxes.id, boxId), eq(boxes.workspaceId, workspace.id)))
        .limit(1);

      if (!box) {
        throw new Error("Box not found.");
      }
    }

    const [document] = await tx
      .insert(documents)
      .values({
        id: payload.id,
        workspaceId: workspace.id,
        type: "note",
        date: null,
        title: "Undefined",
        contentJson: blankNoteContent,
        contentText: "",
        createdBy: clerkUserId,
        updatedBy: clerkUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        date: documents.date,
        contentJson: documents.contentJson,
        contentText: documents.contentText,
        updatedAt: documents.updatedAt,
      });

    if (!document) {
      throw new Error("Unable to create note.");
    }

    if (boxId) {
      await tx.insert(documentBoxes).values({
        workspaceId: workspace.id,
        documentId: document.id,
        boxId,
        createdBy: clerkUserId,
        createdAt: now,
      });
    }

    return {
      document: {
        id: document.id,
        title: document.title,
        type: document.type,
        date: document.date,
        contentJson: document.contentJson as JSONContent,
        contentText: document.contentText,
      },
      summary: {
        id: document.id,
        title: document.title,
        type: document.type,
        date: document.date,
        updatedAt: document.updatedAt.toISOString(),
      },
      boxId,
    };
  });
}
