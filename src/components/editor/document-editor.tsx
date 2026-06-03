"use client";

import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";

import { cn } from "@/lib/utils";

import { getDocumentEditorExtensions } from "./extensions";

export type DocumentEditorValue = {
  contentJson: JSONContent;
  contentText: string;
};

type DocumentEditorProps = {
  initialContent?: JSONContent;
  placeholder?: string;
  editable?: boolean;
  autofocus?: boolean;
  className?: string;
  editorClassName?: string;
  onChange?: (value: DocumentEditorValue) => void;
};

const emptyDocumentContent: JSONContent = {
  type: "doc",
  content: [],
};

export function DocumentEditor({
  initialContent = emptyDocumentContent,
  placeholder,
  editable = true,
  autofocus = false,
  className,
  editorClassName,
  onChange,
}: DocumentEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: getDocumentEditorExtensions({ placeholder }),
    content: initialContent,
    editable,
    autofocus,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[560px] w-full px-1 py-1 text-[15px] leading-7 outline-none",
          "text-foreground caret-foreground",
          editorClassName,
        ),
        "aria-label": "Document editor",
      },
    },
    onUpdate({ editor }) {
      onChange?.({
        contentJson: editor.getJSON(),
        contentText: editor.getText(),
      });
    },
  });

  return (
    <div
      className={cn(
        "cervo-document-editor min-h-[560px] rounded-md",
        "focus-within:outline-none",
        className,
      )}>
      <EditorContent editor={editor} />
    </div>
  );
}
