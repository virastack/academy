import { CartBadge, CartSummary } from "./cart-components";
import { CartProvider, useCart } from "./cart-context";
import { ProductList } from "./ProductList";
import type { Product } from "./types";

// The real API (api.shop.test) only exists in tests through MSW.
// The demo page loads the same products locally.
const demoProducts: Product[] = [
  { id: 1, name: "Wireless Headphones", price: 1299, oldPrice: 1499, inStock: true },
  { id: 2, name: "Mechanical Keyboard", price: 2199, inStock: true },
  { id: 3, name: "Gaming Mouse", price: 899, inStock: false },
];

function loadDemoProducts() {
  return Promise.resolve(demoProducts);
}

function DemoShop() {
  const { addToCart } = useCart();

  return (
    <>
      <CartBadge />
      <ProductList loadProducts={loadDemoProducts} onAddToCart={addToCart} />
      <CartSummary />
    </>
  );
}

export default function App() {
  return (
    <main>
      <h1>Store</h1>
      <CartProvider>
        <DemoShop />
      </CartProvider>
    </main>
  );
}
