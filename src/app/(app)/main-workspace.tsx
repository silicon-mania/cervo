"use client";

import type { JSONContent } from "@tiptap/react";
import { useState } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { BoxesExplorer } from "@/features/boxes/components/boxes-explorer";
import type { RootMemoryData } from "@/features/boxes/server/queries";
import { TodayEditor } from "@/features/daily-notes/components/today-editor";

type ActiveEditorDocument = {
  clientKey: string;
  id: string | null;
  persistence: "persisted" | "virtual_daily";
  title: string;
  type: "daily_note" | "box_home" | "note";
  date: string | null;
  contentJson: JSONContent;
  contentText: string;
};

type MainWorkspaceProps = {
  initialDocument: ActiveEditorDocument;
  initialMemoryData: RootMemoryData;
};

type DocumentResponse = {
  document?: Omit<ActiveEditorDocument, "clientKey" | "persistence">;
  error?: string;
};

export function MainWorkspace({ initialDocument, initialMemoryData }: MainWorkspaceProps) {
  const [activeDocument, setActiveDocument] = useState(initialDocument);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);

  const handleOpenDocument = async (documentId: string) => {
    if (activeDocument.id === documentId || loadingDocumentId === documentId) {
      return;
    }

    setLoadingDocumentId(documentId);

    try {
      const response = await fetch(`/api/documents/${documentId}`);
      const payload = (await response.json().catch(() => null)) as DocumentResponse | null;

      if (!response.ok || !payload?.document) {
        throw new Error(payload?.error ?? "Unable to open document.");
      }

      setActiveDocument({
        ...payload.document,
        clientKey: `document:${payload.document.id}`,
        persistence: "persisted",
      });
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const handleDocumentPersisted = (documentId: string) => {
    setActiveDocument((currentDocument) => {
      if (currentDocument.id) {
        return currentDocument;
      }

      return {
        ...currentDocument,
        id: documentId,
        persistence: "persisted",
      };
    });
  };

  return (
    <>
      <TodayEditor
        key={activeDocument.clientKey}
        documentId={activeDocument.id}
        dailyNoteDate={activeDocument.persistence === "virtual_daily" ? activeDocument.date : null}
        title={activeDocument.title}
        initialContent={activeDocument.contentJson}
        initialContentText={activeDocument.contentText}
        expandable
        onDocumentPersisted={handleDocumentPersisted}
      />

      <QueryProvider>
        <BoxesExplorer
          initialMemoryData={initialMemoryData}
          loadingDocumentId={loadingDocumentId}
          onOpenDocument={handleOpenDocument}
        />
      </QueryProvider>
    </>
  );
}
