import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "./format";
import { productQueries } from "./queries";
import {
  useCartItem,
  useCartItemIds,
  useCartTotal,
  useIsCartOpen,
  useShopActions,
} from "./shop-store";

function useStock(id: number) {
  const { data: products } = useQuery(productQueries.list({ category: "all", search: "" }));
  return products?.find((p) => p.id === id)?.stock;
}

function CartLine({ id }: { id: number }) {
  const item = useCartItem(id);
  const stock = useStock(id);
  const { setQuantity, removeItem } = useShopActions();

  if (!item) return null;
  const overStock = stock !== undefined && item.quantity > stock;

  return (
    <li>
      <span>{item.name}</span> <span>{formatPrice(item.price * item.quantity)}</span>
      <div>
        <button
          onClick={() => setQuantity(id, item.quantity - 1)}
          aria-label={`${item.name} azalt`}
        >
          −
        </button>
        <span aria-label={`${item.name} adet`}> {item.quantity} </span>
        <button
          onClick={() => setQuantity(id, item.quantity + 1)}
          disabled={stock !== undefined && item.quantity >= stock}
          aria-label={`${item.name} artır`}
        >
          +
        </button>
        <button onClick={() => removeItem(id)} aria-label={`${item.name} kaldır`}>
          Kaldır
        </button>
      </div>
      {overStock && <p role="alert">Stokta yalnızca {stock} adet var.</p>}
    </li>
  );
}

export function CartDrawer() {
  const isOpen = useIsCartOpen();
  const ids = useCartItemIds();
  const total = useCartTotal();
  const { clearCart, closeCart } = useShopActions();

  if (!isOpen) return null;

  return (
    <aside aria-label="Sepet" style={{ borderLeft: "1px solid #ccc", padding: 16 }}>
      <h2>Sepet</h2>
      {ids.length === 0 ? (
        <p>Sepetiniz boş.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {ids.map((id) => (
            <CartLine key={id} id={id} />
          ))}
        </ul>
      )}
      <p>Toplam: {formatPrice(total)}</p>
      <button onClick={clearCart} disabled={ids.length === 0}>
        Sepeti boşalt
      </button>
      <button onClick={closeCart}>Kapat</button>
    </aside>
  );
}
