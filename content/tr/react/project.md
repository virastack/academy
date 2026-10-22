---
title: "Ürün sayfası"
description: "Suspense, Error Boundary, Context, Actions, useOptimistic, Activity ve ViewTransition ile çalışan bir ürün detay sayfası."
lastVerified: "2026-10-21"
translationKey: "react/project"
---

## Senaryo

Bir mağazanın ürün detay sayfasını kuracaksınız. Sayfa:

- Ürünü sahte bir API'den yükler; yüklenirken iskelet, hata olursa "Tekrar dene" gösterir.
- **Sepete ekle** ile ürünü sepete koyar; üstteki **Sepet** butonu kayarak açılan bir çekmece gösterir.
- **Favorilere ekle** butonu sunucuyu beklemeden kalbi doldurur.
- **Açıklama** ve **Yorumlar** sekmeleri arasında geçerken yazılan yorum taslağı kaybolmaz.
- Yorum formu hata mesajı gösterir; gönderilen yorum cevap gelmeden listede soluk olarak belirir.

Amaç tasarım değil, derslerdeki parçaların birlikte çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Promise cache, `use`, `Suspense`, `ErrorBoundary` | `cache.ts`, `App.tsx`, `ProductPage.tsx` | Suspense ve hata sınırları |
| `useReducer` + iki context + custom hook | `cart.tsx` | State, Context, Custom hook |
| `useOptimistic`, `await` sonrası `startTransition` | `FavoriteButton.tsx` | Actions ve async güncellemeler |
| `useActionState`, `useFormStatus`, form action | `Reviews.tsx` | Actions ve async güncellemeler |
| `<Activity>` ile sekmeler | `ProductPage.tsx` | View Transition ve Activity |
| `<ViewTransition>` ile çekmece | `CartDrawer.tsx`, `styles.css` | View Transition ve Activity |
| `key` ile state sıfırlama, `initial` öneki | `ProductPage.tsx` | Props ve composition |

Projenin çalışan hali GitHub'da: [examples/react/project](https://github.com/virastack/academy/tree/main/examples/react/project). Takıldığınızda karşılaştırın.

## Adım 1: Projeyi Kurun

[Kurulum ve araçlar](/academy/react/setup-and-tooling) dersindeki gibi bir [!vite] projesi açın ve hata sınırı paketini ekleyin:[^1]

```command
npm create vite@latest product-page -- --template react-ts
```

```command
npm install react-error-boundary
```

`src/App.tsx`, `src/App.css` ve `src/index.css` dosyalarını silin. Tüm dosyaları `src/project/` altına yazacaksınız. `eslint-plugin-react-hooks`'u [Kurulum ve araçlar](/academy/react/setup-and-tooling) dersindeki gibi ESLint'e ekleyin ve `package.json`'daki `lint` betiğini `oxlint && eslint .` yapın; Adım 5'te bir hatayı yakalayacak.

## Adım 2: Sahte API ve Promise Cache

Gerçek bir sunucu yerine gecikmeli fonksiyonlar kullanın. Yorumların üründen daha yavaş gelmesi, Suspense boundary'lerinin farkını görmenizi sağlar.

```ts
// src/project/api.ts
export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  isFavorite: boolean;
};

export type Review = { id: number; author: string; text: string };

const products: Record<string, Product> = {
  "1": {
    id: "1",
    name: "Kablosuz kulaklık",
    price: 1499,
    description: "40 saat pil, aktif gürültü engelleme.",
    isFavorite: false,
  },
};

const reviews: Record<string, Review[]> = {
  "1": [{ id: 1, author: "Ayşe", text: "Sesi çok net." }],
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getProduct(id: string): Promise<Product> {
  await wait(800);
  const product = products[id];
  if (!product) throw new Error("Ürün bulunamadı.");
  return { ...product };
}

export async function getReviews(productId: string): Promise<Review[]> {
  await wait(1500);
  return [...(reviews[productId] ?? [])];
}

export async function setFavorite(id: string, value: boolean) {
  await wait(600);
  products[id] = { ...products[id], isFavorite: value };
}

export async function postReview(productId: string, review: Omit<Review, "id">) {
  await wait(700);
  const saved = { ...review, id: Date.now() };
  reviews[productId] = [...(reviews[productId] ?? []), saved];
  return saved;
}
```

`use` her render'da aynı Promise'i görmelidir; aksi hâlde fallback sürekli tekrar görünür.[^2] Cache'i ayrı bir modülde tutun. `clearProduct`, hata sonrası "Tekrar dene"nin yeni bir istek atabilmesi içindir.

