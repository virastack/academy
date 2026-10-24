---
title: "Custom hook"
description: "Hook kuralları, mantığı hook'a taşıma ve useSyncExternalStore."
lastVerified: "2026-10-21"
translationKey: "react/custom-hooks"
---

## Hook kuralları

`use` ile başlayan her fonksiyon bir **hook**'tur. İki kural vardır:[^1]

1. **Yalnızca en üst seviyede çağırın.** `if`, döngü, iç içe fonksiyon ya da erken `return`'den sonra çağırmayın.
2. **Yalnızca React fonksiyonlarından çağırın.** Component'lerden ya da başka hook'lardan; sıradan bir fonksiyondan değil.

Neden? React hook'ları isimle değil **çağrılma sırasıyla** tanır. Birinci `useState` her render'da birinci olmalıdır; bir koşul sırayı değiştirirse state'ler karışır. [Dan Abramov](https://overreacted.io/) bu tasarımın arkasındaki ödünleşimleri uzun bir yazıda anlatıyor.[^2] İstisna `use`'dur: koşul içinde çağrılabilir.[^3] `rules-of-hooks` lint kuralı ihlalleri yakalar.

## Custom hook nedir

Custom hook, içinde başka hook'lar çağıran ve adı `use` ile başlayan sıradan bir fonksiyondur. Component'lerdeki tekrar eden **mantığı** paylaşır.[^4]

```tsx
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

```tsx
function ProductSearch() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  // debouncedQuery ile arama yap
}
```

> [!WARNING]
>
> Hook mantığı paylaşır, **state'i paylaşmaz**. `useDebouncedValue`'yu iki component'te çağırırsanız iki ayrı state oluşur. Ortak state gerekiyorsa state'i ebeveyne taşıyın ya da Context kullanın.[^4]

## İyi bir hook

- **Amacı somut olsun.** `useMount` ya da `useEffectOnce` gibi yaşam döngüsü hook'ları yazmayın; `useOnlineStatus`, `useProduct(id)`, `useDebouncedValue` gibi ne işe yaradığını söyleyen isimler verin.[^4]
- **Arayüzü küçük olsun.** [TkDodo](https://tkdodo.eu/)'nun örneğinde başlığı yalnızca `document.title`'da gösteren bir hook, değeri hiç dışarı açmaz; sadece setter'ı döndürür. Hook'a ait olan her şey içinde kalır.[^5]
- **Effect'leri sarın.** Component'teki her Effect, adı olan bir hook'a taşınmaya adaydır. Component *"nasıl"*ı değil *"ne"*yi anlatır.[^4][^5]
- **Gereksiz yere çıkarmayın.** Tek bir `useState`'i saran hook ya da hiç hook çağırmayan `useFormatPrice` gibi fonksiyonlar gereksizdir. Hook çağırmıyorsa adı `formatPrice` olmalıdır.[^4]

Hook'u nereye koyacağınız ve ne zaman ortak klasöre taşıyacağınız [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde.

## Dış bir kaynağa abone olmak

Tarayıcının bağlantı durumu, `localStorage`, ekran genişliği ya da bir store gibi React dışında tutulan veriyi okumak için Effect + `useState` yerine `useSyncExternalStore` kullanın. React dokümanı bu iş için elle yazılmış Effect yerine bu hook'u önerir.[^6][^7]

```tsx
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine, // tarayıcıda değer
    () => true, // sunucuda değer
  );
}
```

`subscribe` component dışında tanımlıdır; her render'da yeni fonksiyon verirseniz React yeniden abone olur.[^6] Üçüncü argüman, sunucuda render ederken kullanılacak değerdir. [TkDodo](https://tkdodo.eu/), bu argümanın SSR'da hydration uyuşmazlığını önlemek için de kullanılabileceğini gösterir.[^8]

```tsx
function CheckoutButton() {
  const isOnline = useOnlineStatus();
  return <button disabled={!isOnline}>{isOnline ? "Ödemeye geç" : "Bağlantı yok"}</button>;
}
```

## Hook'u test etmek

Custom hook'u kullanan component üzerinden test etmek çoğu zaman yeterlidir. Hook tek başına bir kütüphane gibi kullanılıyorsa React Testing Library'nin `renderHook`'u ile test edilir; [Provider ve Hook](/academy/vitest/provider-and-hook) dersi anlatıyor.

## Kendin dene

- `useDebouncedValue`'yu bir arama kutusunda kullanın; `query` ve `debouncedQuery`'yi yan yana ekrana basıp farkı görün.
- `useOnlineStatus`'u iki farklı component'te kullanın. DevTools'ta Network sekmesinden "Offline" seçin; ikisi de güncelleniyor mu?
- `subscribe`'ı component'in içine taşıyın ve React DevTools Profiler'da ne değiştiğine bakın.
- Projenizde bir component'teki iki Effect'i, adı ne yaptığını söyleyen iki hook'a taşıyın.

## Detaylı öğrenmek için

- **Resmi doküman:** "Reusing Logic with Custom Hooks"; `useOnlineStatus`'tan `useChatRoom`'a adım adım hook çıkarma.[^4]
- **Yazı:** [Dan Abramov](https://overreacted.io/)'un "Why Do Hooks Rely on Call Order?" yazısı; hook kurallarının nedenini alternatif tasarımlarla karşılaştırır.[^2]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun "Simplifying useEffect" yazısındaki custom hook bölümü.[^5]

## Kaynaklar

1. [React: Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) *(doc)* — Hook'ları yalnızca üst seviyede ve React fonksiyonlarından çağırma kuralı.
2. [Dan Abramov](https://overreacted.io/): [Why Do Hooks Rely on Call Order?](https://overreacted.io/why-do-hooks-rely-on-call-order/) *(article)* — 13 Aralık 2018. Çağrılma sırasına dayanan tasarım ve alternatiflerinin sorunları.
3. [React: use](https://react.dev/reference/react/use) *(doc)* — Koşul içinde çağrılabilen `use`.
4. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Mantığı paylaşmak, state'i paylaşmamak, isimlendirme ve yaşam döngüsü hook'larından kaçınma.
5. [TkDodo](https://tkdodo.eu/): [Simplifying useEffect](https://tkdodo.eu/blog/simplifying-use-effect) *(article)* — 23 Ocak 2021. Effect'leri isimli hook'lara taşımak ve küçük arayüz.
6. [React: useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) *(doc)* — Dış store'a abone olmak, `subscribe`'ı dışarıda tanımlamak ve sunucu değeri.
7. [React: You Might Not Need an Effect, Subscribing to an external store](https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store) *(doc)* — Effect + state yerine `useSyncExternalStore` önerisi.
8. [TkDodo](https://tkdodo.eu/): [Avoiding Hydration Mismatches with useSyncExternalStore](https://tkdodo.eu/blog/avoiding-hydration-mismatches-with-use-sync-external-store) *(article)* — 21 Şubat 2024. `getServerSnapshot` ile sunucu ve istemci değerini ayırmak.
