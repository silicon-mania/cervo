import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";

import type { DocumentAutosaveInput } from "../schemas";

export async function autosaveDocument({
  documentId,
  workspaceId,
  updatedBy,
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
