import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

// A page that throws on purpose, to exercise the error-tracking pipeline end to end.
// Returns 404 in production.
export default function DebugPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <FailingSection />
    </Suspense>
  );
}

async function FailingSection(): Promise<never> {
  await connection();
  if (getEnv().APP_ENV === "production") notFound();
  throw new Error("Test error: thrown on purpose to exercise the error-tracking pipeline.");
}
