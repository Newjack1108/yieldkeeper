"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <Card className="w-full max-w-sm border-white/10 bg-card">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>
            This set-password link is invalid or has expired. Please request a
            new invite from your landlord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in">
            <Button variant="outline" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/tenant-portal/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error ?? "Invalid or expired link. Please request a new invite."
        );
        setLoading(false);
        return;
      }

      router.push("/tenant");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm border-white/10 bg-card">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>
          Create a password to access your tenant portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Setting password..." : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="YieldKeeper"
        className="mb-6 h-auto w-[200px]"
        width={200}
        height={57}
      />
      <Suspense fallback={<div>Loading...</div>}>
        <SetPasswordForm />
      </Suspense>
    </div>
  );
}
