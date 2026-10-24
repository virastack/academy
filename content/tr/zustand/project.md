---
title: "Ürün kataloğu ve sepet"
description: "Filtre store'u, slice'lı kalıcı sepet ve türetilen stok uyarısı."
lastVerified: "2026-10-21"
translationKey: "zustand/project"
---

## Senaryo

Bir mağazanın ürün kataloğunu ve sepetini kuracaksınız. Uygulama:

- Kategori ve arama filtrelerini bir Zustand store'unda tutar; filtre değişince ürün sorgusu kendiliğinden yeniden çalışır.
- Ürünleri [!tanstack-query] ile çeker; filtre değişirken eski liste soluk olarak ekranda kalır.
- Sepeti ve sepet çekmecesini slice'lardan oluşan tek bir store'da tutar. "Sepete ekle" hem ürünü ekler hem çekmeceyi açar.
- Sepeti `localStorage`'a yazar; sayfa yenilenince sepet geri gelir, çekmece kapalı açılır.
- Her değişikliği adıyla Redux DevTools'a gönderir.
- Sepet listesini yalnızca ürün `id`'lerini okuyarak çizer; bir ürünün adedi değişince yalnızca o satır render olur.
- Sepetteki adet güncel stoğu aşıyorsa uyarı gösterir. Uyarıyı store'u güncelleyerek değil, sunucu verisinden türeterek üretir.

Amaç tasarım değil, derslerdeki parçaların birlikte çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| `create<T>()`, `set`, `getInitialState` ile sıfırlama | `filter-store.ts` | İlk store, Action ve güncelleme |
| `actions` nesnesi, yalnızca custom hook export etmek | `filter-store.ts`, `shop-store.ts` | Action ve güncelleme, Selector ve yeniden render |
| Filtreyle sorguyu sürmek | `filter-store.ts`, `queries.ts` | TanStack Query ile birlikte kullanım |
| Sepet, arayüz ve ortak slice | `shop-store.ts` | Slice pattern |
| `persist`, `partialize`, `version`, `devtools` | `shop-store.ts` | Persist ve devtools |
| Atomik selector, `useShallow` ile `id` listesi | `shop-store.ts`, `CartDrawer.tsx` | Selector ve yeniden render |
| Stok uyarısını türetmek | `CartDrawer.tsx` | TanStack Query ile birlikte kullanım |

Projenin çalışan hali GitHub'da: [examples/zustand/project](https://github.com/virastack/academy/tree/main/examples/zustand/project). Akışları tarayıcıda deneyen Playwright testleri de orada; takıldığınızda karşılaştırın.

## Adım 1: Projeyi kurun

[İlk store](/academy/zustand/first-store) dersindeki gibi bir [!vite] projesi açın ve paketleri ekleyin:[^1][^2]

```command
npm create vite@latest shop-catalog -- --template react-ts
```

```command
npm install zustand @tanstack/react-query
```

```command
npm install -D @redux-devtools/extension
```

`src/App.tsx`, `src/App.css` ve `src/index.css` dosyalarını silin. Tüm dosyaları `src/project/` altına yazacaksınız.

## Adım 2: Sahte API ve sorgu

Gerçek bir sunucu yerine gecikmeli bir fonksiyon kullanın. Bir ürünün stoğu `0`; "Sepete ekle" butonunun kapandığını görmek için.

```ts
// src/project/api.ts
export type Category = "shoes" | "clothing" | "accessories";

export type Product = {
  id: number;
  name: string;
  category: Category;
  price: number;
  stock: number;
};

export type ProductFilters = { category: Category | "all"; search: string };

const products: Product[] = [
  { id: 1, name: "Canvas Sneaker", category: "shoes", price: 1200, stock: 5 },
  { id: 2, name: "Running Shoe", category: "shoes", price: 2100, stock: 3 },
  { id: 3, name: "Hiking Boot", category: "shoes", price: 2800, stock: 0 },
  { id: 4, name: "Linen Shirt", category: "clothing", price: 850, stock: 8 },
  { id: 5, name: "Denim Jacket", category: "clothing", price: 1650, stock: 2 },
  { id: 6, name: "Knit Sweater", category: "clothing", price: 1100, stock: 6 },
  { id: 7, name: "Wool Beanie", category: "accessories", price: 300, stock: 10 },
  { id: 8, name: "Leather Belt", category: "accessories", price: 450, stock: 4 },
  { id: 9, name: "Silk Scarf", category: "accessories", price: 600, stock: 1 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchProducts({ category, search }: ProductFilters): Promise<Product[]> {
  await delay(300);
  return products
    .filter((p) => category === "all" || p.category === category)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .map((p) => ({ ...p }));
}
```