```ts
// src/project/cache.ts
import { getProduct, getReviews, type Product, type Review } from "./api.ts";

const productCache = new Map<string, Promise<Product>>();
const reviewCache = new Map<string, Promise<Review[]>>();

export function fetchProduct(id: string) {
  let promise = productCache.get(id);
  if (!promise) {
    promise = getProduct(id);
    productCache.set(id, promise);
  }
  return promise;
}

export function fetchReviews(productId: string) {
  let promise = reviewCache.get(productId);
  if (!promise) {
    promise = getReviews(productId);
    reviewCache.set(productId, promise);
  }
  return promise;
}

export function clearProduct(id: string) {
  productCache.delete(id);
  reviewCache.delete(id);
}
```

## Adım 3: Sepet Context'i

Sepet, sayfanın her yerinden okunan ve seyrek değişen bir veri; Context için iyi bir aday. State ve `dispatch` ayrı context'lerde duruyor, böylece yalnızca `dispatch` kullanan "Sepete ekle" butonu sepet değişince render olmuyor.[^3]

```tsx
// src/project/cart.tsx
import { createContext, use, useReducer } from "react";
import type { Product } from "./api.ts";

type CartItem = { id: string; name: string; price: number; quantity: number };
type CartAction = { type: "add"; product: Product } | { type: "remove"; id: string };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const existing = items.find((item) => item.id === action.product.id);
      if (existing) {
        return items.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      const { id, name, price } = action.product;
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

const CartContext = createContext<CartItem[] | null>(null);
const CartDispatchContext = createContext<React.Dispatch<CartAction> | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  return (
    <CartContext value={items}>
      <CartDispatchContext value={dispatch}>{children}</CartDispatchContext>
    </CartContext>
  );
}

export function useCartItems() {
  const items = use(CartContext);
  if (items === null) throw new Error("useCartItems, CartProvider içinde kullanılmalı.");
  return items;
}

export function useCartDispatch() {
  const dispatch = use(CartDispatchContext);
  if (dispatch === null) throw new Error("useCartDispatch, CartProvider içinde kullanılmalı.");
  return dispatch;
}
```

## Adım 4: Favori Butonu

`useOptimistic`, Action sürerken kalbi hemen doldurur. Action bitince değer gerçek state'e döner; istek hata verirse kalp kendiliğinden eski hâline gelir.[^4]

```tsx
// src/project/FavoriteButton.tsx
import { startTransition, useOptimistic, useState } from "react";
import { setFavorite } from "./api.ts";

type FavoriteButtonProps = { productId: string; initialFavorite: boolean };

export function FavoriteButton({ productId, initialFavorite }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);

  function toggle() {
    const next = !optimisticFavorite;
    startTransition(async () => {
      setOptimisticFavorite(next);
      await setFavorite(productId, next);
      startTransition(() => setIsFavorite(next));
    });
  }

  return (
    <button type="button" aria-pressed={optimisticFavorite} onClick={toggle}>
      {optimisticFavorite ? "♥ Favorilerde" : "♡ Favorilere ekle"}
    </button>
  );
}
```

İki ayrıntıya dikkat edin:

- Prop'un adı `initialFavorite`: değer yalnızca ilk render'da okunur. `ProductPage` butona `key={product.id}` verir; ürün değişirse buton baştan kurulur.[^5]
- `await`'ten sonraki `setIsFavorite` tekrar `startTransition` ile sarılı. `useTransition` dokümanı `await`'ten sonraki güncellemelerin bu şekilde sarılmasını ister; aksi hâlde transition olarak işaretlenmezler.[^6]

## Adım 5: Yorumlar

Yorum listesi `use` ile yüklenir; form `useActionState` ile gönderilir, `useOptimistic` yeni yorumu cevap gelmeden gösterir, `useFormStatus` butonu kilitler.[^7][^4][^8]

```tsx
// src/project/Reviews.tsx
import { use, useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { postReview, type Review } from "./api.ts";
import { fetchReviews } from "./cache.ts";

type ReviewState = { reviews: Review[]; error: string | null };

export function Reviews({ productId }: { productId: string }) {
  const initialReviews = use(fetchReviews(productId));

  const [state, dispatchReview] = useActionState(
    async (previous: ReviewState, text: string): Promise<ReviewState> => {
      if (text.length < 3) {
        return { ...previous, error: "Yorum en az 3 karakter olmalı." };
      }
      const saved = await postReview(productId, { author: "Siz", text });
      return { reviews: [...previous.reviews, saved], error: null };
    },
    { reviews: initialReviews, error: null },
  );

  const [optimisticReviews, addOptimisticReview] = useOptimistic(
    state.reviews,
    (reviews: Review[], pending: Review) => [...reviews, pending],
  );

  function submitReview(formData: FormData) {
    const text = String(formData.get("text")).trim();
    if (text.length >= 3) {
      addOptimisticReview({ id: -1, author: "Siz", text });
    }
    dispatchReview(text);
  }

  return (
    <section>
      <ul>
        {optimisticReviews.map((review) => (
          <li key={review.id} style={{ opacity: review.id === -1 ? 0.5 : 1 }}>
            <strong>{review.author}:</strong> {review.text}
          </li>
        ))}
      </ul>
      <form action={submitReview}>
        <textarea name="text" aria-label="Yorumunuz" />
        {state.error && <p role="alert">{state.error}</p>}
        <SubmitButton />
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Gönderiliyor..." : "Yorum yap"}</button>;
}
```

