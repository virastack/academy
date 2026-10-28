"use client";

/** Safely reads the `digest` value Next.js attaches to server errors. */
function getDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return typeof error.digest === "string" ? error.digest : undefined;
  }
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = getDigest(error);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div role="alert" className="space-y-3 rounded border border-red-300 bg-red-50 p-4">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p>An unexpected error occurred while loading the page. You can try again.</p>
        {digest && (
          <p className="text-sm">
            Error code to pass on to support: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()} className="underline">
          Try again
        </button>
      </div>
    </main>
  );
}
