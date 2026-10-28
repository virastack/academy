"use client";

// Catches errors in the root layout. It renders its own <html> and <body>;
// globals.css is not loaded here, which is why the styles are inline.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem 1rem" }}>
        <title>Error | Order panel</title>
        <main role="alert" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h1>The app could not be loaded</h1>
          <p>An unexpected error occurred. Try reloading the page.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
