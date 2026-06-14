import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next");
  const next =
    rawNext?.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  return NextResponse.redirect(`${origin}${next}`);
}