Sorgu ayarlarını [queryOptions ve select](/academy/tanstack-query/query-options-and-select) dersindeki gibi bir factory'de toplayın. Filtreler anahtarın parçasıdır:

```ts
// src/project/queries.ts
import { queryOptions } from "@tanstack/react-query";
import { fetchProducts, type ProductFilters } from "./api";

export const productQueries = {
  all: () => ["products"] as const,
  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: [...productQueries.all(), "list", filters],
      queryFn: () => fetchProducts(filters),
    }),
};
```

## Adım 3: Filtre store'u

Filtreler küçük ve bağımsız bir store'dur. Store'un kendisi export edilmez; dışarıya yalnızca custom hook'lar açılır *(bkz. [Selector ve yeniden render](/academy/zustand/selectors-and-rerenders))*. Action'lar tek bir `actions` nesnesindedir ve `reset`, `getInitialState()` ile başlangıca döner *(bkz. [Action ve güncelleme](/academy/zustand/actions-and-updates))*.[^3]

`useFilteredProducts` iki dünyayı birleştirir: filtreyi store'dan okur, query key'e koyar. Filtre değişince sorgu yeniden çalışır; kimse `refetch` çağırmaz *(bkz. [TanStack Query ile birlikte kullanım](/academy/zustand/with-tanstack-query))*.[^3]

```ts
// src/project/filter-store.ts
import { create } from "zustand";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ProductFilters } from "./api";
import { productQueries } from "./queries";

type FilterState = ProductFilters & {
  actions: {
    setCategory: (category: ProductFilters["category"]) => void;
    setSearch: (search: string) => void;
    reset: () => void;
  };
};

const useFilterStore = create<FilterState>()((set, _get, store) => ({
  category: "all",
  search: "",
  actions: {
    setCategory: (category) => set({ category }),
    setSearch: (search) => set({ search }),
    reset: () => set(store.getInitialState()),
  },
}));

export const useCategory = () => useFilterStore((state) => state.category);
export const useSearch = () => useFilterStore((state) => state.search);
export const useFilterActions = () => useFilterStore((state) => state.actions);

export function useFilteredProducts() {
  const category = useCategory();
  const search = useSearch();
  return useQuery({
    ...productQueries.list({ category, search }),
    placeholderData: keepPreviousData,
  });
}
```

## Adım 4: Sepet store'u

Sepet ve çekmece birbirini etkiler: ürün ekleyince çekmece açılır. Bu yüzden [Slice pattern](/academy/zustand/slice-pattern) dersindeki gibi tek bir store'da, üç slice olarak duruyorlar.[^4]

- `items`, ürün `id`'sine göre bir nesnedir. Bir ürünü bulmak ya da güncellemek için diziyi taramak gerekmez.
- `setQuantity` adet `1`'in altına düşünce ürünü sepetten çıkarır.
- `persist` yalnızca `items`'ı saklar; çekmecenin açık olması kalıcı değildir.[^5]
- `devtools` en dıştadır; her `set` çağrısı panelde `cart/addItem` gibi bir adla görünür.[^6]
- Middleware kullanıldığı için slice tipleri `Mutators` listesini alır.[^4]

