import Link from "next/link";

import { getCart } from "@/lib/cart";

export async function CartLink() {
  const cart = await getCart();
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  return <Link href="/cart">Cart ({count})</Link>;
}
