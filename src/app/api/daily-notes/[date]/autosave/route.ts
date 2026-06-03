import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  dailyNoteAutosaveParamsSchema,
  documentAutosaveInputSchema,
} from "@/features/documents/schemas";
import { autosaveDailyDocument } from "@/features/documents/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

export async function PUT(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  try {
    const { clerkUserId, workspace } = await requireWorkspace();
    const params = dailyNoteAutosaveParamsSchema.parse(await context.params);
    const payload = documentAutosaveInputSchema.parse(await request.json());

    const document = await autosaveDailyDocument({
      date: params.date,
      workspaceId: workspace.id,
      clerkUserId,
      ...payload,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Unable to save daily note." },
        { status: 500 },
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      const status =
        error.message === "Authentication required." ||
        error.message === "Organization required."
          ? 401
          : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Unable to autosave daily note." },
      { status: 500 },
    );
  }
}

export { PUT as POST };