```ts
// src/project/shop-store.ts
import { create, type StateCreator } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Product } from "./api";

export type CartItem = Pick<Product, "id" | "name" | "price"> & { quantity: number };

type CartSlice = {
  items: Record<number, CartItem>;
  addItem: (product: Product) => void;
  setQuantity: (id: number, quantity: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
};

type UiSlice = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

type SharedSlice = {
  addToCart: (product: Product) => void;
};

type ShopState = CartSlice & UiSlice & SharedSlice;

type Mutators = [["zustand/devtools", never], ["zustand/persist", unknown]];

const createCartSlice: StateCreator<ShopState, Mutators, [], CartSlice> = (set) => ({
  items: {},
  addItem: (product) =>
    set(
      (state) => {
        const quantity = (state.items[product.id]?.quantity ?? 0) + 1;
        const { id, name, price } = product;
        return { items: { ...state.items, [id]: { id, name, price, quantity } } };
      },
      undefined,
      "cart/addItem",
    ),
  setQuantity: (id, quantity) =>
    set(
      (state) => {
        const item = state.items[id];
        if (!item) return {};
        if (quantity < 1) {
          const { [id]: _removed, ...rest } = state.items;
          return { items: rest };
        }
        return { items: { ...state.items, [id]: { ...item, quantity } } };
      },
      undefined,
      "cart/setQuantity",
    ),
  removeItem: (id) =>
    set(
      (state) => {
        const { [id]: _removed, ...rest } = state.items;
        return { items: rest };
      },
      undefined,
      "cart/removeItem",
    ),
  clearCart: () => set({ items: {} }, undefined, "cart/clearCart"),
});

const createUiSlice: StateCreator<ShopState, Mutators, [], UiSlice> = (set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }, undefined, "ui/openCart"),
  closeCart: () => set({ isCartOpen: false }, undefined, "ui/closeCart"),
});

const createSharedSlice: StateCreator<ShopState, Mutators, [], SharedSlice> = (_set, get) => ({
  addToCart: (product) => {
    get().addItem(product);
    get().openCart();
  },
});

const useShopStore = create<ShopState>()(
  devtools(
    persist(
      (...a) => ({
        ...createCartSlice(...a),
        ...createUiSlice(...a),
        ...createSharedSlice(...a),
      }),
      {
        name: "shop-cart",
        version: 1,
        partialize: (state) => ({ items: state.items }),
      },
    ),
    { name: "ShopStore" },
  ),
);

export const useCartItemIds = () =>
  useShopStore(useShallow((state) => Object.keys(state.items).map(Number)));
export const useCartItem = (id: number) => useShopStore((state) => state.items[id]);
export const useCartQuantity = (id: number) =>
  useShopStore((state) => state.items[id]?.quantity ?? 0);
export const useCartCount = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.quantity, 0),
  );
export const useCartTotal = () =>
  useShopStore((state) =>
    Object.values(state.items).reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
export const useIsCartOpen = () => useShopStore((state) => state.isCartOpen);

export const useShopActions = () =>
  useShopStore(
    useShallow((state) => ({
      addToCart: state.addToCart,
      setQuantity: state.setQuantity,
      removeItem: state.removeItem,
      clearCart: state.clearCart,
      openCart: state.openCart,
      closeCart: state.closeCart,
    })),
  );
```

`useCartItemIds` yeni bir dizi döndürdüğü için `useShallow` ile sarılı. Sarmasaydınız v5'te sayfa "Maximum update depth exceeded" hatasıyla dururdu.[^7] `useShopActions` da yeni bir nesne döndürür; action'lar hiç değişmediği için `useShallow` ile her zaman aynı referans gelir.

`useCartQuantity` sepette olmayan ürün için `0` döndürür. Bu sabit bir sayı olduğu için güvenlidir; `[]` ya da `{}` olsaydı yeni referans üretirdi.

## Adım 5: Filtreler ve ürünler

Fiyatı biçimlendiren küçük bir yardımcı:

```ts
// src/project/format.ts
export const formatPrice = (value: number) => `${value.toLocaleString("tr-TR")} ₺`;
```

Filtre paneli yalnızca filtre store'unu tanır:

```tsx
// src/project/Filters.tsx
import type { ProductFilters } from "./api";
import { useCategory, useFilterActions, useSearch } from "./filter-store";

const categories: { value: ProductFilters["category"]; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "shoes", label: "Ayakkabı" },
  { value: "clothing", label: "Giyim" },
  { value: "accessories", label: "Aksesuar" },
];

export function Filters() {
  const category = useCategory();
  const search = useSearch();
  const { setCategory, setSearch, reset } = useFilterActions();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        aria-label="Ürün ara"
        placeholder="Ürün ara"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        aria-label="Kategori"
        value={category}
        onChange={(event) => setCategory(event.target.value as ProductFilters["category"])}
      >
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button onClick={reset}>Filtreleri temizle</button>
    </div>
  );
}
```

Ürün kartı, o ürünün sepetteki adedine abone olur. Başka bir ürünü sepete eklemek bu kartı render etmez. Stok sınırına gelince buton kapanır.

```tsx
// src/project/ProductGrid.tsx
import type { Product } from "./api";
import { useFilteredProducts } from "./filter-store";
import { formatPrice } from "./format";
import { useCartQuantity, useShopActions } from "./shop-store";

function ProductCard({ product }: { product: Product }) {
  const inCart = useCartQuantity(product.id);
  const { addToCart } = useShopActions();
  const soldOut = product.stock === 0;
  const limitReached = inCart >= product.stock;

  return (
    <li style={{ border: "1px solid #ccc", padding: 12 }}>
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
      <p>{soldOut ? "Tükendi" : `Stok: ${product.stock}`}</p>
      <button
        onClick={() => addToCart(product)}
        disabled={limitReached}
        aria-label={`${product.name} sepete ekle`}
      >
        Sepete ekle
      </button>
    </li>
  );
}

export function ProductGrid() {
  const { data: products, isPending, isError, isPlaceholderData } = useFilteredProducts();

  if (isPending) return <p>Ürünler yükleniyor...</p>;
  if (isError) return <p>Ürünler yüklenemedi.</p>;
  if (products.length === 0) return <p>Ürün bulunamadı.</p>;

  return (
    <ul
      aria-label="Ürünler"
      style={{
        listStyle: "none",
        padding: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        opacity: isPlaceholderData ? 0.5 : 1,
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
```

