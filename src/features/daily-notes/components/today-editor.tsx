import type { JSONContent } from "@tiptap/react";

import { DocumentAutosaveEditor } from "@/features/documents/components/document-autosave-editor";

type TodayEditorProps = {
  documentId: string;
  title: string;
  initialContent: JSONContent;
  expandable?: boolean;
};

export function TodayEditor({
  documentId,
  title,
  initialContent,
  expandable = false,
}: TodayEditorProps) {
  return (
    <DocumentAutosaveEditor
      documentId={documentId}
      title={title}
      initialContent={initialContent}
      placeholder="Dump your mind..."
      autofocus
      expandable={expandable}
    />
  );
}
