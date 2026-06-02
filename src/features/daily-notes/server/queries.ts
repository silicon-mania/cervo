import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";
import { requireWorkspace } from "@/server/auth/require-workspace";

import {
  getAppTimeZone,
  getDailyNoteTitle,
  getDateKeyInTimeZone,
} from "./date";

const emptyDocumentContent = {
  type: "doc",
  content: [],
};

export type DailyNote = {
  id: string;
  title: string;
  date: string;
  contentText: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

function selectDailyNoteFields() {
  return {
    id: documents.id,
    title: documents.title,
    date: documents.date,
    contentText: documents.contentText,
    createdAt: documents.createdAt,
    updatedAt: documents.updatedAt,
    createdBy: documents.createdBy,
    updatedBy: documents.updatedBy,
  };
}

function assertDailyNoteDate(
  document: Omit<DailyNote, "date"> & { date: string | null },
): DailyNote {
  if (!document.date) {
    throw new Error("Daily note is missing a date.");
  }

  return {
    ...document,
    date: document.date,
  };
}

export async function getOrCreateTodayDocument() {
  const { clerkUserId, workspace } = await requireWorkspace();
  const db = getDb();
  const timeZone = getAppTimeZone();
  const todayDate = getDateKeyInTimeZone({ timeZone });

  const [existingDocument] = await db
    .select(selectDailyNoteFields())
    .from(documents)
    .where(
      and(
        eq(documents.workspaceId, workspace.id),
        eq(documents.type, "daily_note"),
        eq(documents.date, todayDate),
      ),
    )
    .limit(1);

  if (existingDocument) {
    return {
      date: todayDate,
      document: assertDailyNoteDate(existingDocument),
      timeZone,
      workspace,
    };
  }

  const now = new Date();
  const title = getDailyNoteTitle(todayDate);

  const [document] = await db
    .insert(documents)
    .values({
      workspaceId: workspace.id,
      type: "daily_note",
      date: todayDate,
      title,
      contentJson: emptyDocumentContent,
      contentText: "",
      createdBy: clerkUserId,
      updatedBy: clerkUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [documents.workspaceId, documents.date],
      targetWhere: sql`${documents.type} = 'daily_note'`,
      set: {
        updatedBy: clerkUserId,
        updatedAt: now,
      },
    })
    .returning(selectDailyNoteFields());

  if (!document) {
    throw new Error("Unable to create today's daily note.");
  }

  return {
    date: todayDate,
    document: assertDailyNoteDate(document),
    timeZone,
    workspace,
  };
}
