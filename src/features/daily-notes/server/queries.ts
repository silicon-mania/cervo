import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { documents } from "@/server/db/schema";
import { requireWorkspace } from "@/server/auth/require-workspace";
import type { JSONContent } from "@tiptap/react";

import { getAppTimeZone, getDailyNoteTitle, getDateKeyInTimeZone } from "./date";

const emptyDocumentContent = {
  type: "doc",
  content: [],
};

type DailyNote = {
  id: string;
  title: string;
  date: string;
  contentJson: JSONContent;
  contentText: string;
};

function selectDailyNoteFields() {
  return {
    id: documents.id,
    title: documents.title,
    date: documents.date,
    contentJson: documents.contentJson,
    contentText: documents.contentText,
  };
}

function assertDailyNoteDate(
  document: Omit<DailyNote, "date" | "contentJson"> & {
    date: string | null;
    contentJson: unknown;
  },
): DailyNote {
  if (!document.date) {
    throw new Error("Daily note is missing a date.");
  }

  return {
    ...document,
    date: document.date,
    contentJson: document.contentJson as JSONContent,
  };
}

export async function getTodayDocumentForEditor() {
  const { workspace } = await requireWorkspace();
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
      document: {
        ...assertDailyNoteDate(existingDocument),
        persistence: "persisted" as const,
      },
      timeZone,
      workspace,
    };
  }

  return {
    date: todayDate,
    document: {
      id: null,
      persistence: "virtual_daily" as const,
      title: getDailyNoteTitle(todayDate),
      type: "daily_note" as const,
      date: todayDate,
      contentJson: emptyDocumentContent,
      contentText: "",
    },
    timeZone,
    workspace,
  };
}
