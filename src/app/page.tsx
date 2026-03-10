import Link from "next/link";
import Image from "next/image";
import { validateRequest } from "@/lib/auth";

const btnBase =
  "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 py-16 text-center">
        <Image
          src="/logo.png"
          alt="YieldKeeper - Smart Portfolio Management"
          width={280}
          height={80}
          priority
          className="h-auto w-[280px]"
        />
        <p className="max-w-xl text-lg text-muted-foreground">
          Smart portfolio management for modern landlords. Track rent, maintenance,
          compliance, and profitability — all from one dashboard.
        </p>

        {user ? (
          <Link
            href="/dashboard"
            className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            Go to Dashboard
          </Link>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-in"
              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={`${btnBase} border border-white/20 bg-white/10 text-white hover:bg-white/20`}
            >
              Get started
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
