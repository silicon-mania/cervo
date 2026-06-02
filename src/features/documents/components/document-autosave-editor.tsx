"use client";

import { useState } from "react";
import { Check, LoaderCircle, Maximize2, Minimize2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

import {
  DocumentEditor,
  type DocumentEditorValue,
} from "@/components/editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useDocumentAutosave } from "../hooks/use-document-autosave";

type DocumentAutosaveEditorProps = {
  documentId: string;
  title: string;
  initialContent: JSONContent;
  placeholder?: string;
  autofocus?: boolean;
  expandable?: boolean;
  titleClassName?: string;
  sectionClassName?: string;
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

export function DocumentAutosaveEditor({
  documentId,
  title,
  initialContent,
  placeholder = "Dump your mind...",
  autofocus = false,
  expandable = false,
  titleClassName,
  sectionClassName,
}: DocumentAutosaveEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDefaultConstrained = expandable && !isExpanded;
  const { handleChange, status, errorMessage } = useDocumentAutosave({
    documentId,
  });

  const onChange = (value: DocumentEditorValue) => {
    handleChange(value);
  };

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        expandable && "min-h-[calc((100svh-3.5rem)*0.72)]",
        isDefaultConstrained &&
          "h-[calc((100svh-3.5rem)*0.72)] min-h-[440px]",
        isExpanded && "min-h-[calc(100svh-3.5rem)]",
        sectionClassName,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className={cn(
              "truncate text-3xl font-semibold tracking-normal",
              titleClassName,
            )}
          >
            {title}
          </h1>
        </div>
        <div className="flex min-h-10 shrink-0 items-center gap-2">
          <AutosaveStatus status={status} errorMessage={errorMessage} />
          {expandable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={isExpanded ? "Collapse note" : "Expand note"}
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? (
                <Minimize2 className="size-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="size-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
      <DocumentEditor
        initialContent={initialContent}
        placeholder={placeholder}
        autofocus={autofocus}
        onChange={onChange}
        className={cn(
          "min-h-0 flex-1 border-t border-border/60 pt-4",
          isDefaultConstrained && "overflow-y-auto",
          isExpanded && "overflow-visible",
        )}
        editorClassName="min-h-[420px]"
      />
    </section>
  );
}
