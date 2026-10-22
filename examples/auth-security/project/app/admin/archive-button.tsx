"use client";

import { useRouter } from "next/navigation";

export function ArchiveButton({ productId }: { productId: string }) {
  const router = useRouter();

  async function archive() {
    const response = await fetch(`/api/admin/products/${productId}/archive`, { method: "POST" });

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={archive}>
      Arşivle
    </button>
  );
}
