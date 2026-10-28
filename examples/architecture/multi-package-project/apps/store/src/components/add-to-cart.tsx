"use client";

import { Button } from "@repo/ui/button";
import { useState } from "react";

export function AddToCart({ name }: { name: string }) {
  const [count, setCount] = useState(0);

  return (
    <Button onClick={() => setCount(count + 1)} aria-label={`${name} sepete ekle`}>
      Add to cart ({count})
    </Button>
  );
}
