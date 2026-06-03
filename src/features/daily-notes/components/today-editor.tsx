import type { JSONContent } from "@tiptap/react";
import type { ReactNode } from "react";

import { DocumentAutosaveEditor } from "@/features/documents/components/document-autosave-editor";

type TodayEditorProps = {
  documentId?: string | null;
  dailyNoteDate?: string | null;
  title: string;
  initialContent: JSONContent;
  initialContentText: string;
  expandable?: boolean;
  actions?: ReactNode;
  onDocumentPersisted?: (documentId: string) => void;
};

export function TodayEditor({
  documentId,
  dailyNoteDate,
  title,
  initialContent,
  initialContentText,
  expandable = false,
  actions,
  onDocumentPersisted,
}: TodayEditorProps) {
  return (
    <DocumentAutosaveEditor
      documentId={documentId}
      dailyNoteDate={dailyNoteDate}
      title={title}
      initialContent={initialContent}
      initialContentText={initialContentText}
      placeholder="Dump your mind..."
      autofocus
      expandable={expandable}
      actions={actions}
      onDocumentPersisted={onDocumentPersisted}
    />
  );
}
