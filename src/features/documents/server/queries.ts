import type { JSONContent } from "@tiptap/react";
import { and, eq } from "drizzle-orm";

import { requireWorkspace } from "@/server/auth/require-workspace";
import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";

export type DocumentForEditor = {
  id: string;
  title: string;
  type: "daily_note" | "box_home" | "note";
  date: string | null;
  contentJson: JSONContent;
  contentText: string;
};

function selectDocumentForEditorFields() {
  return {
    id: documents.id,
    title: documents.title,
    type: documents.type,
    date: documents.date,
    contentJson: documents.contentJson,
    contentText: documents.contentText,
  };
}

function assertDocumentForEditor(
  document: Omit<DocumentForEditor, "contentJson"> & {
    contentJson: unknown;
  },
): DocumentForEditor {
  return {
    ...document,
    contentJson: document.contentJson as JSONContent,
  };
}

export async function getDocumentForEditor(documentId: string) {
  const { workspace } = await requireWorkspace();
  const db = getDb();

  const [document] = await db
    .select(selectDocumentForEditorFields())
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.workspaceId, workspace.id)),
    )
    .limit(1);

  return document ? assertDocumentForEditor(document) : null;
}
