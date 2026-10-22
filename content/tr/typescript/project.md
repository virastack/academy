---
title: "Tipli ürün kataloğu"
description: "Ürün listesi, filtre ve sepeti uçtan uca tiplerle kur."
lastVerified: "2026-10-17"
translationKey: "typescript/project"
---

## Senaryo

Küçük bir mağaza sayfası kuracaksınız. Sayfa:

- Ürünleri bir JSON dosyasından çeker; veri bozuksa hata gösterir.
- Ürünleri kategoriye göre filtreler.
- **Sepete ekle** butonuyla ürünü sepete ekler; sepetteki ürün çeşidini ve toplam tutarı gösterir.
- Stokta olmayan üründe butonu devre dışı bırakır.

Amaç tasarım değil, tiplerin uçtan uca akmasıdır: JSON'dan gelen `unknown` veri bir type guard'dan geçer, `Product` olarak component'lere iner, sepette `CartItem`'a dönüşür.

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| `Product`, `CartItem`, `Category` | `types.ts` | Interface, type ve union; Utility types |
| `FetchState<T>` discriminated union | `types.ts` | Narrowing ve type guard |
| `isProduct` type guard | `api.ts` | Narrowing ve type guard |
| `useFetch<T>` | `use-fetch.ts` | Generic'ler |
| Props, `ChangeEvent`, context, `useReducer` | `components/*.tsx`, `cart-context.ts`, `CartProvider.tsx` | React'te tipler |
| `strict`, `noUncheckedIndexedAccess`, `tsc -b` | `tsconfig.app.json` | tsconfig ve strict mod |

Projenin çalışan hali GitHub'da: [examples/typescript/project](https://github.com/virastack/academy/tree/main/examples/typescript/project). Takıldığınızda karşılaştırın.

## Adım 1: Projeyi Kurun

[!vite]'in `react-ts` şablonuyla yeni bir proje açın.[^1] Vite, Node.js 20.19+ ya da 22.12+ ister.

```command
npm create vite@latest product-catalog -- --template react-ts
```

`product-catalog` klasörüne girip `npm install` ile bağımlılıkları kurun. Şablon `typescript`, `@types/react` ve `@types/react-dom` paketlerini de kurar.

Şablon `src/App.css` ve `src/assets` klasörüyle gelir; ikisini silin, bu projede kullanılmıyor. `App.tsx` ve `main.tsx` dosyalarının içeriğini sonraki adımlarda değiştireceksiniz.

`tsconfig.app.json` dosyasında `compilerOptions`'ın son satırına virgül koyup iki satır ekleyin:

```json
    "noFallthroughCasesInSwitch": true,
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
```

`strict` TypeScript 6.0'dan beri zaten varsayılan olarak açık; açıkça yazmak, ayarı okuyan kişiye niyeti gösterir.[^2] `noUncheckedIndexedAccess` ise `strict`'in parçası değildir: dizi ve index signature erişimlerinin tipine `undefined` ekler.[^3] Adım 8'de işe yaradığını göreceksiniz.

## Adım 2: Tipleri Tanımlayın

Bütün tipler tek dosyada durur. `Category` elle yazılmaz, `CATEGORIES` dizisinden türetilir; yeni kategori eklemek için diziye bir eleman eklemek yeterlidir.

```ts
// src/types.ts
export const CATEGORIES = ["audio", "computer", "accessory"] as const;

export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: number;
  name: string;
  price: number;
  category: Category;
  inStock: boolean;
};

export type CartItem = Pick<Product, "id" | "name" | "price"> & {
  quantity: number;
};

export type FetchState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
```

- `CartItem`, `Product`'ın üç alanını `Pick` ile alır ve `quantity` ekler. `Product`'ta `price`'ın tipi değişirse `CartItem` da değişir.
- `FetchState<T>` her durum için ayrı bir şekil tanımlar: `data` yalnızca `success`'te, `message` yalnızca `error`'da vardır.

## Adım 3: Ürün Verisi ve Type Guard

Ürünleri `public/products.json` dosyasına koyun. Vite bu klasördeki dosyaları olduğu gibi sunar.

```json
[
  { "id": 1, "name": "Kablosuz Kulaklık", "price": 1299, "category": "audio", "inStock": true },
  { "id": 2, "name": "Bluetooth Hoparlör", "price": 899, "category": "audio", "inStock": false },
  { "id": 3, "name": "Dizüstü Bilgisayar", "price": 32999, "category": "computer", "inStock": true },
  { "id": 4, "name": "USB-C Kablo", "price": 149, "category": "accessory", "inStock": true }
]
```

`response.json()` ne döneceğini bilemez. Sonucu `unknown` olarak alın ve `isProduct` type guard'ından geçirin.[^4]

```ts
// src/api.ts
import { CATEGORIES, type Product } from "./types";

export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "category" in value &&
    CATEGORIES.some((category) => category === value.category) &&
    "inStock" in value &&
    typeof value.inStock === "boolean"
  );
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/products.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isProduct)) {
    throw new Error("Ürün verisi beklenen biçimde değil.");
  }
  return data;
}
```

