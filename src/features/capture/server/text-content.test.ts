import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";

import { appendPlainTextToDocument, emptyCaptureDocumentContent, normalizeCaptureText } from "./text-content";

describe("capture text document content", () => {
  it("normalizes plain text without parsing task, URL, HTML, or script-looking content", () => {
    const text = normalizeCaptureText("- [ ] task\r\nhttps://example.com\r\n<strong>x</strong>\r\n<script>alert(1)</script>\r\n");

    expect(text).toBe("- [ ] task\nhttps://example.com\n<strong>x</strong>\n<script>alert(1)</script>");
  });

  it("creates paragraph JSON and searchable text for a new daily note", () => {
    const result = appendPlainTextToDocument({
      existingContentJson: emptyCaptureDocumentContent,
      existingContentText: "",
      text: "first line\nsecond line",
    });

    expect(result).toEqual({
      contentJson: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "first line" }] },
          { type: "paragraph", content: [{ type: "text", text: "second line" }] },
        ],
      },
      contentText: "first line\nsecond line",
    });
  });

  it("appends to existing daily note content with a separator without changing existing blocks", () => {
    const existingContentJson: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "already here" }] }],
    };

    const result = appendPlainTextToDocument({
      existingContentJson,
      existingContentText: "already here",
      text: "new thought",
    });

    expect(result.contentJson).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "already here" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "new thought" }] },
      ],
    });
    expect(result.contentText).toBe("already here\n\nnew thought");
  });
});
