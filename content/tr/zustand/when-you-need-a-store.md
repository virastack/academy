---
title: "Ne zaman store gerekir"
description: "State türlerini ayırmak, local state ve Context'in yetmediği yer, Zustand'ın ne olduğu ve diğer kütüphanelerden farkı."
lastVerified: "2026-10-21"
translationKey: "zustand/when-you-need-a-store"
---

## Önce State'i Sınıflandırın

Global bir store açmadan önce verinin hangi türe girdiğine bakın. Çoğu veri bir store'a hiç ihtiyaç duymaz:[^1][^2]

| Tür | Örnek | Nerede |
| :-- | :-- | :-- |
| Local state | Açılır menü açık mı, input değeri | `useState` |
| Server state | Ürün listesi, sipariş | [TanStack Query](/academy/tanstack-query) |
| URL state | Arama metni, sayfa, sıralama | Router'ın search params'ı |
| Paylaşılan client state | Sepet, tema, kenar çubuğu açık mı | Context ya da [!zustand] |

[TkDodo](https://tkdodo.eu/) bunu kendi deneyimiyle anlatır: uygulamalardaki state'in çoğu ya sunucu ya da URL state'idir. İki Zustand store'unu birleştirmekten çok bir store'u `useQuery` ya da `useParams` ile birleştirdiğini söyler.[^3] TanStack Query dokümanı da aynı gözlemi yapar: sunucu verisi kendi aracına taşındığında global store'da çoğu zaman yalnızca tema ve kenar çubuğu gibi birkaç değer kalır.[^4]

## Local State Yeterken

İki kardeş component aynı değere ihtiyaç duyuyorsa önce state'i **en yakın ortak ebeveyne** taşıyın *(bkz. [State](/academy/react/state))*.[^5] Değer birkaç seviye aşağı iniyorsa React dokümanı Context'ten önce iki şey önerir: props ile devam etmek ya da ara component'lere `children` vermek.[^6]

Store şu belirtiler varsa anlamlıdır:

- Aynı client state'i ağacın **birbirinden uzak** yerleri okuyor ve değiştiriyor *(header'daki sepet sayısı, ürün kartındaki "Sepete ekle", yan paneldeki sepet listesi)*.
- Değer **sık değişiyor** ve onu okuyan component'lerin yalnızca bir kısmı her değişiklikte render olmalı.
- State'i React dışından da okumak ya da değiştirmek istiyorsunuz *(bir WebSocket dinleyicisi, bir test)*.

## Context Neden Her Zaman Yetmez

Context bir değeri taşır, state yönetmez. Provider'ın `value`'su değişince onu okuyan **tüm** component'ler render olur; bir component değerin yalnızca bir parçasıyla ilgileniyor olsa bile.[^7] Seyrek değişen tema ya da oturum bilgisi için bu sorun değildir. Her tıklamada değişen bir sepet ya da çok seçimli bir liste için yavaşlık yaratabilir.

TkDodo, Context'i değerin kendisi için değil, store gibi **değişmeyen bir örneği** paylaşmak için kullanmayı önerir. Değer seçimini store'un selector'ları yapar.[^8] Bu kalıp [Context ile store](/academy/zustand/store-with-context) dersinde.

## Zustand Nedir

[!zustand] küçük, hook tabanlı bir client state kütüphanesidir. Store'unuz bir hook'tur; Provider gerekmez. Component, selector ile store'un yalnızca ihtiyaç duyduğu parçasını okur ve yalnızca o parça değiştiğinde render olur:[^9]

```ts
import { create } from "zustand";

type CartState = {
  count: number;
  increase: () => void;
};

export const useCartStore = create<CartState>()((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
}));

// Bir component'te:
const count = useCartStore((state) => state.count);
```

Kütüphane, Poimandres *(pmndrs)* topluluğunun bir projesidir. Bugünkü maintainer'ı [Daishi Kato](https://blog.axlight.com/) projeyi 2020'de bakımsız kaldığı bir dönemde devraldı. Tasarım ilkesini şöyle özetler: global state React Context'in **dışında** durur, Context gerekirse yalnızca store'u taşır; uygulama basit ve bundle küçük kalır.[^10]

Güncel sürüm v5'tir. v5 yeni özellik getirmedi; v4'te kullanımdan kaldırılmış API'leri sildi, en az React 18 ve TypeScript 4.5 istedi ve React'in yerleşik `useSyncExternalStore`'una geçti.[^11][^12] Eski bir yazıda `import create from "zustand"` *(default export)* ya da selector'ın yanında `shallow` görürseniz v4 kodudur.

