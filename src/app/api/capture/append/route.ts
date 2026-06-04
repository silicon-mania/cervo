import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { captureAppendFormSchema } from "@/features/capture/schemas";
import { appendCaptureTextToCurrentDailyNote } from "@/features/capture/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { getCaptureCorsHeaders } from "../cors";

function getStatusForError(error: Error) {
  if (error.message === "Authentication required." || error.message === "Organization required.") {
    return 401;
  }

  if (error.message === "Capture text is required.") {
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

export async function POST(request: Request) {
  const headers = getCaptureCorsHeaders(request.headers.get("origin"));

  try {
    const { clerkUserId, workspace } = await requireWorkspace();
    const formData = await request.formData();
    const payload = captureAppendFormSchema.parse({
      captureId: formData.get("captureId"),
      text: formData.get("text"),
    });

    if (!payload.text) {
      return NextResponse.json({ error: "Capture text is required." }, { status: 400, headers });
    }

    const result = await appendCaptureTextToCurrentDailyNote({
      workspaceId: workspace.id,
      clerkUserId,
      captureId: payload.captureId,
      text: payload.text,
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
