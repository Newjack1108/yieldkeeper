import Link from "next/link";
import { Show } from "@clerk/nextjs";

const btnBase =
  "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-10 px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          YieldKeeper
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          Smart portfolio management for modern landlords. Track rent, maintenance,
          compliance, and profitability — all from one dashboard.
        </p>

        <Show
          when="signed-out"
          fallback={
            <Link
              href="/dashboard"
              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/80`}
            >
              Go to Dashboard
            </Link>
          }
        >
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-in"
              className={`${btnBase} bg-primary text-primary-foreground hover:bg-primary/80`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={`${btnBase} border border-border bg-background hover:bg-muted`}
            >
              Get started
            </Link>
          </div>
        </Show>
      </main>
    </div>
  );
}
