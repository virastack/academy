import { AddToCartButton } from "@/features/cart";
import { getProducts, ProductCard } from "@/features/products";

export default function HomePage() {
  return (
    <main className="grid">
      {getProducts().map((product) => (
        <ProductCard key={product.slug} product={product} action={<AddToCartButton {...product} />} />
      ))}
    </main>
  );
}
