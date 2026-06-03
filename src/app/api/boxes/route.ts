import { NextResponse } from "next/server";
import { z } from "zod";

import { createBoxSchema } from "@/features/boxes/schemas";
import { createBox } from "@/features/boxes/server/mutations";

const createBoxRequestSchema = z.object({
  id: createBoxSchema.shape.id,
  name: createBoxSchema.shape.name,
  parentBoxId: createBoxSchema.shape.parentBoxId.nullish(),
});

export async function POST(request: Request) {
  try {
    const payload = createBoxRequestSchema.parse(await request.json());
    const box = await createBox({
      id: payload.id,
      name: payload.name,
      parentBoxId: payload.parentBoxId ?? undefined,
    });

    return NextResponse.json(box);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create box." },
      { status: 400 },
    );
  }
}
