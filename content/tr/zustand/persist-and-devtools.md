---
title: "Persist ve devtools"
description: "Kalıcı state, migration, hydration ve Redux DevTools."
lastVerified: "2026-10-21"
translationKey: "zustand/persist-and-devtools"
---

## persist ile saklamak

Sayfa yenilenince sepetin boşalmasını istemezsiniz. `persist` middleware'i store'u bir depolama alanına yazar ve açılışta geri okur. Varsayılan depolama `localStorage`'dır:[^1][^2]

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (item) =>
        set((state) => ({ items: [...state.items, { ...item, quantity: 1 }] })),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    { name: "cart" },
  ),
);
```

`name` zorunlu tek seçenektir; depolamadaki anahtardır ve uygulamada **benzersiz** olmalıdır.[^2] Kayıt `{"state": {...}, "version": 0}` biçiminde JSON olarak saklanır. Fonksiyonlar JSON'a yazılamadığı için action'lar kaydedilmez; açılışta koddan gelir.

v5'ten beri `persist`, store oluşturulurken ilk state'i depolamaya **yazmaz**. Kayıt ilk `set` çağrısında oluşur.[^3]

## partialize: Neyi saklayacağınızı seçin

Varsayılan olarak tüm state saklanır. Sepet çekmecesinin açık kalması gibi geçici değerleri saklamak istemezsiniz. `partialize` saklanacak alanları seçer:[^2]

```ts
{
  name: "cart",
  partialize: (state) => ({ items: state.items }),
}
```

Sekme kapanınca silinmesi gereken veri için `sessionStorage` kullanın:[^2]

```ts
import { createJSONStorage, persist } from "zustand/middleware";

persist(() => ({ note: "" }), {
  name: "checkout-draft",
  storage: createJSONStorage(() => sessionStorage),
});
```

> [!DONT]
>
> - Oturum token'ını `localStorage`'a yazan bir store kurmak. Sayfadaki herhangi bir script okuyabilir; nedenleri [Session, cookie ve JWT](/academy/auth-security/sessions-cookies-and-jwt) dersinde.

## version ve migrate

Saklanan verinin şekli değişirse eski kayıtlar yeni koda uymaz. `version`'ı artırın; depolamadaki sürüm koddakinden farklıysa kayıt varsayılan olarak **kullanılmaz**. Eski veriyi korumak için `migrate` yazın:[^2][^4]

```ts
{
  name: "cart",
  version: 1,
  partialize: (state) => ({ items: state.items }),
  migrate: (persisted, version) => {
    if (version === 0) {
      // v0'da adet yoktu: { products: { id, name, price }[] }
      const old = persisted as { products: Omit<CartItem, "quantity">[] };
      return { items: old.products.map((p) => ({ ...p, quantity: 1 })) };
    }
    return persisted as { items: CartItem[] };
  },
}
```

Okunan kayıt mevcut state ile **sığ** birleştirilir. İç içe bir nesnenin yalnızca bir kısmını saklıyorsanız yeni eklediğiniz alt alanlar kaybolabilir; o durumda `merge` seçeneğiyle kendi birleştirmenizi verin.[^2]

## Hydration

Depolamadan okuyup state'e yazma işine **hydration** denir. `localStorage` senkron olduğu için store oluşturulduğu anda hydrate olur. React Native'deki `AsyncStorage` ya da IndexedDB gibi asenkron depolamalarda hydration sonradan gelir; ilk render varsayılan değerlerle yapılır.[^2] Kullanıcı aslında giriş yapmışken uygulama bir an "giriş yapılmamış" görebilir.

Hydration'ı beklemek için `persist` API'sini kullanın:[^2]

```ts
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(() => useCartStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useCartStore.persist.hasHydrated());
    return unsubscribe;
  }, []);

  return hydrated;
}
```

## Next.js ile persist

[!nextjs] sayfayı önce sunucuda render eder. Sunucuda `localStorage` yoktur; sepet boş render edilir. Tarayıcıda store hemen dolu hydrate olursa ilk render sunucudakinden farklı olur ve React **hydration hatası** verir.[^2]

Çözüm hydration'ı mount sonrasına bırakmaktır. `skipHydration: true` otomatik hydration'ı kapatır; `rehydrate()`'i bir effect'te siz çağırırsınız:[^2]

```ts
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      /* ... */
    }),
    { name: "cart", skipHydration: true },
  ),
);
```

```tsx
"use client";