## Adım 6: Sepet butonu ve çekmece

Sepet butonu yalnızca toplam adedi okur:

```tsx
// src/project/CartButton.tsx
import { useCartCount, useShopActions } from "./shop-store";

export function CartButton() {
  const count = useCartCount();
  const { openCart } = useShopActions();

  return <button onClick={openCart}>Sepet ({count})</button>;
}
```

Çekmecede iki ayrıntı var:

- `CartDrawer` yalnızca `id` listesini okur; her `CartLine` kendi kaydını seçer. Bir ürünün adedi değişince liste değil, yalnızca o satır render olur.
- `CartLine`, adedi Zustand'dan, güncel stoğu TanStack Query'den okur ve uyarıyı ikisinden **türetir**. Store'a "stok aşıldı" diye bir alan yazılmaz; stok değişince ya da adet azalınca uyarı kendiliğinden kaybolur.[^8]

```tsx
// src/project/CartDrawer.tsx
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
```

## Adım 7: Parçaları birleştirin

```ts
// src/project/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});
```

```tsx
// src/project/App.tsx
import { CartButton } from "./CartButton";
import { CartDrawer } from "./CartDrawer";
import { Filters } from "./Filters";
import { ProductGrid } from "./ProductGrid";

export function App() {
  return (
    <div style={{ display: "flex", gap: 24, padding: 24, fontFamily: "sans-serif" }}>
      <main style={{ flex: 1 }}>
        <header style={{ display: "flex", justifyContent: "space-between" }}>
          <h1>Mağaza</h1>
          <CartButton />
        </header>
        <Filters />
        <ProductGrid />
      </main>
      <CartDrawer />
    </div>
  );
}
```

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./project/query-client";
import { App } from "./project/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

`npm run dev` ile açın ve şu akışları deneyin:

1. Kategoriyi "Ayakkabı" yapın ve aramaya "run" yazın. Liste her değişiklikte güncelleniyor; "Filtreleri temizle" hepsini sıfırlıyor.
2. Bir ürünü sepete ekleyin. Çekmece açılıyor, buton "Sepet (1)" oluyor.
3. Silk Scarf'ı ekleyin. Stoğu `1` olduğu için buton kapanıyor.
4. Sayfayı yenileyin. Sepet duruyor, çekmece kapalı.
5. Redux DevTools'u açın ve bir ürünün adedini değiştirin. Panelde `cart/setQuantity` görünüyor.
6. DevTools'un Application sekmesinde `shop-cart` kaydındaki Denim Jacket adedini `4` yapın ve sayfayı yenileyin. Çekmecede stok uyarısı çıkıyor; adedi `2`'ye düşürünce kayboluyor.

## Kendin dene

- `useCartItemIds`'den `useShallow`'u kaldırın. Konsolda ne görüyorsunuz?
- `partialize`'ı silin, çekmeceyi açıp sayfayı yenileyin.
- `CartItem`'a `size` alanı ekleyin, `version`'ı `2` yapın ve eski kayıtları `migrate` ile `size: "M"` olacak şekilde taşıyın.
- Filtreleri store yerine URL'de *(`?category=shoes&search=run`)* tutun. Hangi dosyalar değişiyor?
- `CartLine`'a `console.log("render")` koyun ve bir ürünün adedini değiştirin. Kaç satır loglanıyor?

## Kaynaklar

1. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Kurulum ve ilk store.
2. [Zustand: devtools](https://zustand.docs.pmnd.rs/reference/middlewares/devtools) *(doc)* — Redux DevTools bağlantısı ve `@redux-devtools/extension` paketi.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Custom hook, `actions` nesnesi ve store'u `useQuery` ile birleştirmek.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#slices-pattern) *(doc)* — `StateCreator` ile tipli slice'lar ve mutator listesi.
5. [Zustand: Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) *(doc)* — `partialize`, `version` ve kayıt biçimi.
6. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#using-middlewares) *(doc)* — `devtools`'u en dışa koymak.
7. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — Kararlı selector çıktısı ve `useShallow`.
8. [TkDodo](https://tkdodo.eu/): [Deriving Client State from Server State](https://tkdodo.eu/blog/deriving-client-state-from-server-state) *(article)* — 1 Eylül 2025. Client state'i sunucu verisiyle senkronlamak yerine türetmek.
