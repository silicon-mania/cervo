import { NextResponse } from "next/server";

import { getBoxMemoryData, getRootMemoryData } from "@/features/boxes/server/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boxId = searchParams.get("boxId");

  try {
    const data = boxId ? await getBoxMemoryData(boxId) : await getRootMemoryData();

    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load Memory." },
      { status: 400 },
    );
  }
}
