---
title: "Selector ve yeniden render"
description: "Atomik selector, useShallow ve custom hook."
lastVerified: "2026-10-21"
translationKey: "zustand/selectors-and-rerenders"
---

## Selector Nasıl Karşılaştırılır

Store her değiştiğinde Zustand, component'teki selector'ı yeniden çalıştırır ve sonucu bir öncekiyle `Object.is` ile karşılaştırır. Sonuç farklıysa component render olur, aynıysa olmaz.[^1][^2]

```ts
const count = useCartStore((state) => state.items.length);
```

Burada sonuç bir sayıdır. Sepet kapanıp açılsa da sayı aynı kaldığı sürece component render olmaz. Selector'ın döndürdüğü değer ne kadar küçükse component o kadar az render olur.

## Bütün Store'a Abone Olmak

Selector vermezseniz hook bütün state'i döndürür. Bu, store'daki **her** değişiklikte render demektir:[^3]

```ts
// ❌ Yalnızca items'ı kullanıyor ama isOpen değişince de render olur
const { items } = useCartStore();
```

[TkDodo](https://tkdodo.eu/) bu yüzden selector'ları zorunlu sayar: store'da tek bir değer olsa bile bir selector yazın.[^3]

## Atomik Selector

Her değer için ayrı bir selector yazmak en basit ve en güvenli yoldur:[^3]

```ts
const items = useCartStore((state) => state.items);
const isOpen = useCartStore((state) => state.isOpen);
```

Her satır kendi değerine abone olur. TkDodo'nun tercihi budur: bir component iki değere ihtiyaç duyuyorsa iki selector kullanır.[^3]

## Nesne Döndüren Selector

Birden fazla değeri tek seferde almak için nesne döndürmek caziptir. Ama selector her çalıştığında **yeni** bir nesne üretir; `Object.is` iki nesneyi hiçbir zaman eşit saymaz.[^1]

```ts
// ❌ Her seferinde yeni nesne
const { items, isOpen } = useCartStore((state) => ({
  items: state.items,
  isOpen: state.isOpen,
}));
```

v4'te bu kod yalnızca gereksiz render'a yol açıyordu. v5 React'in davranışına uyduğu için sonuç daha ağırdır: React, değerin her okumada değiştiğini görür ve sayfa **"Maximum update depth exceeded"** hatasıyla durur.[^4] Konsolda öncesinde "The result of getSnapshot should be cached" uyarısı çıkar.

Çözüm `useShallow`'dur. Selector'ı sarar ve sonucu **sığ** karşılaştırır: nesnenin ya da dizinin her elemanı `Object.is` ile aynıysa önceki referansı döndürür.[^2][^4]

```ts
import { useShallow } from "zustand/react/shallow";

const { items, isOpen } = useCartStore(
  useShallow((state) => ({ items: state.items, isOpen: state.isOpen })),
);

// Dizi döndürmek de aynı
const [items, isOpen] = useCartStore(useShallow((state) => [state.items, state.isOpen]));
```

`useShallow` hem `zustand/react/shallow`'dan hem `zustand/shallow`'dan import edilebilir.[^4]

> [!WARNING]
>
> Varsayılan değeri selector içinde üretmek de aynı hatayı verir. `state.action ?? (() => {})` her seferinde yeni bir fonksiyon döndürür. Varsayılanı selector'ın dışında bir sabite koyun.[^4]

## Türetilmiş Değer

Hesaplanabilen bir değeri store'a ayrıca yazmayın; selector'da hesaplayın.[^5] Sonuç bir sayı ya da metinse ek bir şey gerekmez:

```ts
const total = useCartStore((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
```

Sonuç yeni bir dizi ise *(`filter`, `map`, `Object.keys`)* her seferinde yeni referans üretir. `useShallow` ile sarın; dizi elemanları aynı kaldıkça component render olmaz:[^1]

```ts
const ids = useCartStore(useShallow((state) => state.items.map((item) => item.id)));
```

Bu kalıp listeler için kullanışlıdır. Liste component'i yalnızca `id`'leri okur; her satır kendi kaydını `id` ile seçer. Bir ürünün adedi değişince yalnızca o satır render olur.

## Yalnızca Custom Hook Export Edin

TkDodo'nun bir numaralı önerisi: store hook'unu dışarı açmayın, her değer için bir custom hook export edin.[^3]

```ts
// Export edilmiyor: kimse bütün store'a abone olamaz
const useCartStore = create<CartState>()((set) => ({
  /* ... */
}));

export const useCartItems = () => useCartStore((state) => state.items);
export const useCartCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
export const useIsCartOpen = () => useCartStore((state) => state.isOpen);
```

Kullanan component selector yazmak zorunda kalmaz, yanlışlıkla bütün store'a abone olamaz, store'un iç yapısı değişince yalnızca bu dosya değişir. Action'ları dışarı açmanın yolu [Action ve güncelleme](/academy/zustand/actions-and-updates) dersinde.

## Kendin Dene

- Üç component yazın: biri bütün store'u, biri atomik selector'ı, biri `useShallow` ile nesne okusun. Her birine `console.log("render")` koyup store'da ilgisiz bir alanı değiştirin.
- `useShallow`'u kaldırıp nesne döndüren selector'ı çalıştırın. Konsolda hangi uyarı ve hata çıkıyor?
- Sepet listesini önce `items`'ı okuyarak, sonra yalnızca `id`'leri okuyup satırlara böldükten sonra render edin. Bir ürünün adedini değiştirince kaç satır render oluyor?

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; custom hook export etmek, atomik selector ve action'ları ayırmak.[^3]
- **Resmi doküman:** "Prevent rerenders with useShallow"; türetilmiş dizide `useShallow` örneği.[^1]
- **Resmi doküman:** "How to Migrate to v5 from v4"; kararlı selector çıktısı şartı ve sonsuz döngü örnekleri.[^4]

## Kaynaklar

1. [Zustand: Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow) *(doc)* — `Object.is` karşılaştırması ve türetilmiş dizide gereksiz render.
2. [Zustand: useShallow](https://zustand.docs.pmnd.rs/reference/hooks/use-shallow) *(doc)* — Selector'ı sığ karşılaştırmayla memoize etmek.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Yalnızca custom hook export etmek, atomik selector ve bütün store'a abone olmanın maliyeti.
4. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — Kararlı selector çıktısı şartı, "Maximum update depth exceeded" ve `useShallow` ile çözüm.
5. [Zustand: Beginner TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/beginner-typescript) *(doc)* — Birden fazla selector ve selector'da türetilmiş state.