## Diğer Kütüphanelerden Farkı

Zustand dokümanı kendini benzer kütüphanelerle karşılaştırır. Fark iki eksende:[^13]

| Kütüphane | State modeli | Render optimizasyonu | Provider |
| :-- | :-- | :-- | :-- |
| [!zustand] | Tek store, immutable | Selector'ı siz yazarsınız | Gerekmez |
| Redux Toolkit | Tek store, immutable | Selector'ı siz yazarsınız | Gerekir |
| Jotai | Birleştirilebilen küçük atom'lar | Atom bağımlılığıyla otomatik | Gerekmez |
| Valtio | Mutable proxy | Okunan property'yle otomatik | Gerekmez |

Zustand, Redux'a kavramsal olarak en yakın olandır; daha az kod ve Provider'sız kullanım sunar. TkDodo kendi tercihini şöyle anlatır: Zustand "sihirli" değildir, hangi alanı kullandığınızı izlemez; selector'la açıkça abone olursunuz. Bu, uygulama büyüdükçe bağımlılıkları görünür kılar.[^3]

> [!DONT]
>
> - Sunucudan gelen listeyi Zustand store'a kopyalamak. Cache, yenileme ve hata durumlarını elle yazmak zorunda kalırsınız; bu iş [TanStack Query](/academy/tanstack-query)'nin.[^4]
> - URL'de durması gereken filtreyi store'a koymak. Sayfa paylaşılamaz, geri butonu çalışmaz.

## Kendin Dene

- Üzerinde çalıştığınız bir uygulamanın state'ini yukarıdaki dört türe ayırın. Paylaşılan client state'e kaç değer kalıyor?
- Bir sepet sayacını önce ortak ebeveynde `useState` ile, sonra Context ile yazın. Sepete ürün eklerken hangi component'lerin render olduğunu React DevTools'un "Highlight updates" seçeneğiyle izleyin.

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Working with Zustand"; Zustand'ı neden seçtiği ve store'u küçük tutma önerisi.[^3]
- **Yazı:** [Daishi Kato](https://blog.axlight.com/), "How Zustand was born"; projenin geçmişi ve Context dışında global state fikri.[^10]
- **Resmi doküman:** "Comparison"; Redux, Valtio, Jotai ve Recoil ile kod karşılaştırması.[^13]

## Kaynaklar

1. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Gereksiz ve türetilebilen state'ten kaçınmak.
2. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — 2020. Server cache ile UI state'i ayırmak ve colocation.
3. [TkDodo](https://tkdodo.eu/): [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) *(article)* — 20 Kasım 2022. Selector'la açık abonelik, küçük store'lar ve store'u sorgularla birleştirmek.
4. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — Server state taşındıktan sonra global store'da kalan client state.
5. [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) *(doc)* — State'i en yakın ortak ebeveyne taşımak.
6. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — Context'ten önce denenecekler.
7. [React: useContext](https://react.dev/reference/react/useContext) *(doc)* — Değer değişince okuyan tüm component'lerin render olması.
8. [TkDodo](https://tkdodo.eu/): [Zustand and React Context](https://tkdodo.eu/blog/zustand-and-react-context) *(article)* — 14 Nisan 2024. Context ile değer yerine store örneğini paylaşmak.
9. [Zustand: Introduction](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) *(doc)* — Kurulum, hook olarak store ve selector ile abonelik.
10. [Daishi Kato](https://blog.axlight.com/): [How Zustand was born](https://blog.axlight.com/posts/how-zustand-was-born/) *(article)* — 14 Temmuz 2024. Projeyi devralması ve global state'i Context dışında tutma fikri.
11. [Daishi Kato](https://blog.axlight.com/): [Announcing Zustand v5](https://pmnd.rs/blog/announcing-zustand-v5) *(article)* — 20 Ekim 2024. Yeni özellik olmaması, React 18 şartı ve `useSyncExternalStore`.
12. [Zustand: How to Migrate to v5 from v4](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) *(doc)* — Default export'un kalkması, React 18 ve TypeScript 4.5 şartı.
13. [Zustand: Comparison](https://zustand.docs.pmnd.rs/learn/getting-started/comparison) *(doc)* — Redux, Valtio, Jotai ve Recoil ile state modeli ve render optimizasyonu farkı.
