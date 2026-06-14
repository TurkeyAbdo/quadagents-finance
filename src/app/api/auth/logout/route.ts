import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ data: { signedOut: true }, error: null });
}
