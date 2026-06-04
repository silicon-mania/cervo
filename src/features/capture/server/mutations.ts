import { and, eq } from "drizzle-orm";
import type { JSONContent } from "@tiptap/react";

import { getAppTimeZone, getDailyNoteTitle, getDateKeyInTimeZone } from "@/features/daily-notes/server/date";
import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";

import {
  appendPlainTextToDocument,
  emptyCaptureDocumentContent,
  normalizeCaptureText,
} from "./text-content";

export type CaptureAppendResult = {
  ok: true;
  dailyNoteId: string;
};

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

export async function appendCaptureTextToCurrentDailyNote({
  workspaceId,
  clerkUserId,
  captureId,
  text,
}: {
  workspaceId: string;
  clerkUserId: string;
  captureId: string;
  text: string;
}): Promise<CaptureAppendResult> {
  void captureId;

  const normalizedText = normalizeCaptureText(text);

  if (!normalizedText) {
    throw new Error("Capture text is required.");
  }

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

  const nextContent = appendPlainTextToDocument({
    existingContentJson: existingDailyNote?.contentJson ?? emptyCaptureDocumentContent,
    existingContentText: existingDailyNote?.contentText ?? "",
    text: normalizedText,
  });

  if (existingDailyNote) {
    const [updatedDocument] = await db
      .update(documents)
      .set({
        contentJson: nextContent.contentJson,
        contentText: nextContent.contentText,
        updatedBy: clerkUserId,
        updatedAt: now,
      })
      .where(and(eq(documents.id, existingDailyNote.id), eq(documents.workspaceId, workspaceId)))
      .returning({ id: documents.id });

    if (!updatedDocument) {
      throw new Error("Unable to append capture.");
    }

    return {
      ok: true,
      dailyNoteId: updatedDocument.id,
    };
  }

  const [createdDocument] = await db
    .insert(documents)
    .values({
      workspaceId,
      type: "daily_note",
      date: todayDate,
      title: getDailyNoteTitle(todayDate),
      contentJson: nextContent.contentJson,
      contentText: nextContent.contentText,
      createdBy: clerkUserId,
      updatedBy: clerkUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: documents.id });

  if (!createdDocument) {
    throw new Error("Unable to create daily note.");
  }

  return {
    ok: true,
    dailyNoteId: createdDocument.id,
  };
}
