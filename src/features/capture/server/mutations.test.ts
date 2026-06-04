import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JSONContent } from "@tiptap/react";

import { uploadSupabaseStorageObject } from "@/server/storage/supabase";
import { getDb } from "@/server/db/client";
import { attachments, documents } from "@/server/db/schema";

import { appendCaptureToCurrentDailyNote } from "./mutations";

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/storage/supabase", () => ({
  uploadSupabaseStorageObject: vi.fn(async ({ path }: { path: string }) => ({ path })),
}));

const workspaceId = "11111111-1111-4111-8111-111111111111";
const dailyNoteId = "22222222-2222-4222-8222-222222222222";
const attachmentId = "33333333-3333-4333-8333-333333333333";
const captureId = "44444444-4444-4444-8444-444444444444";

function imageFile({
  name = "capture.png",
  type = "image/png",
  size = 12,
}: {
  name?: string;
  type?: string;
  size?: number;
} = {}) {
  return {
    name,
    type,
    size,
    file: new Blob(["image-bytes"], { type }),
  };
}

function createDbMock({
  selectResult,
  insertResults,
  updateResults = [[{ id: dailyNoteId }]],
}: {
  selectResult: unknown[];
  insertResults: unknown[][];
  updateResults?: unknown[][];
}) {
  const insertedValues: Array<{ table: unknown; values: unknown }> = [];
  const updateSets: unknown[] = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => selectResult),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => {
        insertedValues.push({ table, values });

        return {
          returning: vi.fn(async () => insertResults.shift() ?? []),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: unknown) => {
        updateSets.push(values);

        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => updateResults.shift() ?? []),
          })),
        };
      }),
    })),
  };

  vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

  return { db, insertedValues, updateSets };
}

describe("appendCaptureToCurrentDailyNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a daily note owner and attachment rows for image-only captures without document text", async () => {
    const { insertedValues, updateSets } = createDbMock({
      selectResult: [],
      insertResults: [
        [
          {
            id: dailyNoteId,
            title: "Today",
            contentJson: { type: "doc", content: [] },
            contentText: "",
          },
        ],
        [{ id: attachmentId }],
      ],
    });

    const result = await appendCaptureToCurrentDailyNote({
      workspaceId,
      clerkUserId: "user_123",
      captureId,
      text: "",
      images: [imageFile()],
    });

    expect(result).toEqual({
      ok: true,
      dailyNoteId,
      attachmentIds: [attachmentId],
      attachmentCount: 1,
    });
    expect(insertedValues[0]).toMatchObject({
      table: documents,
      values: {
        workspaceId,
        type: "daily_note",
        contentJson: { type: "doc", content: [] },
        contentText: "",
      },
    });
    expect(updateSets[0]).not.toHaveProperty("contentJson");
    expect(uploadSupabaseStorageObject).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: "image/png",
        path: expect.stringContaining(`${workspaceId}/documents/${dailyNoteId}/${captureId}/`),
      }),
    );
    expect(insertedValues[1]).toMatchObject({
      table: attachments,
      values: [
        expect.objectContaining({
          workspaceId,
          sourceType: "document",
          sourceId: dailyNoteId,
          fileName: "capture.png",
          mimeType: "image/png",
          size: 12,
        }),
      ],
    });
  });

  it("appends mixed text and images without inserting image nodes into document content", async () => {
    const existingContentJson: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "already here" }] }],
    };
    const { insertedValues, updateSets } = createDbMock({
      selectResult: [
        {
          id: dailyNoteId,
          title: "Today",
          contentJson: existingContentJson,
          contentText: "already here",
        },
      ],
      insertResults: [[{ id: attachmentId }]],
      updateResults: [[{ id: dailyNoteId }]],
    });

    const result = await appendCaptureToCurrentDailyNote({
      workspaceId,
      clerkUserId: "user_123",
      captureId,
      text: "new thought",
      images: [imageFile({ name: "diagram.webp", type: "image/webp" })],
    });

    expect(result.attachmentCount).toBe(1);
    expect(updateSets[0]).toMatchObject({
      contentText: "already here\n\nnew thought",
      contentJson: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "already here" }] },
          { type: "paragraph" },
          { type: "paragraph", content: [{ type: "text", text: "new thought" }] },
        ],
      },
    });
    expect(JSON.stringify(updateSets[0])).not.toContain("image");
    expect(insertedValues[0]).toMatchObject({
      table: attachments,
      values: [expect.objectContaining({ fileName: "diagram.webp", sourceId: dailyNoteId })],
    });
  });

  it("rejects invalid images before touching the database or storage", async () => {
    await expect(
      appendCaptureToCurrentDailyNote({
        workspaceId,
        clerkUserId: "user_123",
        captureId,
        text: "",
        images: [imageFile({ name: "notes.txt", type: "text/plain" })],
      }),
    ).rejects.toThrow("Only PNG, JPEG, GIF, or WebP images can be appended.");

    expect(getDb).not.toHaveBeenCalled();
    expect(uploadSupabaseStorageObject).not.toHaveBeenCalled();
  });
});
