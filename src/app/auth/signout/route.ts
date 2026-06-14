import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}

export async function GET(request: NextRequest) {
  clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
