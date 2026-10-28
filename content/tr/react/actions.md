---
title: "Actions ve async güncellemeler"
description: "Form action'ı, useActionState, useFormStatus ve useOptimistic."
lastVerified: "2026-10-21"
translationKey: "react/actions"
---

## Action nedir

Bir butona basıldığında sunucuya istek atıp sonucu göstermek için eskiden üç state yazılırdı: `isPending`, `error`, `data`. React 19 bunu **Action** kavramıyla toplar: `startTransition` içinde çalışan, async olabilen bir fonksiyon.[^1][^2]

```tsx
import { useTransition } from "react";

function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await addToCart(productId);
        });
      }}
    >
      {isPending ? "Ekleniyor..." : "Add to cart"}
    </button>
  );
}
```

React, Action bitene kadar `isPending`'i `true` tutar, arayüzü kilitlemez ve Action içinde fırlatılan hatayı en yakın Error Boundary'ye iletir.[^1]

> [!WARNING]
>
> `await`'ten **sonra** yapılan state güncellemeleri transition sayılmaz. Bunları tekrar `startTransition` ile sarın. Bu bir JavaScript sınırlaması; ileride `AsyncContext` ile kalkacak.[^1]

`useTransition`'ın performans tarafı *(yavaş bir listeyi bloklamadan filtrelemek)* [React'te render performansı](/academy/performance-accessibility/render-performance) dersinde.

## Form action'ı

`<form>`'un `action` prop'una bir fonksiyon verdiğinizde React onu form gönderilince `FormData` ile çağırır. `onSubmit`'ten farkı: bir transition içinde çalışır, `preventDefault` gerekmez ve başarılı olunca kontrolsüz *(uncontrolled)* alanları sıfırlar.[^3]

```tsx
<form action={async (formData) => {
  await subscribe(String(formData.get("email")));
}}>
  <input name="email" type="email" required />
  <SubmitButton />
</form>
```

Butonun formun gönderildiğini bilmesi için prop geçirmenize gerek yok. `useFormStatus`, içinde çağrıldığı **üst formun** durumunu okur:[^4]

```tsx
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? "Submitting..." : "Abone ol"}</button>;
}
```

`useFormStatus` aynı component'teki `<form>`'u değil, ebeveyndeki formu görür; bu yüzden buton ayrı bir component olmalıdır.[^4]

## useActionState: Action'ın sonucu

Action'ın bir sonucu varsa *(hata mesajı, uygulanan indirim)* `useActionState` kullanın. Bir önceki state'i ve gönderilen veriyi alıp yeni state döndüren async bir reducer gibi çalışır.[^5]

```tsx
import { useActionState } from "react";

type CouponState = { error: string | null; discount: number };

async function applyCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  const result = await checkCoupon(String(formData.get("code")));
  if (!result.ok) return { error: "Invalid coupon.", discount: 0 };
  return { error: null, discount: result.discount };
}

export function CouponForm() {
  const [state, formAction, isPending] = useActionState(applyCoupon, {
    error: null,
    discount: 0,
  });

  return (
    <form action={formAction}>
      <input name="code" aria-label="Kupon kodu" />
      <button disabled={isPending}>Uygula</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.discount > 0 && <p>%{state.discount} indirim uygulandı.</p>}
    </form>
  );
}
```

Aynı Action birden fazla kez tetiklenirse React çağrıları **sırayla** çalıştırır; her çağrı bir öncekinin sonucunu alır.[^5]

## useOptimistic: Cevabı beklemeden göstermek

Kullanıcı favori butonuna bastığında sunucuyu beklemeden kalbi doldurmak istersiniz. `useOptimistic`, Action sürerken geçici bir değer gösterir. Action bitince değer kendiliğinden gerçek kaynağa döner; istek başarısız olduysa iyimser değer kaybolur.[^6]

```tsx
import { useOptimistic, useTransition } from "react";

function FavoriteButton({ isFavorite, action }: FavoriteButtonProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(isFavorite);
  const [, startTransition] = useTransition();

  return (
    <button
      aria-pressed={optimisticFavorite}
      onClick={() => {
        startTransition(async () => {
          setOptimisticFavorite(!optimisticFavorite);
          await action(!optimisticFavorite);
        });
      }}
    >
      {optimisticFavorite ? "In favorites" : "Add to favorites"}
    </button>
  );
}
```

`setOptimistic...` yalnızca bir Action içinde çağrılır; dışında çağrılırsa React uyarır.[^6] Server state'i TanStack Query ile yönetiyorsanız iyimser güncellemenin kütüphane tarafı [TanStack Query](/academy/tanstack-query) rehberinde.

