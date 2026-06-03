import { NextResponse } from "next/server";

import { createNoteInputSchema } from "@/features/documents/schemas";
import { createBlankNote } from "@/features/documents/server/mutations";

export async function POST(request: Request) {
  try {
    const payload = createNoteInputSchema.parse(await request.json());
    const note = await createBlankNote(payload);

    return NextResponse.json(note);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create note." },
      { status: 400 },
    );
  }
}