export function CartHydrator() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
```

Sunucu ve tarayıcının ilk render'ı aynı olur, kayıtlı sepet mount'tan hemen sonra gelir. Next.js'te store'u nerede oluşturacağınız [Context ile store](/academy/zustand/store-with-context) dersinde.

## devtools ile izlemek

`devtools` middleware'i store'u Redux DevTools tarayıcı eklentisine bağlar. Redux kullanmadan her değişikliği, önceki ve sonraki state'i görür, geçmişte gezinirsiniz.[^5]

Önce Chrome, Firefox ya da Edge için **Redux DevTools** eklentisini kurun. Doküman tipler için paketi de eklemenizi ister:[^5]

```command
npm install -D @redux-devtools/extension
```

```ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        isOpen: false,
        addItem: (item) =>
          set(
            (state) => ({ items: [...state.items, { ...item, quantity: 1 }] }),
            undefined,
            "cart/addItem",
          ),
        toggle: () => set((state) => ({ isOpen: !state.isOpen }), undefined, "cart/toggle"),
      }),
      { name: "cart" },
    ),
    { name: "CartStore" },
  ),
);
```

Üç ayrıntı:

- **Action adı.** `set`'in üçüncü argümanı panelde görünen addır. Vermezseniz her değişiklik `anonymous` görünür. İkinci argümanı `undefined` bırakın; `true` state'i birleştirmek yerine değiştirir.[^5]
- **Sıra.** `devtools`'u en dışa koyun. Diğer middleware'ler `setState`'i değiştirdiği için `devtools` içte kalırsa action adı tipi kaybolabilir.[^4]
- **Production.** Varsayılan olarak geliştirmede açık, production'da kapalıdır. Bu karar `import.meta.env.MODE`'a bakar; bu değişkeni tanımlamayan bir ortamda emin olmak için `enabled` seçeneğini açıkça verin *(ör. Vite'ta `enabled: import.meta.env.DEV`)*.[^5][^6]

Panelde varsayılan olarak tek bir store görünür; diğerleri için üstteki seçiciyi kullanın.[^5]

## Kendin dene

- Sepete `persist` ekleyin ve DevTools'un Application sekmesinde `localStorage`'daki kaydı bulun. Sayfayı yenileyin.
- `partialize` olmadan sepet çekmecesini açıp sayfayı yenileyin. Sonra `partialize` ekleyin.
- Kayıttaki `version`'ı elle `0` yapın, kodda `version: 1` ve `migrate` yazın. Sayfayı yenileyince ne oluyor?
- `devtools` ekleyin ve action adı vermeden bir ürün ekleyin. Panelde ne görünüyor?

## Detaylı öğrenmek için

- **Resmi doküman:** "Persisting store data"; tüm seçenekler, hydration, Next.js ve özel depolama.[^2]
- **Resmi doküman:** "persist"; sürüm ve migration'ı adım adım anlatan örnekler.[^1]
- **Resmi doküman:** "devtools"; slice'larda action adları, `actionsDenylist` ve `cleanup`.[^5]

## Kaynaklar

1. [Zustand: persist](https://zustand.docs.pmnd.rs/reference/middlewares/persist) *(doc)* — Middleware'in imzası, kısmi saklama, özel depolama ve sürümleme örnekleri.
2. [Zustand: Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) *(doc)* — `name`, `storage`, `partialize`, `version`, `migrate`, `merge`, `skipHydration`, hydration ve Next.js.
3. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — `persist`'in ilk state'i artık oluşturulurken yazmaması.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#using-middlewares) *(doc)* — Middleware'leri tiplerle kullanmak ve `devtools`'u en dışa koymak.
5. [Zustand: devtools](https://zustand.docs.pmnd.rs/reference/middlewares/devtools) *(doc)* — Redux DevTools bağlantısı, seçenekler, action adları ve tek store görünmesi.
6. [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode) *(doc)* — `import.meta.env.MODE` ve `import.meta.env.DEV`.
