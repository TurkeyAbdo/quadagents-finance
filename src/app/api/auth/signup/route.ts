import { NextResponse } from "next/server";
import { createUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const user = await createUser(email ?? "", password ?? "");
    setSessionCookie(user);

    return NextResponse.json({
      data: { session: { user }, user },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: { session: null, user: null },
        error: {
          message:
            error instanceof Error ? error.message : "Sign up failed.",
        },
      },
      { status: 400 }
    );
  }
}
