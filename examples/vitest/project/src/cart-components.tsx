import { useCart } from "./cart-context";
import { formatPrice } from "./format-price";

export function CartBadge() {
  const { totalCount } = useCart();

  return <a href="/sepet">Sepet ({totalCount})</a>;
}

export function CartSummary() {
  const { items, totalPrice, removeFromCart } = useCart();

  if (items.length === 0) {
    return <p>Sepetiniz boş.</p>;
  }

  return (
    <section aria-label="Sepet özeti">
      <ul>
        {items.map(({ product, quantity }) => (
          <li key={product.id}>
            <span>
              {product.name} × {quantity}
            </span>
            <button
              type="button"
              aria-label={`${product.name} ürününü sepetten çıkar`}
              onClick={() => removeFromCart(product.id)}
            >
              Çıkar
            </button>
          </li>
        ))}
      </ul>
      <p>Toplam: {formatPrice(totalPrice)}</p>
    </section>
  );
}
