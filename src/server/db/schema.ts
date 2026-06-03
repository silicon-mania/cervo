import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const documentType = pgEnum("document_type", ["daily_note", "box_home", "note"]);
export const boxStatus = pgEnum("box_status", ["active", "future", "archived"]);
export const taskStatus = pgEnum("task_status", ["todo", "done"]);
export const attachmentSourceType = pgEnum("attachment_source_type", [
  "document",
  "box",
  "task",
  "person",
]);
export const inboxSource = pgEnum("inbox_source", ["mock", "gmail"]);
export const eventSource = pgEnum("event_source", ["mock", "google_calendar"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkOrgId: text("clerk_org_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug"),
    createdBy: text("created_by").notNull(),
    ...timestamps,
  },
  (table) => ({
    clerkOrgIdIdx: uniqueIndex("workspaces_clerk_org_id_idx").on(table.clerkOrgId),
  }),
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    role: text("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex("workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.clerkUserId,
    ),
  }),
);

export const boxes = pgTable(
  "boxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: boxStatus("status").notNull().default("active"),
    parentBoxId: uuid("parent_box_id").references((): AnyPgColumn => boxes.id, {
      onDelete: "set null",
    }),
    homeDocumentId: uuid("home_document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    workspaceSlugIdx: uniqueIndex("boxes_workspace_slug_idx").on(table.workspaceId, table.slug),
    workspaceStatusIdx: index("boxes_workspace_status_idx").on(table.workspaceId, table.status),
    workspaceParentIdx: index("boxes_workspace_parent_idx").on(
      table.workspaceId,
      table.parentBoxId,
    ),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: documentType("type").notNull(),
    date: text("date"),
    title: text("title").notNull(),
    contentJson: jsonb("content_json").notNull().default({}),
    contentText: text("content_text").notNull().default(""),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    ...timestamps,
  },
  (table) => ({
    dailyNoteDateRequiredChk: check(
      "documents_daily_note_date_required_chk",
      sql`${table.type} <> 'daily_note' OR ${table.date} IS NOT NULL`,
    ),
    dailyNoteWorkspaceDateIdx: uniqueIndex("documents_daily_note_workspace_date_idx")
      .on(table.workspaceId, table.date)
      .where(sql`${table.type} = 'daily_note'`),
    workspaceTypeIdx: index("documents_workspace_type_idx").on(table.workspaceId, table.type),
    workspaceDateIdx: index("documents_workspace_date_idx").on(table.workspaceId, table.date),
  }),
);

export const documentBoxes = pgTable(
  "document_boxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    boxId: uuid("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "cascade" }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    documentBoxIdx: uniqueIndex("document_boxes_document_box_idx").on(
      table.documentId,
      table.boxId,
    ),
    workspaceBoxIdx: index("document_boxes_workspace_box_idx").on(table.workspaceId, table.boxId),
    workspaceDocumentIdx: index("document_boxes_workspace_document_idx").on(
      table.workspaceId,
      table.documentId,
    ),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceDocumentId: uuid("source_document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    boxId: uuid("box_id").references(() => boxes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    status: taskStatus("status").notNull().default("todo"),
    dueDate: text("due_date"),
    ...timestamps,
  },
  (table) => ({
    workspaceStatusIdx: index("tasks_workspace_status_idx").on(table.workspaceId, table.status),
  }),
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    role: text("role"),
    email: text("email"),
    notes: text("notes").notNull().default(""),
    externalSource: text("external_source"),
    externalId: text("external_id"),
    ...timestamps,
  },
  (table) => ({
    workspaceNameIdx: index("people_workspace_name_idx").on(table.workspaceId, table.name),
  }),
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    source: eventSource("source").notNull().default("mock"),
    ...timestamps,
  },
  (table) => ({
    workspaceStartsAtIdx: index("events_workspace_starts_at_idx").on(
      table.workspaceId,
      table.startsAt,
    ),
  }),
);

export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromName: text("from_name").notNull(),
    fromEmail: text("from_email"),
    subject: text("subject").notNull(),
    body: text("body").notNull().default(""),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    source: inboxSource("source").notNull().default("mock"),
    ...timestamps,
  },
  (table) => ({
    workspaceReceivedAtIdx: index("inbox_items_workspace_received_at_idx").on(
      table.workspaceId,
      table.receivedAt,
    ),
  }),
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceType: attachmentSourceType("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size"),
    ...timestamps,
  },
  (table) => ({
    workspaceSourceIdx: index("attachments_workspace_source_idx").on(
      table.workspaceId,
      table.sourceType,
      table.sourceId,
    ),
  }),
);

export const aiActions = pgTable(
  "ai_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    actionType: text("action_type").notNull(),
    input: jsonb("input").notNull().default({}),
    output: jsonb("output").notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    workspaceActionIdx: index("ai_actions_workspace_action_idx").on(
      table.workspaceId,
      table.actionType,
    ),
  }),
);
