---
title: "Provider ve hook"
description: "Sepet Provider'ı, renderWithProviders ve renderHook."
lastVerified: "2026-10-14"
translationKey: "vitest/provider-and-hook"
---

## Neden provider gerekir?

Mağaza sepeti bir Context ile paylaşılır. Header'daki rozet, ürün listesi ve sepet özeti aynı sepeti okur. Bu component'ler `CartProvider` içinde çalışır. Provider olmadan render ederseniz hata alırsınız.

## Sepet context'i

`initialItems` prop'una dikkat edin. Testte sepeti dolu başlatmanızı sağlar. Tıklamayla tek tek ürün eklemek gerekmez.

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product } from "./types";

export type CartItem = { product: Product; quantity: number };

type CartContextValue = {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  initialItems?: CartItem[];
};

export function CartProvider({ children, initialItems = [] }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems);

  function addToCart(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);

      if (!existing) {
        return [...current, { product, quantity: 1 }];
      }

      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  }

  function removeFromCart(productId: number) {
    setItems((current) =>
      current.filter((item) => item.product.id !== productId),
    );
  }

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, totalCount, totalPrice, addToCart, removeFromCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider.");
  }

  return context;
}
```

Sepeti okuyan iki component. İkisini `cart-components.tsx` dosyasına yazın:

```tsx
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
              aria-label={`${product.name} from cart`}
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
```

## renderWithProviders

Her testte Provider yazmak tekrar yaratır. Bir yardımcı fonksiyon yazın. React Testing Library bunun için `wrapper` seçeneğini sunar.[^1]

```tsx
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { CartProvider, type CartItem } from "./cart-context";

type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  initialItems?: CartItem[];
};

export function renderWithProviders(
  ui: ReactElement,
  { initialItems, ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <CartProvider initialItems={initialItems}>{children}</CartProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

Dosyayı `src/test-utils.tsx` olarak kaydedin. Tüm testlerde `render` yerine bu fonksiyonu kullanın.

> [!TIP]
>
> Yeni bir Provider eklediğinizde (tema, router, query client) yalnızca `Wrapper` fonksiyonunu güncelleyin. Mevcut testler değişmez.

## Component testleri

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartBadge, CartSummary } from "./cart-components";
import type { CartItem } from "./cart-context";
import { renderWithProviders } from "./test-utils";
import type { Product } from "./types";

const keyboard: Product = {
  id: 2,
  name: "Mechanical Keyboard",
  price: 2199,
  inStock: true,
};
const mouse: Product = {
  id: 3,
  name: "Gaming Mouse",
  price: 899,
  inStock: true,
};

const filledCart: CartItem[] = [
  { product: keyboard, quantity: 2 },
  { product: mouse, quantity: 1 },
];

test("the badge shows zero for an empty cart", () => {
  renderWithProviders(<CartBadge />);

  expect(screen.getByRole("link", { name: "Cart (0)" })).toBeInTheDocument();
});

test("the badge shows the total item count", () => {
  renderWithProviders(<CartBadge />, { initialItems: filledCart });

  expect(screen.getByRole("link", { name: "Cart (3)" })).toBeInTheDocument();
});

test("the summary shows the items and the total", () => {
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  expect(screen.getByText("Mechanical Keyboard × 2")).toBeInTheDocument();
  expect(screen.getByText("Total: ₺5.297,00")).toBeInTheDocument();
});

test("the Remove button takes the product out of the cart", async () => {
  const user = userEvent.setup();
  renderWithProviders(<CartSummary />, { initialItems: filledCart });

  await user.click(
    screen.getByRole("button", { name: "Remove Mechanical Keyboard from cart" }),
  );

  const summary = screen.getByRole("region", { name: "Cart summary" });
  expect(
    within(summary).queryByText("Mechanical Keyboard × 2"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Total: ₺899,00")).toBeInTheDocument();
});
```

`initialItems` sayesinde her test tek bir şeyi test eder. Rozet testi, ürün ekleme akışına bağlı değildir.

## Hook testi

Hook'u bir component üzerinden test etmek en iyisidir.[^2] Bu yaklaşım kullanıcının gördüğü davranışı doğrular. Hook'u component'ten bağımsız test etmek istiyorsanız `renderHook` kullanın. State değiştiren çağrıları `act` ile sarın.[^3]

```tsx
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "./cart-context";

function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

test("increments the quantity when the same product is added", () => {
  const { result } = renderHook(() => useCart(), { wrapper });

  act(() => {
    result.current.addToCart(keyboard);
    result.current.addToCart(keyboard);
  });

  expect(result.current.totalCount).toBe(2);
  expect(result.current.totalPrice).toBe(4398);
});

test("throws when used outside the provider", () => {
  expect(() => renderHook(() => useCart())).toThrow(
    "useCart must be used within CartProvider.",
  );
});
```

> [!TIP]
>
> Render sırasında hata fırlatan bir test, React sürümüne göre konsola hata yazabilir. Konsolda kırmızı hata görürseniz test yine geçer. Bu normaldir.

<details>
<summary>Diğer Provider türleri</summary>

- **Router:** React Router kullanıyorsanız router bağlamı gerektiren component'i `createRoutesStub` ile render edin.[^4]
- **TanStack Query:** Her test için yeni bir `QueryClient` oluşturun. Testlerde `retry: false` ayarlayın. Başarısız istek tekrar denenirse test uzun sürer.[^5]
- Provider sayısı arttıkça `renderWithProviders` fonksiyonuna seçenek ekleyin. Örnek: `initialItems`.

</details>

## Kendin dene

`CartSummary` ve `CartBadge` aynı sepeti paylaşır. Bunu tek bir testte doğrulayın:

- Aynı `renderWithProviders` çağrısında ikisini birlikte render edin: `<><CartBadge /><CartSummary /></>`. `initialItems` olarak `filledCart` verin.
- **Mechanical Keyboard** için **Remove** butonuna tıklayın.
- Rozetin **Cart (1)** olduğunu doğrulayın.

## Kaynaklar

1. [React Testing Library: Kurulum (wrapper)](https://testing-library.com/docs/react-testing-library/setup) *(doc)* — Provider'ları `wrapper` ile saran özel `render` fonksiyonu.
2. [Kent C. Dodds: How to test custom React hooks](https://kentcdodds.com/blog/how-to-test-custom-react-hooks) *(article)* — Hook'u örnek bir component üzerinden test etme önerisi ve `renderHook` için uygun durumlar.
3. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — `renderHook`, `wrapper` seçeneği, `result.current` ve `act`.
4. [React Router: Testing](https://reactrouter.com/start/framework/testing) *(doc)* — Router bağlamı gerektiren component'leri `createRoutesStub` ile test etme.
5. [TkDodo: Testing React Query](https://tkdodo.eu/blog/testing-react-query) *(article)* — Her test için yeni `QueryClient` ve `retry: false` ayarı.
