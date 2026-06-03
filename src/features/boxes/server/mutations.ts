"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/server/db/client";
import { boxes, documents } from "@/server/db/schema";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { createBoxSchema, type CreateBoxInput } from "../schemas";
import { type CreateBoxActionState } from "./types";

const emptyDocumentContent = {
  type: "doc",
  content: [],
};

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

async function createBox(input: CreateBoxInput) {
  const payload = createBoxSchema.parse(input);
  const { clerkUserId, workspace } = await requireWorkspace();
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

  return db.transaction(async (tx) => {
    const [box] = await tx
      .insert(boxes)
      .values({
        workspaceId: workspace.id,
        name: payload.name,
        slug,
        parentBoxId: payload.parentBoxId,
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

    const [homeDocument] = await tx
      .insert(documents)
      .values({
        workspaceId: workspace.id,
        type: "box_home",
        title: box.name,
        contentJson: emptyDocumentContent,
        contentText: "",
        createdBy: clerkUserId,
        updatedBy: clerkUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: documents.id,
      });

    if (!homeDocument) {
      throw new Error("Unable to create box home document.");
    }

    const [updatedBox] = await tx
      .update(boxes)
      .set({
        homeDocumentId: homeDocument.id,
        updatedAt: now,
      })
      .where(eq(boxes.id, box.id))
      .returning({
        id: boxes.id,
        name: boxes.name,
        slug: boxes.slug,
        status: boxes.status,
        parentBoxId: boxes.parentBoxId,
        homeDocumentId: boxes.homeDocumentId,
      });

    if (!updatedBox) {
      throw new Error("Unable to link box home document.");
    }

    return updatedBox;
  });
}

export async function createBoxAction(
  _previousState: CreateBoxActionState,
  formData: FormData,
): Promise<CreateBoxActionState> {
  try {
    const parentBoxIdValue = formData.get("parentBoxId");
    const parentBoxId =
      typeof parentBoxIdValue === "string" && parentBoxIdValue.length > 0
        ? parentBoxIdValue
        : undefined;

    const box = await createBox({
      name: String(formData.get("name") ?? ""),
      parentBoxId,
    });

    revalidatePath("/");

    return {
      status: "success",
      error: null,
      box,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unable to create box.",
      box: null,
    };
  }
}
