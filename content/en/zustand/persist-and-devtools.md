---
title: "Persist and devtools"
description: "Persistent state, migrations, hydration and Redux DevTools."
lastVerified: "2026-10-21"
translationKey: "zustand/persist-and-devtools"
---

## Storing with persist

You do not want the cart to empty when the page is reloaded. The `persist` middleware writes the store to a storage area and reads it back at startup. The default storage is `localStorage`:[^1][^2]

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

`name` is the only required option; it is the key in the storage and has to be **unique** in the application.[^2] The entry is stored as JSON in the form `{"state": {...}, "version": 0}`. Because functions cannot be written to JSON, the actions are not stored; they come from the code at startup.

Since v5, `persist` **does not write** the initial state to storage when the store is created. The entry appears on the first `set` call.[^3]

## partialize: choose what to store

By default the whole state is stored. You do not want to store temporary values such as whether the cart drawer is open. `partialize` picks the fields to store:[^2]

```ts
{
  name: "cart",
  partialize: (state) => ({ items: state.items }),
}
```

For data that should go when the tab closes, use `sessionStorage`:[^2]

```ts
import { createJSONStorage, persist } from "zustand/middleware";

persist(() => ({ note: "" }), {
  name: "checkout-draft",
  storage: createJSONStorage(() => sessionStorage),
});
```

> [!DONT]
>
> - Building a store that writes the session token to `localStorage`. Any script on the page can read it; the reasons are in the [Sessions, cookies and JWT](/academy/auth-security/sessions-cookies-and-jwt) lesson.

## version and migrate

If the shape of the stored data changes, old entries no longer fit the new code. Raise the `version`; when the version in storage differs from the one in the code, the entry is **not used** by default. To keep the old data, write a `migrate`:[^2][^4]

```ts
{
  name: "cart",
  version: 1,
  partialize: (state) => ({ items: state.items }),
  migrate: (persisted, version) => {
    if (version === 0) {
      // v0 had no quantity: { products: { id, name, price }[] }
      const old = persisted as { products: Omit<CartItem, "quantity">[] };
      return { items: old.products.map((p) => ({ ...p, quantity: 1 })) };
    }
    return persisted as { items: CartItem[] };
  },
}
```

The entry that is read is merged **shallowly** with the current state. If you store only part of a nested object, the sub-fields you added later can be lost; supply your own merge with the `merge` option in that case.[^2]

## Hydration

Reading from storage and writing into the state is called **hydration**. Because `localStorage` is synchronous, the store hydrates the moment it is created. With asynchronous storage, such as `AsyncStorage` in React Native or IndexedDB, hydration arrives later and the first render happens with the default values.[^2] The application can show "not signed in" for a moment while the user actually is.

To wait for hydration, use the `persist` API:[^2]

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

## persist with Next.js

[!nextjs] renders the page on the server first. There is no `localStorage` on the server, so the cart is rendered empty. If the store hydrates with its contents straight away in the browser, the first render differs from the server's and React raises a **hydration error**.[^2]

The answer is to leave hydration until after the mount. `skipHydration: true` turns the automatic hydration off and you call `rehydrate()` yourself in an effect:[^2]

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

The server's and the browser's first render match, and the stored cart arrives right after the mount. Where to create the store in Next.js is in the [A store with Context](/academy/zustand/store-with-context) lesson.

## Watching with devtools

The `devtools` middleware connects the store to the Redux DevTools browser extension. Without using Redux, you see every change with the state before and after it, and you can move through the history.[^5]

First install the **Redux DevTools** extension for Chrome, Firefox or Edge. The documentation asks you to add the package too, for the types:[^5]

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

Three details:

- **The action name.** `set`'s third argument is the name shown in the panel. Without it, every change appears as `anonymous`. Leave the second argument `undefined`; `true` replaces the state instead of merging it.[^5]
- **The order.** Put `devtools` on the outside. Because other middleware change `setState`, the action name's type can be lost if `devtools` sits inside.[^4]
- **Production.** It is on in development and off in production by default. That decision looks at `import.meta.env.MODE`; in an environment that does not define that variable, set the `enabled` option explicitly to be sure *(for instance `enabled: import.meta.env.DEV` in Vite)*.[^5][^6]

By default only one store appears in the panel; use the selector at the top for the others.[^5]

## Try it yourself

- Add `persist` to the cart and find the entry in `localStorage` in the DevTools Application tab. Reload the page.
- Open the cart drawer without `partialize` and reload the page. Then add `partialize`.
- Set the `version` in the entry to `0` by hand, and write `version: 1` and a `migrate` in the code. What happens when you reload the page?
- Add `devtools` and add a product without giving an action name. What appears in the panel?

## Going deeper

- **Official docs:** "Persisting store data"; all the options, hydration, Next.js and custom storage.[^2]
- **Official docs:** "persist"; examples that walk through versioning and migration.[^1]
- **Official docs:** "devtools"; action names in slices, `actionsDenylist` and `cleanup`.[^5]

## Sources

1. [Zustand: persist](https://zustand.docs.pmnd.rs/reference/middlewares/persist) *(doc)* — The middleware's signature, partial storage, custom storage and versioning examples.
2. [Zustand: Persisting store data](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) *(doc)* — `name`, `storage`, `partialize`, `version`, `migrate`, `merge`, `skipHydration`, hydration and Next.js.
3. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — `persist` no longer writing the initial state at creation.
4. [Zustand: Advanced TypeScript Guide](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript#using-middlewares) *(doc)* — Using middleware with types, and putting `devtools` on the outside.
5. [Zustand: devtools](https://zustand.docs.pmnd.rs/reference/middlewares/devtools) *(doc)* — The Redux DevTools connection, the options, action names, and only one store appearing.
6. [Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode) *(doc)* — `import.meta.env.MODE` and `import.meta.env.DEV`.
