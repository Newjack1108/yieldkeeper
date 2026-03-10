"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ChecklistData = {
  completed?: boolean;
  completedAt?: string;
  propertyAddress?: string;
  tenantName?: string;
  scheduledDate?: string | null;
  questions?: { id: string; label: string; type: string; required?: boolean }[];
};

function PreChecklistForm() {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    fetch(`/api/checklist/pre/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("Invalid or expired link"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !data?.questions) return;
    setSubmitting(true);
    setError(null);

    const payload: Record<string, string> = {};
    for (const q of data.questions) {
      const val = answers[q.id];
      if (q.required && !val) {
        setError(`Please answer: ${q.label}`);
        setSubmitting(false);
        return;
      }
      if (val) payload[q.id] = val;
      if (q.type === "yes_no_with_notes" && notes[`${q.id}_notes`]) {
        payload[`${q.id.replace("_to_report", "")}_notes`] = notes[`${q.id}_notes`];
      }
    }

    // Map to API format
    const apiPayload = {
      access_confirmed: payload.access_confirmed ?? "no",
      any_pets: payload.any_pets ?? "no",
      smoke_alarms_ok: payload.smoke_alarms_ok ?? "no",
      property_condition: payload.property_condition ?? "no",
      repairs_to_report: payload.repairs_to_report ?? "no",
      repairs_notes: notes.repairs_to_report_notes ?? null,
    };

    try {
      const res = await fetch(`/api/checklist/pre/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Submission failed");
        setSubmitting(false);
        return;
      }

      setData((prev) => (prev ? { ...prev, completed: true } : prev));
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sign-in">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.completed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Thank you</CardTitle>
            <CardDescription>
              Your pre-inspection checklist has been submitted. Your landlord
              will proceed with the inspection as scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.propertyAddress}
              {data.scheduledDate &&
                ` – ${new Date(data.scheduledDate).toLocaleDateString()}`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Pre-inspection checklist</CardTitle>
          <CardDescription>
            Please complete this form before your annual property inspection at{" "}
            {data?.propertyAddress}.
            {data?.scheduledDate && (
              <span className="block mt-1">
                Scheduled: {new Date(data.scheduledDate).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {data?.questions?.map((q) => (
              <div key={q.id} className="space-y-3">
                <Label>
                  {q.label}
                  {q.required && " *"}
                </Label>
                <RadioGroup
                  value={answers[q.id] ?? ""}
                  onValueChange={(v) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: v }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                    <Label htmlFor={`${q.id}-yes`} className="font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id={`${q.id}-no`} />
                    <Label htmlFor={`${q.id}-no`} className="font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {q.type === "yes_no_with_notes" && (
                  <Textarea
                    placeholder="Optional details..."
                    value={notes[`${q.id}_notes`] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [`${q.id}_notes`]: e.target.value,
                      }))
                    }
                    className="mt-2"
                    rows={2}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PreChecklistPage() {
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
        <PreChecklistForm />
      </Suspense>
    </div>
  );
}
