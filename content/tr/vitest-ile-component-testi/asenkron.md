---
title: "Asenkron Testler"
description: "findBy, waitFor ve fake timers."
lastVerified: "2026-10-14"
translationKey: "vitest-ile-component-testi/asenkron"
---

## Asenkron arayüz nedir?

Bazı değişiklikler hemen olmaz. Örnekler:

- API yanıtı gelince ürün listesi görünür.
- Ürün sepete eklenince bildirim çıkar ve 3 saniye sonra kapanır.

Testiniz bu değişikliği **beklemelidir**. Beklemezseniz test, arayüz güncellenmeden kontrol yapar ve başarısız olur.

## Hangi aracı kullanmalıyım?

| Durum | Araç |
| --- | --- |
| Eleman sonradan **görünecek** | `await screen.findBy...` |
| Eleman sonradan **kaybolacak** | `await waitFor(() => expect(queryBy...).not.toBeInTheDocument())` |
| Kod gerçek süre bekliyor (`setTimeout`) ve beklemek istemiyorsunuz | Fake timers |

## findBy: sonradan görünecek eleman

[!findBy] elemanı bulana kadar bekler. Süre dolarsa hata fırlatır. Varsayılan süre **1000 ms**.

```tsx
test("yüklenirken bilgi mesajı, sonra ürünleri gösterir", async () => {
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  expect(screen.getByText("Ürünler yükleniyor...")).toBeInTheDocument();
  expect(await screen.findAllByRole("article")).toHaveLength(3);
});
```

İlk satırda [!getBy] kullanıldı. Yükleme mesajı ilk render'da zaten ekrandadır. Bekleme gerekmez.

## waitFor: koşulun doğru olmasını bekleme

`waitFor`, verdiğiniz fonksiyon hata fırlatmayı bırakana kadar onu tekrar tekrar çalıştırır. Varsayılan süre **1000 ms**.

Bir elemanın **kaybolmasını** beklerken [!queryBy] kullanın:

```tsx
await waitFor(() =>
  expect(screen.queryByText("Ürünler yükleniyor...")).not.toBeInTheDocument(),
);
```

> [!DO]
>
> - `waitFor` içine yalnızca `expect` kontrolleri koyun.
> - Görünmesini beklediğiniz eleman için `waitFor` yerine `findBy` kullanın.

> [!DONT]
>
> - `waitFor` içinde `user.click` gibi işlemler yapmayın. Fonksiyon tekrar çalışınca işlem de tekrar eder.
> - `waitFor` içinde `findBy` kullanmayın.

> [!CAUTION]
>
> `findBy` bir Promise döndürür. `expect(screen.findByText(...)).not.toBeInTheDocument()` yazarsanız test timeout'a kadar bekler. Bunun yerine `queryBy` kullanın.

<details>
<summary>waitForElementToBeRemoved</summary>

<ul>
<li>`waitForElementToBeRemoved(() => screen.queryByText("..."))` bir elemanın kaybolmasını bekler. Eleman başta DOM'da **olmalıdır**. Eleman zaten yoksa fonksiyon hata fırlatır.</li>
<li>Emin değilseniz `waitFor` ve `queryBy` kombinasyonunu kullanın. Bu yöntem eleman çok hızlı kaybolsa bile çalışır.</li>
</ul>

</details>

## Fake timers: zamanı kontrol etme

Ürün sepete eklenince bir bildirim görünür. Bildirim 3 saniye sonra kapanır. 3 saniye bekleyen bir test yavaştır. Zamanı kendiniz ilerletin.

```tsx
import { useEffect, useState } from "react";

export function AddedToast({ productName }: { productName: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 3000);

    return () => clearTimeout(id);
  }, []);

  return visible ? <div role="status">{productName} sepete eklendi.</div> : null;
}
```

```tsx
import { act, render, screen } from "@testing-library/react";
import { AddedToast } from "./AddedToast";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

test("3 saniye sonra bildirim kaybolur", async () => {
  render(<AddedToast productName="Kablosuz Kulaklık" />);

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Kablosuz Kulaklık sepete eklendi.",
  );

  act(() => {
    vi.advanceTimersByTime(3000);
  });

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
```

Üç kurala dikkat edin:

- `vi.useFakeTimers` çağrısını `render` öncesinde yapın. Component'in `setTimeout` çağrısı fake olmalıdır.
- `vi.advanceTimersByTime` çağrısını `act` içine alın. Zamanlayıcı bir React state'ini günceller.
- `vi.useRealTimers` çağrısını `afterEach` içinde yapın. Test hata verse bile `afterEach` çalışır.

> [!CAUTION]
>
> `vi.useFakeTimers()` çağrısı `findBy` ve `userEvent` çağrılarını sonsuza kadar bekletir. Test timeout hatasıyla biter. Çözüm: `vi.useFakeTimers({ shouldAdvanceTime: true })`.

<details>
<summary>Fake timers komutları</summary>

<ul>
<li>`vi.advanceTimersByTime(ms)`: zamanı `ms` kadar ilerletir. `vi.advanceTimersByTimeAsync(ms)`: aynısını yapar ve Promise'lerin bitmesini de bekler.</li>
<li>`vi.runOnlyPendingTimers()`: bekleyen zamanlayıcıları hemen çalıştırır. `vi.setSystemTime(date)`: `Date.now()` ve `new Date()` değerini ayarlar.</li>
<li>Bekleme süresi kısaysa (300 ms gibi) fake timers kullanmayın. `findBy` ile bekleyin.</li>
</ul>

</details>

## Kendin dene

API çağrısı başarısız olunca ne görünür? Bunu test edin:

- `loadProducts` fonksiyonu `Promise.reject(new Error("ağ hatası"))` döndürür.
- `findByRole("alert")` ile **Ürünler yüklenemedi.** mesajını bulun.
- [!queryBy] ile **Ürünler yükleniyor...** mesajının kaybolduğunu doğrulayın.

- [Testing Library: Async API'leri](https://testing-library.com/docs/dom-testing-library/api-async)
- [Vitest: Timer mock'lama](https://vitest.dev/guide/mocking/timers)
