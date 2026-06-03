import type { QueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/react";

export type EditorDocument = {
  id: string;
  title: string;
  type: "daily_note" | "box_home" | "note";
  date: string | null;
  contentJson: JSONContent;
  contentText: string;
};

type DocumentResponse = {
  document?: EditorDocument;
  error?: string;
};

export function editorDocumentQueryKey(documentId: string) {
  return ["documents", "editor", documentId] as const;
}

export async function fetchEditorDocument(documentId: string) {
  const response = await fetch(`/api/documents/${documentId}`);
  const payload = (await response.json().catch(() => null)) as DocumentResponse | null;

  if (!response.ok || !payload?.document) {
    throw new Error(payload?.error ?? "Unable to open document.");
  }

  return payload.document;
}

export function getCachedEditorDocument(queryClient: QueryClient, documentId: string) {
  return queryClient.getQueryData<EditorDocument>(editorDocumentQueryKey(documentId));
}
