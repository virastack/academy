---
title: "Effect ve ne zaman gerekmez"
description: "Dış sistemle senkronlama, cleanup, useEffectEvent ve Effect'siz çözümler."
lastVerified: "2026-10-21"
translationKey: "react/effects"
---

## Effect Ne İçindir

React'te kodun çoğu iki yerde çalışır: **render** *(JSX'i hesaplar, saf olmalı)* ve **event handler** *(tıklama gibi bir etkileşime cevap verir)*. **Effect** üçüncü yerdir: render'dan sonra çalışır ve component'i React dışındaki bir **sistemle senkronlar**. Tarayıcı API'si, bir WebSocket, bir harita kütüphanesi ya da üçüncü parti bir widget bu dış sistemlere örnektir.[^1]

```tsx
useEffect(() => {
  // setup: dış sisteme bağlan
  return () => {
    // cleanup: bağlantıyı kopar
  };
}, [dependency]);
```

[Dan Abramov](https://overreacted.io/)'un uzun `useEffect` rehberindeki ana fikir: *"Bu Effect ne zaman çalışır?"* yerine *"Bu Effect hangi state ile senkron?"* diye sorun. Her render kendi props ve state'ini görür; Effect de o render'ın değerleriyle çalışır.[^2]

## Effect Gerekmeyen Durumlar

React dokümanına göre en yaygın hata, dış sistem olmayan işler için Effect yazmaktır.[^3] [David Khourshid](https://github.com/davidkpiano) da React Advanced 2022 konuşmasında aynı noktayı vurgular: Effect'lerin çoğu aslında bir event'in sonucu olmalı.[^4]

| Effect ile yapılan | Bunun yerine |
| :-- | :-- |
| Props ya da state'ten değer hesaplamak | Render sırasında hesaplayın |
| Prop değişince tüm state'i sıfırlamak | Component'e `key` verin |
| Kullanıcı bir şey yaptığında istek atmak | Event handler'da yapın |
| State değişince ebeveyne haber vermek | Aynı event handler'da ebeveynin fonksiyonunu çağırın |
| Bir state değişince başka bir state'i güncellemek *(Effect zinciri)* | Hepsini tek event handler'da hesaplayın |
| Uygulama açılışında bir kez çalışacak kod | Modül seviyesinde, component dışında |
| Veri çekmek | Framework, [TanStack Query](/academy/tanstack-query) ya da `use` + Suspense |

```tsx
// ❌ Satın alma bir event, Effect değil
useEffect(() => {
  if (submitted) {
    post("/api/orders", cart);
  }
}, [submitted, cart]);

// ✅
function handleCheckout() {
  post("/api/orders", cart);
}
```

> [!TIP]
>
> Kendinize sorun: *"Bu kod, component **ekranda göründüğü için** mi çalışmalı, yoksa kullanıcı **bir şey yaptığı için** mi?"* İkincisiyse event handler'a aittir.[^5]

`eslint-plugin-react-hooks`'un `set-state-in-effect` kuralı, Effect içinde senkron `setState`'i yakalar. Bu kalıp hem fazladan bir render demektir hem de çoğu zaman türetilmiş state'in işaretidir.[^6]

## Cleanup

Effect bir şeyi başlatıyorsa *(abonelik, zamanlayıcı, event listener, bağlantı)* durdurmayı da cleanup'ta yapar. React cleanup'ı Effect yeniden çalışmadan önce ve component kaldırılırken çağırır.[^1]

```tsx
function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);
}
```

Strict Mode development'ta her Effect'i *setup → cleanup → setup* sırasıyla çalıştırır. Kullanıcı bu farkı hissetmiyorsa cleanup doğrudur. Bağlantı iki kez açılıyorsa sorun Strict Mode değil, eksik cleanup'tır.[^1]

## Bağımlılıklar

Effect'in içinde kullanılan her reaktif değer *(props, state, component içinde tanımlanan değişken ve fonksiyonlar)* bağımlılık dizisine girer. `exhaustive-deps` kuralı eksikleri gösterir.[^7]

> [!DONT]
>
> - Bağımlılık dizisi hakkında "yalan söylemek": lint'i susturmak ya da eksik değerle `[]` yazmak. Effect eski değerlerle çalışır ve hata ancak belirli bir sırayla tıklandığında ortaya çıkar.[^2]
> - Effect'i yeniden çalıştırmamak için bağımlılıklara `useCallback` ve `useMemo` yığmak. Önce fonksiyonu Effect'in içine ya da component dışına taşıyın.[^2][^7]

[TkDodo](https://tkdodo.eu/)'nun üç pratik önerisi daha var: her Effect tek bir iş yapsın *(başlığı güncellemek ve analytics'i ayrı Effect'lere bölün)*, Effect'e `useEffect(function syncTitle() {...})` gibi bir isim verin ve tekrar eden Effect'leri adı olan bir custom hook'a taşıyın.[^8]

## useEffectEvent

Bazen Effect'in içinde bir değeri **okumak** istersiniz ama o değer değişince Effect'in **yeniden senkronlanmasını** istemezsiniz. React 19.2 ile kararlı hâle gelen `useEffectEvent` bunun içindir.[^9][^10]

```tsx
import { useEffect, useEffectEvent } from "react";

function ProductPage({ productId, cartCount }: ProductPageProps) {
  const onVisit = useEffectEvent((visitedId: string) => {
    logVisit(visitedId, cartCount); // her zaman güncel cartCount
  });

  useEffect(() => {
    onVisit(productId);
  }, [productId]); // yalnızca ürün değişince
}
```

Sepet sayısı değiştiğinde ziyaret yeniden loglanmaz; ürün değiştiğinde loglanır ve o anki sepet sayısını görür.

> [!WARNING]
>
> `useEffectEvent`'i bağımlılık dizisini kısaltmanın kestirmesi olarak kullanmayın. Yalnızca Effect'ten tetiklenen, gerçekten "event" gibi davranan mantık için kullanın. Effect Event'ler yalnızca Effect içinden çağrılır, başka component'e geçirilmez.[^10]

## Effect İçinde Veri Çekmek

Mecbursanız iki şeye dikkat edin: **race condition** *(hızlı yazan kullanıcıda eski cevabın yenisini ezmesi)* ve cleanup. İsteği iptal etmek için `AbortController` kullanın:[^3]

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/products?q=${query}`, { signal: controller.signal })
    .then((response) => response.json())
    .then((data: Product[]) => setResults(data))
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setError(error);
    });
  return () => controller.abort();
}, [query]);
```

Bu kodda hâlâ cache, tekrar deneme, yükleme durumu ve waterfall sorunu yok. React dokümanı bu yüzden framework'ün veri çekme yöntemini ya da bir kütüphaneyi önerir.[^3] [TkDodo](https://tkdodo.eu/)'nun kuralı kısa: asenkron işlerde Effect de değil ref de değil, TanStack Query.[^11] Suspense ve `use` ile veri okumayı ilerideki derste göreceksiniz.

## Kendin Dene

- Bir modal'a `useEscapeKey` ekleyin; cleanup'ı silin ve modalı birkaç kez açıp kapattıktan sonra Escape'e basınca ne olduğunu görün.
- Projenizde `useEffect` arayın. Her biri için tablodaki soruyu sorun: dış sistem var mı?
- Effect içinde `setFiltered(products.filter(...))` yazın ve `set-state-in-effect` uyarısını okuyun; sonra render'da hesaplayın.
- Arama kutusunda `AbortController`'ı kaldırın, DevTools'ta ağı "Slow 4G" yapın ve hızlı yazıp sonucu izleyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "You Might Not Need an Effect"; Effect gerektirmeyen yaygın durumlar ve çözümleri. React'in en çok okunması gereken sayfalarından.[^3]
- **Yazı:** [Dan Abramov](https://overreacted.io/)'un "A Complete Guide to useEffect" yazısı; 2019 tarihli ve uzun, ama "her render'ın kendi değerleri vardır" fikrini en iyi anlatan kaynak.[^2]
- **Video:** [David Khourshid](https://github.com/davidkpiano)'un "Using useEffect Effectively" konuşması *(React Advanced 2022, 30 dk)*.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun "Simplifying useEffect" yazısı; tek sorumluluk, isimlendirme ve custom hook.[^8]

## Kaynaklar

1. [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) *(doc)* — Effect'in render ve event'ten farkı, cleanup ve Strict Mode'da iki kez çalışma.
2. [Dan Abramov](https://overreacted.io/): [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/) *(article)* — 9 Mart 2019. Her render'ın kendi props ve state'i, bağımlılıklar hakkında yalan söylememek.
3. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Gereksiz Effect kalıpları, Effect zincirleri ve race condition'lı veri çekme.
4. [David Khourshid](https://github.com/davidkpiano): [Using useEffect Effectively (React Advanced 2022)](https://gitnation.com/contents/using-useeffect-effectively) *(video)* — 30 dakika. Effect'leri event'lere taşımak ve veri çekme için Effect kullanmamak.
5. [React: Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) *(doc)* — Event handler ile Effect arasında seçim ve reaktif mantık.
6. [React: set-state-in-effect lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect) *(doc)* — Effect içinde senkron `setState`'in fazladan render'a yol açması.
7. [React: Removing Effect Dependencies](https://react.dev/learn/removing-effect-dependencies) *(doc)* — Bağımlılıkları lint'i susturmadan azaltmak; fonksiyon ve objeleri Effect içine taşımak.
8. [TkDodo](https://tkdodo.eu/): [Simplifying useEffect](https://tkdodo.eu/blog/simplifying-use-effect) *(article)* — 23 Ocak 2021. Daha az Effect, tek sorumluluk, custom hook ve isimlendirilmiş Effect.
9. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — 1 Ekim 2025. `useEffectEvent` ve `<Activity>`'nin kararlı sürümü.
10. [React: useEffectEvent](https://react.dev/reference/react/useEffectEvent) *(doc)* — Effect Event'in güncel değeri okuması ve kullanım sınırları.
11. [TkDodo](https://tkdodo.eu/): [Ref Callbacks, React 19 and the Compiler](https://tkdodo.eu/blog/ref-callbacks-react-19-and-the-compiler) *(article)* — 8 Aralık 2024. Ref callback mi Effect mi kararı; asenkron işler için TanStack Query.