> [!WARNING]
>
> İlk denemede `addOptimisticReview`'u doğrudan `useActionState`'in fonksiyonu içinde çağırmak isteyebilirsiniz. `eslint-plugin-react-hooks` bunu *"Cannot access variable before it is declared"* hatasıyla yakalar: fonksiyon, `useOptimistic`'ten önce tanımlanıyor. Şablondaki Oxlint de aynı satırı `react(immutability)` uyarısıyla işaretler. Çözüm yukarıdaki gibi formun `action`'ında önce iyimser değeri ekleyip sonra `dispatchReview`'u çağırmak.

Form action'ı başarılı olunca React `textarea`'yı kendiliğinden temizler.[^9]

## Adım 6: Ürün Sayfası ve Sekmeler

```tsx
// src/project/ProductPage.tsx
import { Activity, Suspense, use, useState } from "react";
import { fetchProduct } from "./cache.ts";
import { useCartDispatch } from "./cart.tsx";
import { FavoriteButton } from "./FavoriteButton.tsx";
import { Reviews } from "./Reviews.tsx";

type Tab = "details" | "reviews";

export function ProductPage({ id }: { id: string }) {
  const product = use(fetchProduct(id));
  const dispatch = useCartDispatch();
  const [tab, setTab] = useState<Tab>("details");

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.price.toLocaleString("tr-TR")} TL</p>
      <button type="button" onClick={() => dispatch({ type: "add", product })}>
        Sepete ekle
      </button>
      <FavoriteButton
        key={product.id}
        productId={product.id}
        initialFavorite={product.isFavorite}
      />

      <div role="tablist">
        <button role="tab" aria-selected={tab === "details"} onClick={() => setTab("details")}>
          Açıklama
        </button>
        <button role="tab" aria-selected={tab === "reviews"} onClick={() => setTab("reviews")}>
          Yorumlar
        </button>
      </div>
      <Activity mode={tab === "details" ? "visible" : "hidden"}>
        <p>{product.description}</p>
      </Activity>
      <Activity mode={tab === "reviews" ? "visible" : "hidden"}>
        <Suspense fallback={<p>Yorumlar yükleniyor...</p>}>
          <Reviews productId={product.id} />
        </Suspense>
      </Activity>
    </article>
  );
}
```

Sekmeler koşullu render yerine `<Activity>` ile yazıldı. Bunun iki sonucu var:[^10]

- Yorum formuna yazılan taslak, **Açıklama** sekmesine geçip dönünce kaybolmaz.
- Yorumlar sekmesi gizliyken de düşük öncelikle render edilir. `Reviews` bileşeni gizliyken yorumları çekmeye başlar; kullanıcı sekmeye tıkladığında veri çoğu zaman hazırdır.

## Adım 7: Kayan Sepet Çekmecesi

```tsx
// src/project/CartDrawer.tsx
import { startTransition, useState, ViewTransition } from "react";
import { useCartDispatch, useCartItems } from "./cart.tsx";

export function CartButton() {
  const items = useCartItems();
  const [isOpen, setIsOpen] = useState(false);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button type="button" onClick={() => startTransition(() => setIsOpen(!isOpen))}>
        Sepet ({count})
      </button>
      {isOpen && (
        <ViewTransition enter="slide-in" exit="slide-out">
          <CartDrawer />
        </ViewTransition>
      )}
    </>
  );
}

function CartDrawer() {
  const items = useCartItems();
  const dispatch = useCartDispatch();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <aside className="cart-drawer" aria-label="Sepet">
      {items.length === 0 ? (
        <p>Sepetiniz boş.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity}
              <button type="button" onClick={() => dispatch({ type: "remove", id: item.id })}>
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>Toplam: {total.toLocaleString("tr-TR")} TL</p>
    </aside>
  );
}
```

