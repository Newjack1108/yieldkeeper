import { NextResponse } from "next/server";
import { hash } from "@node-rs/argon2";
import { lucia } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters").max(255),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    const invite = await db.tenantInvite.findUnique({
      where: { token },
      include: {
        tenant: { include: { loginUser: true } },
      },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired link. Please request a new invite." },
        { status: 400 }
      );
    }

    const tenant = invite.tenant;
    const loginUser = tenant.loginUser;
    if (!loginUser) {
      return NextResponse.json(
        { error: "Invalid invite. No account linked." },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
    });

    await db.$transaction([
      db.user.update({
        where: { id: loginUser.id },
        data: { passwordHash },
      }),
      db.tenantInvite.delete({ where: { id: invite.id } }),
    ]);

    const session = await lucia.createSession(loginUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: "/tenant",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (e) {
    console.error("Set password error:", e);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
