"use client";

/** Sunucu hatalarında Next.js'in eklediği `digest` değerini güvenle okur. */
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
            Destek ekibine iletmek için hata kodu: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()} className="underline">
          Tekrar dene
        </button>
      </div>
    </main>
  );
}
