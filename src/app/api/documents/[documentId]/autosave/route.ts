import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  documentAutosaveInputSchema,
  documentAutosaveParamsSchema,
} from "@/features/documents/schemas";
import { autosaveDocument } from "@/features/documents/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

export async function PUT(
  request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const { clerkUserId, workspace } = await requireWorkspace();
    const params = documentAutosaveParamsSchema.parse(await context.params);
    const payload = documentAutosaveInputSchema.parse(await request.json());

    const document = await autosaveDocument({
      documentId: params.documentId,
      workspaceId: workspace.id,
      updatedBy: clerkUserId,
      ...payload,
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      document,
    });
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
      { error: "Unable to autosave document." },
      { status: 500 },
    );
  }
}

export { PUT as POST };
