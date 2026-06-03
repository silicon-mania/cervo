import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { boxes } from "@/server/db/schema";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { createBoxSchema, type CreateBoxInput } from "../schemas";
import type { BoxSummary } from "./queries";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "box";
}

async function getAvailableSlug({
  baseSlug,
  workspaceId,
}: {
  baseSlug: string;
  workspaceId: string;
}) {
  const db = getDb();

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
    const [existingBox] = await db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.workspaceId, workspaceId), eq(boxes.slug, candidate)))
      .limit(1);

    if (!existingBox) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createBox(input: CreateBoxInput): Promise<BoxSummary> {
  const payload = createBoxSchema.parse(input);
  const { workspace } = await requireWorkspace();
  const db = getDb();

  if (payload.parentBoxId) {
    const [parentBox] = await db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.id, payload.parentBoxId), eq(boxes.workspaceId, workspace.id)))
      .limit(1);

    if (!parentBox) {
      throw new Error("Parent box not found.");
    }
  }

  const now = new Date();
  const slug = await getAvailableSlug({
    baseSlug: slugify(payload.name),
    workspaceId: workspace.id,
  });

  const [box] = await db
    .insert(boxes)
    .values({
      id: payload.id,
      workspaceId: workspace.id,
      name: payload.name,
      slug,
      parentBoxId: payload.parentBoxId ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: boxes.id,
      name: boxes.name,
      slug: boxes.slug,
      status: boxes.status,
      parentBoxId: boxes.parentBoxId,
      homeDocumentId: boxes.homeDocumentId,
    });

  if (!box) {
    throw new Error("Unable to create box.");
  }

  return box;
}
