import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { updateBoxSchema } from "@/features/boxes/schemas";
import { updateBox } from "@/features/boxes/server/mutations";

const boxParamsSchema = z.object({
  boxId: z.uuid(),
});

type RouteContext = {
  params: Promise<{ boxId: string }>;
};

function errorStatus(error: Error) {
  if (error.message === "Authentication required." || error.message === "Organization required.") {
    return 401;
  }

  if (error.message === "Box not found.") {
    return 404;
  }

  return 400;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const params = boxParamsSchema.parse(await context.params);
    const payload = updateBoxSchema.parse(await request.json());
    const box = await updateBox(params.boxId, payload);

    return NextResponse.json(box);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
    }

    return NextResponse.json({ error: "Unable to update box." }, { status: 500 });
  }
}
