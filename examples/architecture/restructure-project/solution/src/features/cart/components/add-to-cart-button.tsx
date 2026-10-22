"use client";

import { Button } from "@/components/ui/button";

import { useCart } from "./cart-provider";

type Props = { slug: string; name: string; price: number };

export function AddToCartButton(props: Props) {
  const { add } = useCart();

  return (
    <Button onClick={() => add(props)} aria-label={`${props.name} sepete ekle`}>
      Sepete ekle
    </Button>
  );
}
