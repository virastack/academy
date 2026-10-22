"use client";

import { useCart } from "../hooks/useCart";
import { Product } from "../types/types";
import { Button } from "./Button";

export function AddToCartButton({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <Button onClick={() => add(product)} aria-label={`${product.name} sepete ekle`}>
      Sepete ekle
    </Button>
  );
}
