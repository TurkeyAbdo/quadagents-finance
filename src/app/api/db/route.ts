import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeDbRequest } from "@/lib/db/execute";
import type { DbRequest } from "@/lib/db/query-client";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const body = (await request.json()) as DbRequest;
  const result = await executeDbRequest(body);
  return NextResponse.json(result, { status: result.error ? 400 : 200 });
}