`data.every(isProduct)` `true` dönerse TypeScript `data`'yı `Product[]` olarak daraltır; `return data` bu yüzden hatasız derlenir. `as Product[]` yazsaydınız derleyici susardı ama bozuk veri sessizce içeri girerdi. Gerçek projelerde bu kontrol için genellikle [!zod] gibi bir şema kütüphanesi kullanılır.

## Adım 4: Generic useFetch

Hook, hangi veriyi yüklediğini bilmez; `T` çağrıldığı yerde `load` fonksiyonunun dönüş tipinden çıkarılır.

```ts
// src/use-fetch.ts
import { useEffect, useState } from "react";
import type { FetchState } from "./types";

export function useFetch<T>(load: () => Promise<T>): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    load()
      .then((data) => {
        if (!ignore) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Bilinmeyen hata";
        if (!ignore) setState({ status: "error", message });
      });
    return () => {
      ignore = true;
    };
  }, [load]);

  return state;
}
```

`ignore` bayrağı, component kaldırıldıktan sonra gelen yanıtın state'i değiştirmesini engeller; react.dev'deki veri çekme örneğiyle aynı kalıptır.[^5]

> [!WARNING]
>
> `load` effect'in bağımlılığıdır. `useFetch(() => fetchProducts())` gibi satır içi bir fonksiyon her render'da yeniden oluşur ve isteği sonsuz döngüye sokar. Modül seviyesinde tanımlı `fetchProducts`'ı doğrudan verin. Gerçek projelerde bu iş için TanStack Query gibi bir kütüphane tercih edilir.[^5]

## Adım 5: ProductCard ve CategoryFilter

```tsx
// src/components/ProductCard.tsx
import type { Product } from "../types";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      <p>{product.price.toLocaleString("tr-TR")} TL</p>
      <button
        type="button"
        disabled={!product.inStock}
        onClick={() => onAddToCart(product)}
      >
        {product.inStock ? "Sepete ekle" : "Stokta yok"}
      </button>
    </article>
  );
}
```

`<select>`'in değeri her zaman `string`'dir. `onChange`'e iletmeden önce bir type guard ile `CategoryFilterValue`'ya daraltılır.

```tsx
// src/components/CategoryFilter.tsx
import { CATEGORIES, type Category } from "../types";

export type CategoryFilterValue = Category | "all";

const LABELS: Record<CategoryFilterValue, string> = {
  all: "Tümü",
  audio: "Ses",
  computer: "Bilgisayar",
  accessory: "Aksesuar",
};

function isCategoryFilterValue(value: string): value is CategoryFilterValue {
  return value === "all" || CATEGORIES.some((category) => category === value);
}

type CategoryFilterProps = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value;
    if (isCategoryFilterValue(next)) {
      onChange(next);
    }
  }

  return (
    <label>
      Kategori{" "}
      <select value={value} onChange={handleChange}>
        {(["all", ...CATEGORIES] as const).map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

`LABELS` bir `Record<CategoryFilterValue, string>` olduğu için `CATEGORIES`'e yeni kategori eklediğinizde etiketini yazmayı unutamazsınız; TypeScript eksik anahtarı hata olarak gösterir.

## Adım 6: Sepet Context'i

Context ve onu okuyan hook bir dosyada, provider başka bir dosyada durur; şablondaki lint kuralı *(`react/only-export-components`)* component ile başka şeyleri aynı dosyadan export etmeyi uyarıyla işaretler.

```ts
// src/cart-context.ts
import { createContext, useContext } from "react";
import type { CartItem, Product } from "./types";

export type CartContextValue = {
  items: CartItem[];
  totalPrice: number;
  addToCart: (product: Product) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const cart = useContext(CartContext);
  if (cart === null) {
    throw new Error("useCart, CartProvider içinde kullanılmalı.");
  }
  return cart;
}
```

Context `null` ile başlar; `useCart` bu `null`'ı ayıklar ve tüketicilere `CartContextValue` döner.[^6]

```tsx
// src/CartProvider.tsx
import { useReducer } from "react";
import { CartContext } from "./cart-context";
import type { CartItem, Product } from "./types";

type CartAction =
  | { type: "add"; product: Product }
  | { type: "remove"; id: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const { id, name, price } = action.product;
      const existing = items.find((item) => item.id === id);
      if (existing) {
        return items.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <CartContext
      value={{
        items,
        totalPrice,
        addToCart: (product) => dispatch({ type: "add", product }),
      }}
    >
      {children}
    </CartContext>
  );
}
```

React 19'da provider için `<CartContext.Provider>` yerine doğrudan `<CartContext>` yazılır.[^7] `addToCart`'ın `product` parametresine tip yazılmadı; tipi `CartContextValue`'dan çıkarılır.

## Adım 7: Parçaları Birleştirin

`App`, `state.status`'a göre dallanır. Her dalda `state` daralır: `state.message` yalnızca `error` dalında, `state.data` yalnızca `success` dalında erişilebilir.

```tsx
// src/App.tsx
import { useState } from "react";
import { fetchProducts } from "./api";
import { useCart } from "./cart-context";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "./components/CategoryFilter";
import { ProductCard } from "./components/ProductCard";
import { useFetch } from "./use-fetch";

