import { useCart } from "./cart-context";
import { formatPrice } from "./format-price";

export function CartBadge() {
  const { totalCount } = useCart();

  return <a href="/cart">Cart ({totalCount})</a>;
}

export function CartSummary() {
  const { items, totalPrice, removeFromCart } = useCart();

  if (items.length === 0) {
    return <p>Your cart is empty.</p>;
  }

  return (
    <section aria-label="Cart summary">
      <ul>
        {items.map(({ product, quantity }) => (
          <li key={product.id}>
            <span>
              {product.name} × {quantity}
            </span>
            <button
              type="button"
              aria-label={`Remove ${product.name} from cart`}
              onClick={() => removeFromCart(product.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>Total: {formatPrice(totalPrice)}</p>
    </section>
  );
}
