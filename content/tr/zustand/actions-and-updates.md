---
title: "Action ve güncelleme"
description: "Olay gibi action'lar, immer ve store'u sıfırlamak."
lastVerified: "2026-10-21"
translationKey: "zustand/actions-and-updates"
---

## Action'ları Ayrı Bir Nesnede Toplayın

Action'lar state'i değiştiren fonksiyonlardır ve **hiç değişmezler**. [TkDodo](https://tkdodo.eu/) onları store'un içinde ayrı bir `actions` nesnesine koymayı önerir. Böylece hepsini tek bir hook ile dışarı açarsınız:[^1]

```ts
type CartState = {
  items: CartItem[];
  actions: {
    addProduct: (product: Omit<CartItem, "quantity">) => void;
    removeProduct: (id: number) => void;
  };
};

const useCartStore = create<CartState>()((set) => ({
  items: [],
  actions: {
    addProduct: (product) =>
      set((state) => ({ items: [...state.items, { ...product, quantity: 1 }] })),
    removeProduct: (id) =>
      set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  },
}));

export const useCartItems = () => useCartStore((state) => state.items);
export const useCartActions = () => useCartStore((state) => state.actions);
```

```tsx
function RemoveButton({ id }: { id: number }) {
  const { removeProduct } = useCartActions();
  return <button onClick={() => removeProduct(id)}>Kaldır</button>;
}
```

Bu, [Selector ve yeniden render](/academy/zustand/selectors-and-rerenders) dersindeki "atomik selector" kuralıyla çelişmez. `actions` nesnesi hiç değişmediği için tek bir atomik değer gibi davranır; içinden istediğinizi destructure edebilirsiniz.[^1]

> [!NOTE]
>
> `set` en üst seviyede birleştirdiği için `actions` nesnesi güncellemelerde korunur. Yalnızca `set(..., true)` ile state'i tamamen değiştirirseniz silinir.

## Setter Değil, Olay

Action'a `setItems` gibi bir ad verip mantığı component'e yazmak kolaydır. TkDodo, Redux stil rehberinden aldığı kuralı önerir: action'ları **olay** gibi modelleyin.[^1][^2] Component ne olduğunu söyler, store ne yapılacağına karar verir.

```ts
// ❌ Mantık component'te; her kullanan aynı kodu tekrar yazar
const { setItems } = useCartActions();
setItems(items.some((i) => i.id === product.id) ? items.map(/* ... */) : [...items, product]);

// ✅ Mantık store'da
const { addProduct } = useCartActions();
addProduct(product);
```

```ts
addProduct: (product) =>
  set((state) => {
    const existing = state.items.find((item) => item.id === product.id);
    if (existing) {
      return {
        items: state.items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      };
    }
    return { items: [...state.items, { ...product, quantity: 1 }] };
  }),
```

İş kuralı *(aynı ürün eklenirse adedi artır)* tek bir yerde durur ve test etmesi kolaydır.

## İç İçe Güncelleme ve immer

Yukarıdaki `map` ve spread zinciri derinleştikçe okunması zorlaşır. [Immer](https://immerjs.github.io/immer/) ile state'i değiştiriyormuş gibi yazarsınız; Immer arka planda yeni bir nesne üretir.[^3] Zustand bunun için bir middleware verir; paketi ayrıca kurmanız gerekir:[^4]

```command
npm install immer
```

```ts
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type CartState = {
  items: CartItem[];
  addProduct: (product: Omit<CartItem, "quantity">) => void;
};

const useCartStore = create<CartState>()(
  immer((set) => ({
    items: [],
    addProduct: (product) =>
      set((state) => {
        const existing = state.items.find((item) => item.id === product.id);
        if (existing) existing.quantity += 1;
        else state.items.push({ ...product, quantity: 1 });
      }),
  })),
);
```

`set`'e verdiğiniz fonksiyon artık bir şey döndürmez; taslağı değiştirir. Bu yalnızca `immer` middleware'i içinde geçerlidir. Middleware yoksa `state.items.push` store'u bozar ve ekran güncellenmez.[^3]

Ne zaman? State birkaç seviye iç içeyse immer kodu belirgin şekilde kısaltır. Düz bir state için spread yeterlidir; fazladan bir bağımlılık eklemeyin.

## Store'u Sıfırlamak

Çıkış yapınca ya da sipariş tamamlanınca store'u başlangıç haline döndürmek gerekir. `create`'e verdiğiniz fonksiyonun üçüncü parametresi store'un kendisidir; `getInitialState()` ilk state'i verir:[^5]

```ts
const useCartStore = create<CartState>()((set, _get, store) => ({
  items: [],
  couponCode: null,
  actions: {
    // ...
    checkoutCompleted: () => set(store.getInitialState()),
  },
}));
```

Başlangıç değerlerini ayrı bir sabite kopyalamanıza gerek kalmaz.

## Store Dışındaki Action'lar

Doküman önerilen yolu açıkça söyler: action'ları state ile birlikte store'da tutun. Alternatif olarak action'ları modül düzeyinde, `setState` ile de yazabilirsiniz:[^6][^7]

```ts
export const useFilterStore = create<FilterState>()(() => ({
  category: "all",
  search: "",
}));

export const setCategory = (category: string) => useFilterStore.setState({ category });
export const resetFilters = () => useFilterStore.setState(useFilterStore.getInitialState());
```

Avantajı: action'ı çağırmak için hook gerekmez, herhangi bir dosyadan import edilir. Doküman bu yolun bir dezavantajı olmadığını, birlikte tutmanın ise kapsülleme sağladığını söyler.[^7] Projede birini seçin ve tutarlı kalın.

## Kendin Dene

- `addProduct`'ı önce component'te `setItems` ile, sonra store'da olay olarak yazın. Aynı ürünü iki farklı component'ten eklemeniz gerekirse hangisi daha az kod?
- Sepete `checkoutCompleted` ekleyin ve `getInitialState()` ile sıfırlayın.
- `immer` middleware'ini kaldırın ama `state.items.push` satırını bırakın. Ekran güncelleniyor mu?

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; action'ları ayırmak ve olay olarak modellemek.[^1]
- **Resmi doküman:** "Flux inspired practice"; `set` ile güncelleme, action'ları birlikte tutmak ve reducer kalıbı.[^6]
- **Resmi doküman:** "immer"; middleware kullanımı ve Immer'ın kuralları.[^4]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Action'ları ayrı nesnede toplamak ve olay olarak modellemek.
2. [Redux: Model Actions as Events, Not Setters](https://redux.js.org/style-guide/#model-actions-as-events-not-setters) *(doc)* — Action'ı olay olarak adlandırmak ve mantığı store'da tutmak.
3. [Zustand: Updating state](https://zustand.docs.pmnd.rs/learn/guides/updating-state) *(doc)* — İç içe nesneyi elle kopyalamak ve Immer ile kısaltmak.
4. [Zustand: immer](https://zustand.docs.pmnd.rs/reference/middlewares/immer) *(doc)* — `immer` middleware'i, kurulum şartı ve kullanım.
5. [Zustand: How to reset state](https://zustand.docs.pmnd.rs/learn/guides/how-to-reset-state) *(doc)* — `store.getInitialState()` ile sıfırlamak.
6. [Zustand: Flux inspired practice](https://zustand.docs.pmnd.rs/learn/guides/flux-inspired-practice) *(doc)* — Önerilen kalıplar: `set` ile güncellemek ve action'ları birlikte tutmak.
7. [Zustand: Practice with no store actions](https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions) *(doc)* — Action'ları modül düzeyinde `setState` ile yazmak.