## action prop'u ile component tasarımı

Yukarıdaki `FavoriteButton`, prop'unu `onClick` değil **`action`** diye adlandırıyor. React dokümanı bu kalıbı önerir: tasarım sisteminizdeki buton, sekme ve select gibi component'ler `action` prop'u alır, kendi içinde `startTransition`'ı çağırır ve bekleme durumunu kendisi gösterir. Ürün kodu yalnızca `await` eder.[^7]

[Ricky Hanlon](https://github.com/rickhanlonii) React Conf 2025'teki "Async React" konuşmasının demosunda bu fikri sonuna kadar götürür: router transition'ları, veri katmanı Suspense'i, tasarım component'leri `action` prop'larını ve iyimser güncellemeleri varsayılan olarak kullanır. Sonuç: ağ hızlıyken hiç yükleme durumu görünmez, yavaşken otomatik olarak görünür.[^8][^9]

## Bu ders ve formlar rehberi

Bu derste React'in kendi araçlarını gördünüz. Alan bazlı doğrulama, Zod şeması, maskeleme ve çok adımlı formlar [Formlar](/academy/forms) rehberinde; Action'ın sunucuda çalışan hâli *(Server Functions)* Next.js rehberinin [Server Actions](/academy/nextjs/server-actions) dersinde.

## Kendin dene

- `AddToCartButton`'ın `addToCart`'ına 2 saniyelik gecikme ekleyin ve butona hızlıca üç kez basın.
- `CouponForm`'da `checkCoupon`'ı `"SALE10"` dışındaki her kodu reddedecek şekilde yazın; hata ve başarı mesajlarını deneyin.
- `FavoriteButton`'ın `action`'ını her seferinde hata fırlatacak şekilde değiştirin. Kalp ne yapıyor?
- Bir Action içinde `await`'ten sonra `setState` çağırın; ardından onu `startTransition` ile sarın ve farkı gözlemleyin.

## Detaylı öğrenmek için

- **Resmi doküman:** `useTransition` referansı; Action'lar, `action` prop'u açmak, istenmeyen yükleme göstergelerini önlemek ve sorun giderme.[^1]
- **Video:** [Ricky Hanlon](https://github.com/rickhanlonii)'ın "Async React" konuşmasının iki bölümü *(React Conf 2025)*.[^8][^10]
- **Repo:** Konuşmanın demo uygulaması; ağ hızını değiştirip farkı kendiniz görebilirsiniz.[^9]
- **Resmi doküman:** `useActionState` ve `useOptimistic` referansları; sepet örneği üzerinden bekleme, hata ve iyimser durumu adım adım gösterir.[^5][^6]

## Kaynaklar

1. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Async Action'lar, `isPending`, Error Boundary ile hata ve `await` sonrası güncelleme sınırlaması.
2. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — Actions, `useActionState`, `useOptimistic` ve form action'larının duyurusu.
3. [React: form](https://react.dev/reference/react-dom/components/form) *(doc)* — `action` prop'u, `FormData`, transition içinde çalışma ve başarılı gönderimden sonra alanların sıfırlanması.
4. [React: useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus) *(doc)* — Üst formun bekleme durumunu okumak ve ayrı component şartı.
5. [React: useActionState](https://react.dev/reference/react/useActionState) *(doc)* — Async reducer, `isPending`, sıralı çalıştırma ve hata davranışı.
6. [React: useOptimistic](https://react.dev/reference/react/useOptimistic) *(doc)* — Action süresince geçici değer, reducer'lı kullanım ve Action dışında çağırma uyarısı.
7. [React: useTransition, Exposing action prop from components](https://react.dev/reference/react/useTransition#exposing-action-props-from-components) *(doc)* — Component'in `action` prop'u alıp transition'ı kendisi başlatması.
8. [Ricky Hanlon: Async React Part I (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=10907s) *(video)* — 1. gün yayını. Transition, Suspense ve optimistic state'i birlikte kullanan bir uygulama.
9. [Ricky Hanlon: async-react demo](https://github.com/rickhanlonii/async-react) *(repo)* — Konuşmanın son hâli; router, veri katmanı ve `action` prop'lu tasarım component'leri, 150 ms eşiği.
10. [Ricky Hanlon: Async React Part II (React Conf 2025)](https://www.youtube.com/watch?v=p9OcztRyDl0&t=29073s) *(video)* — 2. gün yayını. Konuşmanın devamı.
