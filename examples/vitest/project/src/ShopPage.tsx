import { CartBadge, CartSummary } from "./cart-components";
import { useCart } from "./cart-context";
import { fetchProducts } from "./fetch-products";
import { ProductList } from "./ProductList";

export function ShopPage() {
  const { addToCart } = useCart();

  return (
    <>
      <CartBadge />
      <ProductList loadProducts={fetchProducts} onAddToCart={addToCart} />
      <CartSummary />
    </>
  );
}
