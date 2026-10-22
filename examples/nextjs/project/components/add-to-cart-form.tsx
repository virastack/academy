"use client";

import { useActionState } from "react";

import { addToCart } from "@/app/actions";

export function AddToCartForm({ slug }: { slug: string }) {
  const [state, formAction, isPending] = useActionState(addToCart, { message: null });

  return (
    <form action={formAction}>
      <input type="hidden" name="slug" value={slug} />
      <button disabled={isPending}>{isPending ? "Ekleniyor..." : "Sepete ekle"}</button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
