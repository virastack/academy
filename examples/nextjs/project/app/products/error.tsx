"use client";

export default function ProductsError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <h2>Ürünler yüklenemedi.</h2>
      <button onClick={() => retry()}>Tekrar dene</button>
    </>
  );
}
