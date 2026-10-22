import { ProductCard } from "../components";
import { products } from "../data/products";

export default function HomePage() {
  return (
    <main className="grid">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </main>
  );
}