```css
/* src/project/styles.css */
@keyframes slide-from-right {
  from { transform: translateX(100%); }
}
@keyframes slide-to-right {
  to { transform: translateX(100%); }
}
::view-transition-new(.slide-in) {
  animation: 250ms ease-out both slide-from-right;
}
::view-transition-old(.slide-out) {
  animation: 200ms ease-in both slide-to-right;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Çekmece `startTransition` ile açıldığı için `<ViewTransition>` animasyonu çalışır; düz `setIsOpen` ile çalışmazdı.[^11] `prefers-reduced-motion` bloğu, hareketi azaltmak isteyen kullanıcılar için animasyonu kapatır.

## Adım 8: Parçaları Birleştirin

```tsx
// src/project/App.tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { CartButton } from "./CartDrawer.tsx";
import { clearProduct } from "./cache.ts";
import { CartProvider } from "./cart.tsx";
import { ProductPage } from "./ProductPage.tsx";

const PRODUCT_ID = "1";

export default function App() {
  return (
    <CartProvider>
      <header>
        <CartButton />
      </header>
      <ErrorBoundary
        onReset={() => clearProduct(PRODUCT_ID)}
        fallbackRender={({ resetErrorBoundary }) => (
          <div role="alert">
            <p>Ürün yüklenemedi.</p>
            <button onClick={resetErrorBoundary}>Tekrar dene</button>
          </div>
        )}
      >
        <Suspense fallback={<p>Ürün yükleniyor...</p>}>
          <ProductPage id={PRODUCT_ID} />
        </Suspense>
      </ErrorBoundary>
    </CartProvider>
  );
}
```

`src/main.tsx` dosyasında import'ları güncelleyin:

```tsx
import App from "./project/App.tsx";
import "./project/styles.css";
```

`npm run dev` ile açın. Şu sırayı deneyin: sayfa yüklenirken iskelet, iki kez "Sepete ekle", sepeti aç, favori, yorumlar sekmesi, iki harflik bir yorum *(hata)*, sonra gerçek bir yorum *(önce soluk, sonra normal)*.

Son olarak kontrol edin:

```bash
npm run lint
npm run build
```

> [!TIP]
>
> React DevTools'un Profiler'ında sepete ürün eklerken hangi component'lerin render olduğuna bakın. `ProductPage`'in sepet değişince render olmadığını görmelisiniz; yalnızca `dispatch` okuyor.

## Kendin Dene

- `api.ts`'te `getProduct`'ı ilk çağrıda hata fırlatacak şekilde değiştirin; "Tekrar dene"nin `clearProduct` sayesinde ikinci denemede çalıştığını görün. Sonra `onReset`'i silip tekrar deneyin.
- `setFavorite`'i her seferinde hata fırlatacak şekilde değiştirin. Kalp ne yapıyor? Hatayı kullanıcıya göstermek için ne eklersiniz?
- Sekmelerde `<Activity>` yerine `{tab === "reviews" && ...}` kullanın; yorum taslağına ve yükleme süresine ne oldu?
- Sepet çekmecesinde ürün adedini artıran bir `+` butonu ekleyin: reducer'a `increment` action'ı yazın.
- Ürün görselini ekleyin ve ürün listesinden detaya geçişte `` <ViewTransition name={`product-${id}`}> `` ile ortak eleman animasyonu yapın.

## Kaynaklar

1. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `onReset` ve `resetKeys`.
2. [React: use](https://react.dev/reference/react/use) *(doc)* — Promise'lerin cache'lenmesi gerektiği ve modül seviyesinde cache örneği.
3. [React: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) *(doc)* — State ve `dispatch`'i ayrı context'lere koymak.
4. [React: useOptimistic](https://react.dev/reference/react/useOptimistic) *(doc)* — Action süresince iyimser değer ve reducer'lı kullanım.
5. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — `initial` öneki ile props'u bilinçli olarak state'e almak.
6. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — `await` sonrası güncellemelerin yeniden `startTransition` ile sarılması.
7. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — Async reducer ile Action sonucu ve hata state'i.
8. [React: useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus) *(doc)* — Üst formun bekleme durumunu okumak.
9. [React: form](https://react.dev/reference/react-dom/components/form) *(doc)* — Başarılı form action'ından sonra kontrolsüz alanların sıfırlanması.
10. [React: Activity](https://react.dev/reference/react/Activity) *(doc)* — Gizli parçanın state'ini koruması ve önceden render edilmesi.
11. [React: ViewTransition](https://react.dev/reference/react/ViewTransition) *(doc)* — Animasyonun yalnızca Transition ile tetiklenmesi ve View Transition Class.
