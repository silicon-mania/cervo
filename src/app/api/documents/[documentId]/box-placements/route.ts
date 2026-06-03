import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { boxPlacementRequestSchema } from "@/features/boxes/schemas";
import {
  placeDocumentInBox,
  removeDocumentFromBox,
} from "@/features/boxes/server/mutations";
import { getDocumentBoxPlacementsData } from "@/features/boxes/server/queries";
import { documentAutosaveParamsSchema } from "@/features/documents/schemas";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

function errorStatus(error: Error) {
  if (error.message === "Authentication required." || error.message === "Organization required.") {
    return 401;
  }

  if (error.message === "Document not found." || error.message === "Box not found.") {
    return 404;
  }

  return 400;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = documentAutosaveParamsSchema.parse(await context.params);
    const data = await getDocumentBoxPlacementsData(params.documentId);

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json({ error: "Unable to load box placements." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = documentAutosaveParamsSchema.parse(await context.params);
    const payload = boxPlacementRequestSchema.parse(await request.json());
    const placement = await placeDocumentInBox({
      documentId: params.documentId,
      boxId: payload.boxId,
    });

    return NextResponse.json(placement);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json({ error: "Unable to add box placement." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const params = documentAutosaveParamsSchema.parse(await context.params);
    const payload = boxPlacementRequestSchema.parse(await request.json());
    const placement = await removeDocumentFromBox({
      documentId: params.documentId,
      boxId: payload.boxId,
    });

    return NextResponse.json(placement);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json({ error: "Unable to remove box placement." }, { status: 500 });
  }
}
