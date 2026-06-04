import { and, eq } from "drizzle-orm";
import type { JSONContent } from "@tiptap/react";

import { getAppTimeZone, getDailyNoteTitle, getDateKeyInTimeZone } from "@/features/daily-notes/server/date";
import { getDb } from "@/server/db/client";
import { attachments, documents } from "@/server/db/schema";

import {
  type CaptureImageFile,
  storeCaptureImages,
  validateCaptureImageFile,
} from "./image-attachments";
import {
  appendPlainTextToDocument,
  emptyCaptureDocumentContent,
  normalizeCaptureText,
} from "./text-content";

export type CaptureAppendResult = {
  ok: true;
  dailyNoteId: string;
  attachmentIds: string[];
  attachmentCount: number;
};

export type { CaptureImageFile };

type DailyNoteForAppend = {
  id: string;
  title: string;
  contentJson: JSONContent;
  contentText: string;
};

function selectAppendDailyNoteFields() {
  return {
    id: documents.id,
    title: documents.title,
    contentJson: documents.contentJson,
    contentText: documents.contentText,
  };
}

async function getCurrentDailyNoteForAppend({
  workspaceId,
  clerkUserId,
}: {
  workspaceId: string;
  clerkUserId: string;
}) {
  const db = getDb();
  const now = new Date();
  const timeZone = getAppTimeZone();
  const todayDate = getDateKeyInTimeZone({ timeZone });

  const [existingDocument] = await db
    .select(selectAppendDailyNoteFields())
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, workspaceId),
        eq(documents.type, "daily_note"),
        eq(documents.date, todayDate),
      ),
    )
    .limit(1);

  const existingDailyNote: DailyNoteForAppend | null = existingDocument
    ? {
        id: existingDocument.id,
        title: existingDocument.title,
        contentJson: existingDocument.contentJson as JSONContent,
        contentText: existingDocument.contentText,
      }
    : null;

  if (existingDailyNote) {
    return { dailyNote: existingDailyNote, created: false };
  }

  const [createdDocument] = await db
    .insert(documents)
    .values({
      workspaceId,
      type: "daily_note",
      date: todayDate,
      title: getDailyNoteTitle(todayDate),
      contentJson: emptyCaptureDocumentContent,
      contentText: "",
      createdBy: clerkUserId,
      updatedBy: clerkUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning(selectAppendDailyNoteFields());

  if (!createdDocument) {
    throw new Error("Unable to create daily note.");
  }

  return {
    dailyNote: {
      id: createdDocument.id,
      title: createdDocument.title,
      contentJson: createdDocument.contentJson as JSONContent,
      contentText: createdDocument.contentText,
    },
    created: true,
  };
}

async function appendTextToDailyNote({
  dailyNote,
  workspaceId,
  clerkUserId,
  text,
}: {
  dailyNote: DailyNoteForAppend;
  workspaceId: string;
  clerkUserId: string;
  text: string;
}) {
  const db = getDb();
  const now = new Date();
  const nextContent = appendPlainTextToDocument({
    existingContentJson: dailyNote.contentJson,
    existingContentText: dailyNote.contentText,
    text,
  });

  const [updatedDocument] = await db
    .update(documents)
    .set({
      contentJson: nextContent.contentJson,
      contentText: nextContent.contentText,
      updatedBy: clerkUserId,
      updatedAt: now,
    })
    .where(and(eq(documents.id, dailyNote.id), eq(documents.workspaceId, workspaceId)))
    .returning({ id: documents.id });

  if (!updatedDocument) {
    throw new Error("Unable to append capture.");
  }

  return updatedDocument.id;
}

export async function appendCaptureToCurrentDailyNote({
  workspaceId,
  clerkUserId,
  captureId,
  text,
  images = [],
}: {
  workspaceId: string;
  clerkUserId: string;
  captureId: string;
  text: string;
  images?: CaptureImageFile[];
}): Promise<CaptureAppendResult> {
  const normalizedText = normalizeCaptureText(text);

  if (!normalizedText && images.length === 0) {
    throw new Error("Capture text or image is required.");
  }

  images.forEach(validateCaptureImageFile);

  const { dailyNote } = await getCurrentDailyNoteForAppend({
    workspaceId,
    clerkUserId,
  });

  if (normalizedText) {
    await appendTextToDailyNote({
      dailyNote,
      workspaceId,
      clerkUserId,
      text: normalizedText,
    });
  } else {
    await getDb()
      .update(documents)
      .set({ updatedBy: clerkUserId, updatedAt: new Date() })
      .where(and(eq(documents.id, dailyNote.id), eq(documents.workspaceId, workspaceId)));
  }

  const storedImages = await storeCaptureImages({
    workspaceId,
    documentId: dailyNote.id,
    captureId,
    images,
  });

  const insertedAttachments =
    storedImages.length > 0
      ? await getDb()
          .insert(attachments)
          .values(
            storedImages.map((image) => ({
              workspaceId,
              sourceType: "document" as const,
              sourceId: dailyNote.id,
              storagePath: image.storagePath,
              fileName: image.fileName,
              mimeType: image.mimeType,
              size: image.size,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          )
          .returning({ id: attachments.id })
      : [];

  return {
    ok: true,
    dailyNoteId: dailyNote.id,
    attachmentIds: insertedAttachments.map((attachment) => attachment.id),
    attachmentCount: insertedAttachments.length,
  };
}
