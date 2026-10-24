---
title: "View Transition ve Activity"
description: "Geçişleri canlandırma ve gizlenen ekranın state'ini koruma."
lastVerified: "2026-10-21"
translationKey: "react/view-transitions-and-activity"
---

## İki Yeni Bileşen

React 19.2 `<Activity>`'yi, React 19.3 de `<ViewTransition>`'ı kararlı hâle getirdi.[^1][^2] İkisi de aynı soruya cevap verir: arayüz bir durumdan diğerine geçerken ne olmalı? `ViewTransition` geçişi **canlandırır**, `Activity` gizlenen parçanın **state'ini korur**.

## ViewTransition

`<ViewTransition>`, tarayıcının View Transition API'sini React'e bağlar. Animasyon istediğiniz parçayı sarmanız yeterlidir:[^2][^3]

```tsx
import { startTransition, useState, ViewTransition } from "react";

function SizeGuideToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => startTransition(() => setIsOpen((open) => !open))}>
        Beden tablosu
      </button>
      {isOpen && (
        <ViewTransition>
          <SizeGuide />
        </ViewTransition>
      )}
    </>
  );
}
```

> [!WARNING]
>
> Animasyon yalnızca güncelleme bir **Transition** olduğunda çalışır: `startTransition`, bir Suspense boundary'nin açılması ya da `useDeferredValue`. Düz `setState` acildir ve animasyonsuz uygulanır.[^3] "Animasyon çalışmıyor" sorununun en sık sebebi budur.

React ağacın nasıl değiştiğine bakıp animasyonun türünü kendisi seçer:[^3]

| Tür | Ne zaman |
| :-- | :-- |
| `enter` | `ViewTransition` eklendiğinde |
| `exit` | `ViewTransition` kaldırıldığında |
| `update` | İçeriği ya da boyutu değiştiğinde |
| `share` | Aynı `name`'e sahip biri kaldırılıp diğeri eklendiğinde |

Varsayılan animasyon tarayıcının cross-fade'idir. Özelleştirmek için türe bir **View Transition Class** verir, CSS'te view transition pseudo-elemanlarıyla stillersiniz:[^3]

```tsx
<ViewTransition enter="slide-up" exit="slide-down">
  <CartDrawer />
</ViewTransition>
```

```css
::view-transition-new(.slide-up) {
  animation: 250ms ease-out both slide-from-bottom;
}
::view-transition-old(.slide-down) {
  animation: 200ms ease-in both slide-to-bottom;
}
```

Birkaç kural:

- **Ortak eleman geçişi için `name` verin.** Liste sayfasındaki ürün görseli ile detay sayfasındaki büyük görsel aynı `name`'i taşırsa React biri kaybolup diğeri gelirken görseli yerinden büyüterek taşır. `name` uygulamada aynı anda tek olmalıdır; `` name={`product-${id}`} `` gibi bir önek kullanın. Diğer durumlarda isim vermeyin, React otomatik verir.[^3]
- **Yönü `addTransitionType` ile söyleyin.** Galeride ileri ve geri aynı state'i değiştirir ama farklı yöne kaymalıdır; transition'a bir tür ekleyip class'ı türe göre seçersiniz.[^2][^3]
- **`enter`/`exit` yalnızca en üstte çalışır.** `ViewTransition`'ın üstünde bir DOM elemanı varsa ekleme ve çıkarma animasyonu tetiklenmez.[^3]
- **`startViewTransition`'ı kendiniz çağırmayın.** React çağırır ve başka bir View Transition'ı keser.[^3]

### Suspense ile

`<ViewTransition>` bir Suspense boundary'yi sardığında React iskeletten içeriğe geçişi canlandırır. 19.3 ile React, açılış animasyonundan önce görünür görselleri ve yeni fontları en fazla 500 ms bekler; içerik görseli yerinde açılır, metin yanlış fontla yanıp sönmez.[^2][^4]

```tsx
<ViewTransition>
  <Suspense fallback={<ProductSkeleton />}>
    <ProductDetails id={id} />
  </Suspense>
</ViewTransition>
```

### Erişilebilirlik

React, hareketi azaltmak isteyen kullanıcılar için animasyonları **kendiliğinden kapatmaz**. Dokümanın önerisi: her zaman `prefers-reduced-motion` ile kapatın ya da yumuşatın.[^3]

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