export default function App() {
  const state = useFetch(fetchProducts);
  const [category, setCategory] = useState<CategoryFilterValue>("all");
  const { items, totalPrice, addToCart } = useCart();

  switch (state.status) {
    case "loading":
      return <p>Yükleniyor...</p>;
    case "error":
      return <p role="alert">Hata: {state.message}</p>;
    case "success": {
      const products =
        category === "all"
          ? state.data
          : state.data.filter((product) => product.category === category);

      return (
        <main>
          <p>
            Sepet: {items.length} çeşit ürün,{" "}
            {totalPrice.toLocaleString("tr-TR")} TL
          </p>
          <CategoryFilter value={category} onChange={setCategory} />
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </main>
      );
    }
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
```

`default` dalındaki `never` ataması exhaustiveness kontrolüdür: `FetchState`'e yeni bir durum eklenip burada ele alınmazsa derleme hata verir.[^4]

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CartProvider } from "./CartProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>,
);
```

`npm run dev` ile sayfayı açın; filtreyi değiştirip birkaç ürünü sepete ekleyin.

## Adım 8: tsc Hatayı Yakalasın

Vite `.ts` dosyalarını yalnızca JavaScript'e çevirir, tip kontrolü yapmaz; bu işi editörünüze ve build adımına bırakır.[^8] Kontrolü `tsc` yapar. Önce iki hata yapın:

1. `App.tsx`'te `success` dalında öne çıkan ürünü gösterin: `const featured = state.data[0];` ve JSX'e `<h1>Öne çıkan: {featured.name}</h1>`.
2. `CategoryFilter.tsx`'te type guard'ı atlayın: `handleChange`'in içini `onChange(event.currentTarget.value);` yapın.

Sonra tip kontrolünü çalıştırın:

```command
npx tsc -b
```

```
src/App.tsx(31,27): error TS18048: 'featured' is possibly 'undefined'.
src/components/CategoryFilter.tsx(12,10): error TS6133: 'isCategoryFilterValue' is declared but its value is never read.
src/components/CategoryFilter.tsx(23,14): error TS2345: Argument of type 'string' is not assignable to parameter of type 'CategoryFilterValue'.
```

- İlk hata `noUncheckedIndexedAccess`'ten gelir: liste boşsa `state.data[0]` `undefined`'dır. Düzeltme: `{featured && <h1>Öne çıkan: {featured.name}</h1>}`.
- Üçüncü hata, `<select>`'ten gelen herhangi bir `string`'in filtreye girmesini engeller. Type guard'ı geri koyun.

> [!CAUTION]
>
> Vite şablonunda kök `tsconfig.json` yalnızca `references` içerir (`"files": []`). Bu yüzden kök dizinde `npx tsc --noEmit` hiçbir dosyayı kontrol etmeden başarıyla biter. Şablonda `tsc -b` kullanın; `npm run build` de önce `tsc -b` çalıştırır.

Hataları düzeltip `npm run build` ile projenin derlendiğini doğrulayın.

## Kendin Dene

- Sepete **Sepetten çıkar** butonu ekleyin: `CartContextValue`'ya `removeFromCart: (id: number) => void` ekleyin ve reducer'daki `remove` action'ını kullanın.
- `products.json`'da bir ürünün `price` değerini `"1299"` yapın; sayfanın hata durumunu gösterdiğini görün.
- `FetchState`'e `{ status: "idle" }` ekleyin ve `npx tsc -b`'nin `App.tsx`'teki `never` satırında verdiği hatayı okuyun.
- `ProductUpdate = Partial<Omit<Product, "id">>` tipiyle bir ürünün fiyatını güncelleyen `updateProduct(product: Product, changes: ProductUpdate): Product` fonksiyonu yazın.

## Kaynaklar

1. [Vite: Getting Started](https://vite.dev/guide/) *(doc)* — `npm create vite@latest` komutu, `react-ts` şablonu ve Node.js sürüm gereksinimi.
2. [TypeScript Blog: Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) *(article)* — Daniel Rosenwasser, 23 Mart 2026; `strict`'in varsayılan olarak `true` olması.
3. [TSConfig Reference: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) *(doc)* — Index erişimlerinin tipine `undefined` eklenmesi.
4. [TypeScript Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) *(doc)* — `in` ile daraltma, `value is Type` type predicate'leri ve `never` ile exhaustiveness kontrolü.
5. [React: useEffect, Fetching data with Effects](https://react.dev/reference/react/useEffect) *(doc)* — `ignore` bayrağıyla race condition'dan korunma ve veri çekme için kütüphane önerisi.
6. [React: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — `createContext<T | null>(null)` ve `null`'ı ayıklayan custom hook.
7. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `<Context>`'in provider olarak kullanılması.
8. [Vite: Features, TypeScript](https://vite.dev/guide/features) *(doc)* — Vite'in `.ts` dosyalarında yalnızca transpile yapıp tip kontrolü yapmaması.
