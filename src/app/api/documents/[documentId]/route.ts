import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { documentAutosaveParamsSchema } from "@/features/documents/schemas";
import { getDocumentForEditor } from "@/features/documents/server/queries";

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  try {
    const params = documentAutosaveParamsSchema.parse(await context.params);
    const document = await getDocumentForEditor(params.documentId);

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      const status =
        error.message === "Authentication required." || error.message === "Organization required."
          ? 401
          : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Unable to load document." }, { status: 500 });
  }
}
