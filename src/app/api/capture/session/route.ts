import { NextResponse } from "next/server";

import { requireWorkspace } from "@/server/auth/require-workspace";

import { getCaptureCorsHeaders } from "../cors";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const headers = getCaptureCorsHeaders(request.headers.get("origin"));

  try {
    await requireWorkspace();

    return NextResponse.json({ authenticated: true }, { headers });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers });
  }
}
