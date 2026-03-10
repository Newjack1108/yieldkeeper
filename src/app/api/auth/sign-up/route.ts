import { NextResponse } from "next/server";
import { hash } from "@node-rs/argon2";
import { lucia } from "@/auth";
import { db } from "@/lib/db";
import { generateIdFromEntropySize } from "lucia";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(255),
  name: z.string().min(1, "Name is required").max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, password, name } = parsed.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
    });
    const userId = generateIdFromEntropySize(10);

    await db.user.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        name: name ?? null,
        passwordHash,
        role: "portfolio_owner",
      },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (e) {
    console.error("Sign up error:", e);
    return NextResponse.json(
      { error: "An error occurred during sign up" },
      { status: 500 }
    );
  }
}
