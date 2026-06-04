import type { JSONContent } from "@tiptap/react";

export const emptyCaptureDocumentContent: JSONContent = {
  type: "doc",
  content: [],
};

function hasDocumentBlocks(contentJson: JSONContent) {
  return Array.isArray(contentJson.content) && contentJson.content.length > 0;
}

function textToParagraphs(text: string): JSONContent[] {
  return text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : undefined,
  }));
}

export function normalizeCaptureText(text: string) {
  return text.replace(/\r\n?/g, "\n").trimEnd();
}

export function appendPlainTextToDocument({
  existingContentJson,
  existingContentText,
  text,
}: {
  existingContentJson: JSONContent;
  existingContentText: string;
  text: string;
}) {
  const normalizedText = normalizeCaptureText(text);
  const existingBlocks = Array.isArray(existingContentJson.content)
    ? existingContentJson.content
    : [];
  const hasExistingContent = hasDocumentBlocks(existingContentJson) || existingContentText.length > 0;

  return {
    contentJson: {
      type: "doc",
      content: [
        ...existingBlocks,
        ...(hasExistingContent ? [{ type: "paragraph" }] : []),
        ...textToParagraphs(normalizedText),
      ],
    },
    contentText: `${existingContentText}${existingContentText ? "\n\n" : ""}${normalizedText}`,
  } satisfies { contentJson: JSONContent; contentText: string };
}
