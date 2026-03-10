import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

/**
 * Get or create the current user in the database (synced from Clerk).
 * Call this in server components and API routes.
 */
export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await db.user.findUnique({ where: { id: userId } });
  if (user) return user;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
  const name =
    clerkUser.firstName || clerkUser.lastName
      ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
      : clerkUser.username ?? null;

  user = await db.user.create({
    data: {
      id: userId,
      email,
      name,
      role: "portfolio_owner",
    },
  });
  return user;
}
