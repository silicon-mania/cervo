"use client";

import { Check, LoaderCircle } from "lucide-react";

import {
  DocumentEditor,
  type DocumentEditorValue,
} from "@/components/editor";
import { cn } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";

import { useDocumentAutosave } from "../hooks/use-document-autosave";

type TodayEditorProps = {
  documentId: string;
  title: string;
  initialContent: JSONContent;
};

function AutosaveStatus({
  status,
  errorMessage,
}: {
  status: "idle" | "saving" | "saved" | "error";
  errorMessage: string | null;
}) {
  if (status === "idle") {
    return null;
  }

  if (status === "saving") {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        <span>Saving</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-destructive">
        <span>{errorMessage ?? "Couldn’t save changes."}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        "transition-opacity",
      )}
    >
      <Check className="h-3.5 w-3.5 opacity-50" />
      <span className="opacity-70">Saved</span>
    </div>
  );
}

export function TodayEditor({
  documentId,
  title,
  initialContent,
}: TodayEditorProps) {
  const { handleChange, status, errorMessage } = useDocumentAutosave({
    documentId,
  });

  const onChange = (value: DocumentEditorValue) => {
    handleChange(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
        <div className="flex min-h-10 shrink-0 items-center">
          <AutosaveStatus status={status} errorMessage={errorMessage} />
        </div>
      </div>
      <DocumentEditor
        initialContent={initialContent}
        placeholder="Dump your mind..."
        autofocus
        onChange={onChange}
      />
    </div>
  );
}