Konunun ayrıntısı [Renk, kontrast ve hareket](/academy/performance-accessibility/color-contrast-and-motion) dersinde.

## Activity

`<Activity>` bir parçayı ekrandan kaldırmadan **gizler**. `mode="hidden"` olduğunda React çocukları `display: none` ile saklar ve Effect'lerini söker. `visible`'a dönünce state ve DOM olduğu gibi geri gelir, Effect'ler yeniden kurulur.[^5]

```tsx
import { Activity, useState } from "react";

function ProductTabs() {
  const [tab, setTab] = useState<"details" | "reviews">("details");

  return (
    <>
      <TabBar value={tab} onChange={setTab} />
      <Activity mode={tab === "details" ? "visible" : "hidden"}>
        <ProductDescription />
      </Activity>
      <Activity mode={tab === "reviews" ? "visible" : "hidden"}>
        <ReviewList />
      </Activity>
    </>
  );
}
```

Koşullu render'dan farkı:

| | `{isOpen && <Panel />}` | `<Activity mode>` |
| :-- | :-- | :-- |
| Gizlenince state | Silinir | Korunur |
| Gizlenince DOM | Silinir | `display: none` |
| Gizlenince Effect'ler | Söküldü | Söküldü |
| Yeniden açılış | Sıfırdan mount | Anında, kaldığı yerden |

Tipik kullanımlar: kullanıcının yazdığı yorum taslağı sekme değişince kaybolmasın, kapatılan kenar menüsü kaydırma konumunu hatırlasın. Ayrıca kullanıcının **muhtemelen** açacağı bir ekranı gizli modda önceden render edip verisini hazırlayabilirsiniz; gizli parça daha düşük öncelikle render edilir.[^5][^6]

> [!TIP]
>
> Gizlenen parçada video, ses ya da bir zamanlayıcı varsa Effect cleanup'ında durdurun. Activity Effect'leri söker ama `<video>` elemanı DOM'da kalır ve kendi kendine oynamaya devam edebilir.[^5]

## Kendin Dene

- `SizeGuideToggle`'da `startTransition`'ı kaldırın; animasyon ne oldu?
- `CartDrawer` için `slide-up`/`slide-down` class'larını ve `@keyframes`'leri yazın, sonra işletim sisteminizde "hareketi azalt" ayarını açıp deneyin.
- Ürün kartındaki görsel ile detaydaki görsele aynı `name`'i verin ve sayfa geçişini izleyin.
- `ProductTabs`'ta yorum formuna bir şey yazın, sekmeyi değiştirip geri dönün. Sonra `Activity` yerine `&&` kullanıp tekrar deneyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** `<ViewTransition>` referansı; ekleme/çıkarma, ortak eleman, liste sıralama, Suspense ve JavaScript ile animasyon örnekleri.[^3]
- **Video:** [Chance Strickland](https://chance.dev/)'ın React ekibiyle birlikte hazırladığı "View Transitions and Activity" konuşması *(React Conf 2025, 1. gün)*.[^7]
- **Resmi doküman:** React Labs'in Nisan 2025 yazısı; iki özelliğin neden ve nasıl tasarlandığı.[^6]

## Kaynaklar

1. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — 1 Ekim 2025. `<Activity>`'nin kararlı sürümü.
2. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — 9 Eylül 2026. `<ViewTransition>`, `addTransitionType` ve Suspense ile görsel ve font bekleme.
3. [React: ViewTransition](https://react.dev/reference/react/ViewTransition) *(doc)* — Tetikleyiciler, View Transition Class, `name`, üst seviye kuralı ve `prefers-reduced-motion` notu.
4. [React: Suspense, What activates a Suspense boundary](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) *(doc)* — ViewTransition varken görseller ve fontlar için 500 ms bekleme.
5. [React: Activity](https://react.dev/reference/react/Activity) *(doc)* — Gizli modda `display: none`, Effect'lerin sökülmesi, state'in korunması ve medya uyarısı.
6. [React Blog: React Labs, View Transitions, Activity, and more](https://react.dev/blog/2025/04/23/react-labs-view-transitions-activity-and-more) *(doc)* — 23 Nisan 2025. İki özelliğin deneysel duyurusu ve tasarım gerekçesi.
7. [Chance Strickland](https://chance.dev/): [View Transitions and Activity (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=4870s) *(video)* — 1. gün yayını. `<Activity>` ve `<ViewTransition>` ile doğal hissettiren animasyonlar.
