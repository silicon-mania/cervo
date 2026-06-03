"use client";

import type { JSONContent } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { AddToBoxPopover } from "@/features/boxes/components/add-to-box-popover";
import { BoxesExplorer } from "@/features/boxes/components/boxes-explorer";
import type { RootMemoryData } from "@/features/boxes/server/queries";
import { TodayEditor } from "@/features/daily-notes/components/today-editor";
import {
  editorDocumentQueryKey,
  fetchEditorDocument,
  getCachedEditorDocument,
  type EditorDocument,
} from "@/features/documents/client/queries";

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

export function MainWorkspace({ initialDocument, initialMemoryData }: MainWorkspaceProps) {
  return (
    <QueryProvider>
      <MainWorkspaceContent initialDocument={initialDocument} initialMemoryData={initialMemoryData} />
    </QueryProvider>
  );
}

function buildPersistedEditorDocument(document: EditorDocument): ActiveEditorDocument {
  return {
    ...document,
    clientKey: `document:${document.id}`,
    persistence: "persisted",
  };
}

function MainWorkspaceContent({ initialDocument, initialMemoryData }: MainWorkspaceProps) {
  const queryClient = useQueryClient();
  const [activeDocument, setActiveDocument] = useState(initialDocument);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);
  const [openDocumentError, setOpenDocumentError] = useState<string | null>(null);

  const handleOpenDocument = async (documentId: string) => {
    if (activeDocument.id === documentId || loadingDocumentId === documentId) {
      return;
    }

    setOpenDocumentError(null);

    const cachedDocument = getCachedEditorDocument(queryClient, documentId);
    if (cachedDocument) {
      setActiveDocument(buildPersistedEditorDocument(cachedDocument));
      return;
    }

    setLoadingDocumentId(documentId);

    try {
      const document = await queryClient.fetchQuery({
        queryKey: editorDocumentQueryKey(documentId),
        queryFn: () => fetchEditorDocument(documentId),
      });

      setActiveDocument(buildPersistedEditorDocument(document));
    } catch {
      setOpenDocumentError("Document could not open. Try again in a moment.");
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

  const handleCreatedDocument = (document: EditorDocument) => {
    let previousDocument: ActiveEditorDocument | null = null;

    setOpenDocumentError(null);
    setLoadingDocumentId(null);
    setActiveDocument((currentDocument) => {
      previousDocument = currentDocument;
      return buildPersistedEditorDocument(document);
    });

    return () => {
      setActiveDocument((currentDocument) => {
        if (currentDocument.id !== document.id || !previousDocument) {
          return currentDocument;
        }

        return previousDocument;
      });
    };
  };
  const canPlaceActiveDocument =
    activeDocument.persistence === "persisted" &&
    Boolean(activeDocument.id) &&
    activeDocument.type !== "box_home";

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
        actions={
          canPlaceActiveDocument && activeDocument.id ? (
            <AddToBoxPopover documentId={activeDocument.id} />
          ) : null
        }
        onDocumentPersisted={handleDocumentPersisted}
      />

      <BoxesExplorer
        initialMemoryData={initialMemoryData}
        openDocumentError={openDocumentError}
        loadingDocumentId={loadingDocumentId}
        onOpenDocument={handleOpenDocument}
        onCreateDocument={handleCreatedDocument}
      />
    </>
  );
}
