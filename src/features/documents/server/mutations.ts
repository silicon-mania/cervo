import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";

import type { DocumentAutosaveInput } from "../schemas";

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
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.workspaceId, workspaceId),
      ),
    )
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
