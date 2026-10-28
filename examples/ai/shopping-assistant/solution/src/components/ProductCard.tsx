export type ProductSummary = { id: string; name: string; category: string; price: number; inStock: boolean };

export function ProductCard({ product, onAdd }: { product: ProductSummary; onAdd: (id: string) => void }) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-card p-4">
      <h2 className="font-medium text-ink">{product.name}</h2>
      <p className="mt-1 text-sm text-muted">{product.category}</p>
      <p className="mt-3 text-lg font-semibold text-ink">€{product.price.toLocaleString('en-US')}</p>
      <button
        type="button"
        disabled={!product.inStock}
        aria-label={`Add ${product.name} to cart`}
        onClick={() => onAdd(product.id)}
        className="mt-4 h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink disabled:bg-line disabled:text-muted"
      >
        {product.inStock ? 'Add to cart' : 'Out of stock'}
      </button>
    </article>
  );
}
