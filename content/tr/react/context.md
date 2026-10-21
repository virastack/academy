---
title: "Context"
description: "Prop drilling olmadan veri paylaşmak, use ile context okumak, reducer ile birlikte kullanmak ve sınırları."
lastVerified: "2026-10-21"
translationKey: "react/context"
---

## Context Ne Çözer

**Context**, bir değeri aradaki component'lere prop olarak geçirmeden ağacın derinlerine ulaştırır. Bir component değeri **sağlar** *(provide)*, altındaki herhangi bir component **okur**.[^1]

Tipik kullanımlar: tema, oturum açmış kullanıcı, dil, sepet gibi uygulamanın geniş bir bölümünün ihtiyaç duyduğu ve seyrek değişen veriler.[^1]

> [!TIP]
>
> Context'e uzanmadan önce [Props ve composition](/academy/react/props-and-composition) dersindeki iki adımı deneyin: props ile devam edin ya da ara component'lere `children` verin. React dokümanı Context'i ancak bunlar yetmediğinde önerir.[^1]

## Üç Adım

```tsx
import { createContext, use, useState } from "react";

type Theme = "light" | "dark";

// 1. Oluştur
const ThemeContext = createContext<Theme>("light");

// 2. Sağla
export function App() {
  const [theme, setTheme] = useState<Theme>("light");
  return (
    <ThemeContext value={theme}>
      <ProductPage />
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        Temayı değiştir
      </button>
    </ThemeContext>
  );
}

// 3. Oku
function PriceTag({ amount }: { amount: number }) {
  const theme = use(ThemeContext);
  return <span className={`price price-${theme}`}>{amount} TL</span>;
}
```

İki güncel ayrıntı:

- React 19'dan beri provider olarak doğrudan `<ThemeContext value={...}>` yazılır; `<ThemeContext.Provider>` hâlâ çalışır ama ileride deprecated olacak.[^2]
- Context'i `useContext` ile de `use` ile de okuyabilirsiniz. `use`, `if` içinde ya da erken `return`'den sonra da çağrılabilir; `useContext` çağrılamaz.[^3]

Okuyan component, ağaçta kendisine **en yakın** provider'ın değerini alır. Provider yoksa `createContext`'e verilen varsayılan değeri görür.[^1]

## Provider'ı Custom Hook ile Sarmak

Context'in çoğu zaman anlamlı bir varsayılan değeri yoktur. [Kent C. Dodds](https://kentcdodds.com/)'un kalıbı: varsayılanı `null` yapın, context'i dışarı açmayın, okumak için provider yokken hata fırlatan bir hook export edin.[^4]

```tsx
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = use(CartContext);
  if (cart === null) {
    throw new Error("useCart, CartProvider içinde kullanılmalı.");
  }
  return cart;
}
```

Tip tarafı [React'te tipler](/academy/typescript/types-in-react) dersinde.

## Reducer ile Birlikte

Context **taşır**, state **tutmaz**. Paylaşılan ve değişen bir veri için Context'i `useState` ya da `useReducer` ile birleştirirsiniz. React dokümanı state'i ve `dispatch`'i iki ayrı context'e koymayı önerir.[^5]

```tsx
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
```

`dispatch` hiç değişmez. Yalnızca "Sepete ekle" butonu gibi `dispatch`'e ihtiyaç duyan component'ler sepet değiştiğinde render olmaz.[^5][^6]

## Performans ve Sınırlar

Provider'ın `value`'su değiştiğinde onu okuyan **tüm** component'ler render olur. Bu yüzden:[^6][^7]

- **Seyrek değişen veriyi koyun.** Tema, kullanıcı ve dil iyi adaydır. Fare konumu ya da her tuşta değişen form değeri kötü adaydır.
- **İlgisiz değerleri ayırın.** Tek dev bir `AppContext` yerine `ThemeContext`, `UserContext`, `CartContext`.
- **Değeri her render'da yeniden oluşturmayın.** `value={{ items, addItem }}` her render'da yeni bir obje üretir. React Compiler bunu kendisi memoize eder; compiler yoksa `useMemo` kullanın.[^7]

Context bir state yönetim kütüphanesi değildir. [TkDodo](https://tkdodo.eu/), Context'i değerin kendisi için değil, Zustand store'u ya da React Query client'ı gibi **değişmeyen bir örneği** paylaşmak için kullanmayı önerir; değer seçimini kütüphanenin selector'ları yapar.[^8] Sık değişen global client state için [Zustand](/academy/zustand), sunucu verisi için [TanStack Query](/academy/tanstack-query) rehberine bakın.

[!nextjs] gibi Server Components kullanan bir framework'te Server Component Context **oluşturamaz** ama React 19.3'ten beri `'use client'` modülünden import ettiği Context'i doğrudan render edebilir; ayrı bir `Provider` sarmalayıcısı gerekmez.[^9]

## Kendin Dene

- `ThemeContext`'i kurun ve provider'ı silin. `PriceTag` hangi temayı gösteriyor?
- `useCart`'ı provider dışında çağırın ve hata mesajını görün.
- Sepete ekleme butonuna `console.log("render")` koyun. Önce state ve `dispatch`'i tek context'te, sonra iki ayrı context'te tutun ve sepete ürün eklerken logları sayın.
- Bir `if (!isOpen) return null;` satırından sonra `use(ThemeContext)` çağırın; aynısını `useContext` ile deneyip lint'in ne dediğine bakın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Passing Data Deeply with Context" ve "Scaling Up with Reducer and Context"; ikincisi sepet benzeri bir görev listesini adım adım kurar.[^1][^5]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un "How to use React Context effectively" yazısı.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun Zustand store'unu Context ile bir alt ağaca sınırlama yazısı.[^8]

## Kaynaklar

1. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — Context'in üç adımı, en yakın provider, kullanım alanları ve Context'ten önce denenecekler.
2. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `<Context>`'in provider olarak kullanılması ve `<Context.Provider>`'ın ileride deprecated olacağı.
3. [React: use](https://react.dev/reference/react/use) *(doc)* — Context'i koşullu okuyabilen `use` ve `useContext` farkı.
4. [Kent C. Dodds](https://kentcdodds.com/): [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) *(article)* — 5 Haziran 2021. Provider dışında hata fırlatan custom hook ve context'i dışarı açmamak.
5. [React: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) *(doc)* — State ve `dispatch`'i ayrı context'lere koymak, provider component'i.
6. [React: useContext](https://react.dev/reference/react/useContext) *(doc)* — Değer değişince okuyan component'lerin render olması ve değeri memoize etmek.
7. [Kent C. Dodds](https://kentcdodds.com/): [How to optimize your context value](https://kentcdodds.com/blog/how-to-optimize-your-context-value) *(article)* — 8 Mart 2021. Context değerini memoize etmek ve state ile dispatch'i ayırmak.
8. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — 14 Nisan 2024. Context ile değer yerine store örneğini paylaşmak.
9. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — 9 Eylül 2026. Server Components'in Context'i doğrudan render edebilmesi.
