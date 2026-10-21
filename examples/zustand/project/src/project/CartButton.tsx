import { useCartCount, useShopActions } from "./shop-store";

export function CartButton() {
  const count = useCartCount();
  const { openCart } = useShopActions();

  return <button onClick={openCart}>Sepet ({count})</button>;
}
