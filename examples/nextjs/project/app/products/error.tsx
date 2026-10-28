"use client";

export default function ProductsError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <h2>Products could not be loaded.</h2>
      <button onClick={() => retry()}>Try again</button>
    </>
  );
}
