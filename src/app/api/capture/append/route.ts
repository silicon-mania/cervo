import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { captureAppendFormSchema } from "@/features/capture/schemas";
import {
  appendCaptureToCurrentDailyNote,
  type CaptureImageFile,
} from "@/features/capture/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { getCaptureCorsHeaders } from "../cors";

function getStatusForError(error: Error) {
  if (error.message === "Authentication required." || error.message === "Organization required.") {
    return 401;
  }

  if (
    error.message === "Capture text or image is required." ||
    error.message === "Only PNG, JPEG, GIF, or WebP images can be appended." ||
    error.message === "Capture image is too large." ||
    error.message === "Capture image files are invalid."
  ) {
    return 400;
  }

  return 500;
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(request.headers.get("origin")),
  });
}

function isFileLike(value: FormDataEntryValue): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "type" in value &&
    "size" in value
  );
}

function getCaptureImageFiles(formData: FormData): CaptureImageFile[] {
  const imageEntries = formData.getAll("images");
  const images: CaptureImageFile[] = [];

  for (const entry of imageEntries) {
    if (!isFileLike(entry)) {
      throw new Error("Capture image files are invalid.");
    }

    images.push({
      name: entry.name,
      type: entry.type,
      size: entry.size,
      file: entry,
    });
  }

  return images;
}

export async function POST(request: Request) {
  const headers = getCaptureCorsHeaders(request.headers.get("origin"));

  try {
    const { clerkUserId, workspace } = await requireWorkspace();
    const formData = await request.formData();
    const textEntry = formData.get("text");
    const payload = captureAppendFormSchema.parse({
      captureId: formData.get("captureId"),
      text: typeof textEntry === "string" ? textEntry : undefined,
    });
    const images = getCaptureImageFiles(formData);

    if (!payload.text && images.length === 0) {
      return NextResponse.json(
        { error: "Capture text or image is required." },
        { status: 400, headers },
      );
    }

    const result = await appendCaptureToCurrentDailyNote({
      workspaceId: workspace.id,
      clerkUserId,
      captureId: payload.captureId,
      text: payload.text,
      images,
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: getStatusForError(error), headers });
    }

    return NextResponse.json({ error: "Unable to append capture." }, { status: 500, headers });
  }
}
