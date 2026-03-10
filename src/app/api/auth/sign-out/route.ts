import { NextResponse } from "next/server";
import { lucia } from "@/auth";
import { cookies } from "next/headers";

export async function POST() {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  if (sessionId) {
    await lucia.invalidateSession(sessionId);
  }
  const sessionCookie = lucia.createBlankSessionCookie();
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
}
