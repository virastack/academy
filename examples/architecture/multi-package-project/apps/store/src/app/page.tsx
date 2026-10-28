import { Price } from "@repo/ui/price";

import { AddToCart } from "@/components/add-to-cart";
import { products } from "@/products";

export default function HomePage() {
  return (
    <main>
      <h1>Store</h1>
      <ul>
        {products.map((product) => (
          <li key={product.slug}>
            {product.name} <Price value={product.price} />
            <AddToCart name={product.name} />
          </li>
        ))}
      </ul>
    </main>
  );
}
