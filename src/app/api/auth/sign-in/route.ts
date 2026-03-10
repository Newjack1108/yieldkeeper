import { NextResponse } from "next/server";
import { verify } from "@node-rs/argon2";
import { lucia } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password } = parsed.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!existingUser || !existingUser.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const validPassword = await verify(existingUser.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
    });
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    const redirectTo =
      existingUser.role === "tenant" ? "/tenant" : "/dashboard";

    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: redirectTo,
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (e) {
    console.error("Sign in error:", e);
    return NextResponse.json(
      { error: "An error occurred during sign in" },
      { status: 500 }
    );
  }
}
