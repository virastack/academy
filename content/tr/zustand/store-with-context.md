---
title: "Context ile store"
description: "Props'tan başlatma, yeniden kullanım, test ve Next.js."
lastVerified: "2026-10-21"
translationKey: "zustand/store-with-context"
---

## Global store'un sınırları

`create` ile kurulan store bir modül değişkenidir; uygulamanın her yerinden erişilir ve Provider gerekmez. [TkDodo](https://tkdodo.eu/), bu kolaylığın üç durumda sorun çıkardığını anlatır:[^1]

| Durum | Sorun |
| :-- | :-- |
| **Props'tan başlatmak** | Store component'ten önce oluşur. Değeri `useEffect` ile sonradan yazarsınız; ilk render yanlış değerle yapılır. |
| **Test** | Tüm testler aynı store'u paylaşır. Her testten sonra store'u elle sıfırlamanız gerekir. |
| **Yeniden kullanım** | Aynı component sayfada iki kez kullanılırsa iki örnek aynı state'i paylaşır ve birbirini ezer. |

[!nextjs] gibi sunucuda render eden bir framework'te dördüncü bir sorun var: sunucu aynı anda birçok isteğe cevap verir. Modül düzeyindeki bir store **istekler arasında paylaşılır**; bir kullanıcının verisi diğerine sızabilir.[^2]

## Değeri değil, store'u paylaşın

Çözüm React Context'tir; ama state yönetimi için değil. Context'e değer yerine **store örneğini** koyarsınız. Store örneği hiç değişmediği için Context gereksiz render'a yol açmaz; değer seçimini yine Zustand'ın selector'ları yapar.[^1]

Bunun için hook döndüren `create` yerine yalnızca store oluşturan `createStore` kullanılır:[^3]

```ts
// src/features/filters/selection-store.ts
import { createStore } from "zustand";

export type SelectionState = {
  selected: string[];
  actions: {
    toggle: (id: string) => void;
    clear: () => void;
  };
};

export const createSelectionStore = (initialSelected: string[]) =>
  createStore<SelectionState>()((set) => ({
    selected: initialSelected,
    actions: {
      toggle: (id) =>
        set((state) => ({
          selected: state.selected.includes(id)
            ? state.selected.filter((s) => s !== id)
            : [...state.selected, id],
        })),
      clear: () => set({ selected: [] }),
    },
  }));
```

Provider store'u **bir kez** oluşturur. `useState`'in başlatıcı fonksiyonu yalnızca ilk render'da çalışır; TkDodo tek seferlik başlatma için `useRef` yerine bunu tercih eder:[^1][^4]

```tsx
// src/features/filters/selection-provider.tsx
import { createContext, use, useState, type ReactNode } from "react";
import { useStore, type StoreApi } from "zustand";

const SelectionStoreContext = createContext<StoreApi<SelectionState> | null>(null);

export function SelectionProvider({
  initialSelected = [],
  children,
}: {
  initialSelected?: string[];
  children: ReactNode;
}) {
  const [store] = useState(() => createSelectionStore(initialSelected));
  return <SelectionStoreContext value={store}>{children}</SelectionStoreContext>;
}

function useSelectionStore<T>(selector: (state: SelectionState) => T): T {
  const store = use(SelectionStoreContext);
  if (!store) {
    throw new Error("useSelectionStore, SelectionProvider içinde kullanılmalı.");
  }
  return useStore(store, selector);
}

export const useIsSelected = (id: string) =>
  useSelectionStore((state) => state.selected.includes(id));
export const useSelectedCount = () => useSelectionStore((state) => state.selected.length);
export const useSelectionActions = () => useSelectionStore((state) => state.actions);
```

`useStore(store, selector)`, `create`'in döndürdüğü hook'un yaptığını yapar: store'a selector ile abone olur.[^5] Provider dışında hata fırlatan hook kalıbı ve `use` [Context](/academy/react/context) dersinden tanıdık.

## Üç sorun nasıl çözülür

- **Props.** `initialSelected` store oluşturulurken verilir; ilk render doğru değerle yapılır. Prop sonradan değişirse store'a yansımaz; bu bir **başlangıç** değeridir. Prop değişince store'u sıfırlamak istiyorsanız Provider'a `key` verin.[^1]
- **Yeniden kullanım.** Her Provider kendi store'unu oluşturur. Aynı filtre grubunu sayfada iki kez kullanabilirsiniz:

```tsx
<SelectionProvider initialSelected={["shoes"]}>
  <CategoryFilter />
</SelectionProvider>
<SelectionProvider>
  <ColorFilter />
</SelectionProvider>
```

- **Test.** Her test kendi Provider'ını render eder; store teste özeldir, sıfırlama gerekmez.[^1] Provider ile render eden yardımcı fonksiyon [Provider ve hook testi](/academy/vitest/provider-and-hook) dersinde.

Global store'larla devam ediyorsanız Zustand dokümanı testler için bir `__mocks__/zustand.ts` dosyasıyla her testten sonra tüm store'ları `getInitialState()`'e döndürmeyi anlatır.[^6] TkDodo bu yolu karmaşık bulduğunu yazar.[^1]

## Next.js'te store

Zustand dokümanı App Router için iki kural koyar:[^2]

- **Global store yok.** Store istek başına oluşturulmalı; yukarıdaki Provider kalıbı bunu sağlar. Provider bir Client Component'tir.
- **Server Component store'u okumaz ve yazmaz.** Server Component hook ve Context kullanamaz; store'a ulaşması mimariye aykırıdır.

```tsx
// app/providers.tsx
"use client";

import { useState, type ReactNode } from "react";
import { CartStoreContext, createCartStore } from "@/features/cart/cart-store";

export function CartStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createCartStore());
  return <CartStoreContext value={store}>{children}</CartStoreContext>;
}
```

Provider'ı `app/layout.tsx`'te `<body>`'nin içine koyarsanız store uygulama boyunca yaşar. Yalnızca bir route'ta gerekiyorsa o route'un `page.tsx`'ine koyun; route'tan çıkınca store da gider.[^2] Server Component'te okunan bir değeri başlangıç değeri olarak Provider'a prop ile geçebilirsiniz.

## Ne zaman hangisi

| Durum | Öneri |
| :-- | :-- |
| Uygulama genelinde tek bir state *(tema, sepet)*, yalnızca tarayıcıda | `create` ile global store |
| Bir route'a ya da component ağacına ait state | `createStore` + Context |
| Props'tan başlaması gereken state | `createStore` + Context |
| Sayfada birden fazla kez kullanılan component | `createStore` + Context |
| Sunucuda render edilen Next.js uygulaması | `createStore` + Context |

TkDodo kendi deneyimini şöyle özetler: Context ile kurduğu store'ları, gerçekten global olanlardan daha sık kullanmıştır.[^1]

## Kendin dene

- Bir filtre grubunu global store ile yazın ve sayfada iki kez render edin. Birinde seçim yapınca diğerine ne oluyor?
- Aynısını `SelectionProvider` ile yazın.
- `initialSelected` prop'unu bir butonla değiştirin. Store güncelleniyor mu? Provider'a `key` verip tekrar deneyin.
- `useSelectedCount`'u Provider'ın dışında çağırın ve hata mesajını görün.

## Detaylı öğrenmek için

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Zustand and React Context"; global store'un üç sorunu ve Context ile çözümü.[^1]
- **Resmi doküman:** "Setup with Next.js"; istek başına store, Provider ve route düzeyinde store.[^2]
- **Resmi doküman:** "Initialize state with props"; `createStore`, Context ve custom hook kalıbı.[^3]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — 14 Nisan 2024. Props'tan başlatma, test ve yeniden kullanım sorunları; store örneğini Context ile paylaşmak.
2. [Zustand: Setup with Next.js](https://zustand.docs.pmnd.rs/learn/guides/nextjs) *(doc)* — İstek başına store, Server Component kuralı ve route düzeyinde Provider.
3. [Zustand: Initialize state with props](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props) *(doc)* — `createStore` ile store oluşturan fonksiyon, Context ve custom hook.
4. [TkDodo](https://tkdodo.eu/): [useState for one-time initializations](https://tkdodo.eu/blog/use-state-for-one-time-initializations) *(article)* — 12 Mart 2021. Tek seferlik başlatma için `useState` başlatıcısı.
5. [Zustand: useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store) *(doc)* — Vanilla store'a selector ile abone olmak.
6. [Zustand: Testing](https://zustand.docs.pmnd.rs/learn/guides/testing) *(doc)* — Global store'ları testler arasında sıfırlayan mock.
