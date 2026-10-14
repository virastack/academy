---
title: "Asenkron Testler"
description: "findBy, waitFor ve fake timers."
lastVerified: "2026-10-14"
translationKey: "vitest/async"
---

## Asenkron arayüz nedir?

Bazı değişiklikler hemen olmaz. Örnekler:

- API yanıtı gelince ürün listesi görünür.
- Ürün sepete eklenince bildirim çıkar ve 3 saniye sonra kapanır.

Testiniz bu değişikliği **beklemelidir**. Beklemezseniz test, arayüz güncellenmeden kontrol yapar ve başarısız olur.[^1]

## Hangi aracı kullanmalıyım?

| Durum | Araç |
| --- | --- |
| Eleman sonradan **görünecek** | `await screen.findBy...`[^1] |
| Eleman sonradan **kaybolacak** | `await waitFor(() => expect(queryBy...).not.toBeInTheDocument())`[^1] |
| Kod gerçek süre bekliyor (`setTimeout`) ve beklemek istemiyorsunuz | Fake timers[^2] |

## findBy: sonradan görünecek eleman

[!findBy] elemanı bulana kadar bekler. Süre dolarsa hata fırlatır. Varsayılan süre **1000 ms**.[^3]

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

İlk satırda [!getBy] kullanıldı. Yükleme mesajı ilk render'da zaten ekrandadır. Bekleme gerekmez.[^3]

## waitFor: koşulun doğru olmasını bekleme

`waitFor`, verdiğiniz fonksiyon hata fırlatmayı bırakana kadar onu tekrar tekrar çalıştırır. Varsayılan süre **1000 ms**.[^1]

Bir elemanın **kaybolmasını** beklerken [!queryBy] kullanın:[^3]

```tsx
await waitFor(() =>
  expect(screen.queryByText("Ürünler yükleniyor...")).not.toBeInTheDocument(),
);
```

> [!DO]
>
> - `waitFor` içine yalnızca `expect` kontrolleri koyun.[^4]
> - Görünmesini beklediğiniz eleman için `waitFor` yerine `findBy` kullanın.[^4]

> [!DONT]
>
> - `waitFor` içinde `user.click` gibi işlemler yapmayın. Fonksiyon tekrar çalışınca işlem de tekrar eder.[^4]
> - `waitFor` içinde `findBy` kullanmayın. `findBy` zaten `waitFor` kullanır.[^1]

> [!CAUTION]
>
> `findBy` bir Promise döndürür. `expect(screen.findByText(...)).not.toBeInTheDocument()` yazarsanız `expect`'e eleman yerine Promise vermiş olursunuz ve jest-dom bunu HTMLElement olmadığı için hata ile reddeder.[^5] Bir elemanın olmadığını doğrulamak için `queryBy` kullanın.[^3]

<details>
<summary>waitForElementToBeRemoved</summary>

- `waitForElementToBeRemoved(() => screen.queryByText("..."))` bir elemanın kaybolmasını bekler. Eleman başta DOM'da **olmalıdır**. Eleman zaten yoksa fonksiyon hata fırlatır.[^1]
- Emin değilseniz `waitFor` ve `queryBy` kombinasyonunu kullanın. Bu yöntem eleman çok hızlı kaybolsa bile çalışır.[^1]

</details>

## Fake timers: zamanı kontrol etme

Ürün sepete eklenince bir bildirim görünür. Bildirim 3 saniye sonra kapanır. 3 saniye bekleyen bir test yavaştır. Zamanı kendiniz ilerletin.[^2]

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

- `vi.useFakeTimers` çağrısını `render` öncesinde yapın. Component'in `setTimeout` çağrısı fake olmalıdır.[^6]
- `vi.advanceTimersByTime` çağrısını `act` içine alın. Zamanlayıcı bir React state'ini günceller.[^7]
- `vi.useRealTimers` çağrısını `afterEach` içinde yapın.[^8] Test hata verse bile `afterEach` çalışır.

> [!CAUTION]
>
> `vi.useFakeTimers()` çağrısı `findBy` ve `userEvent` çağrılarını bekletir, test timeout hatasıyla biter.[^9], [^8] Çözüm: `vi.useFakeTimers({ shouldAdvanceTime: true })`.[^10] `userEvent` kullanıyorsanız ayrıca `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` yazın.[^11]

<details>
<summary>Fake timers komutları</summary>

- `vi.advanceTimersByTime(ms)`: zamanı `ms` kadar ilerletir. `vi.advanceTimersByTimeAsync(ms)`: aynısını yapar, asenkron kurulan zamanlayıcıları da çalıştırır.[^6]
- `vi.runOnlyPendingTimers()`: bekleyen zamanlayıcıları hemen çalıştırır. `vi.setSystemTime(date)`: `Date.now()` ve `new Date()` değerini ayarlar.[^6]
- Bekleme süresi kısaysa (300 ms gibi) fake timers kullanmayın. `findBy` ile bekleyin.

</details>

## Kendin dene

API çağrısı başarısız olunca ne görünür? Bunu test edin:

- `loadProducts` fonksiyonu `Promise.reject(new Error("ağ hatası"))` döndürür.
- `findByRole("alert")` ile **Ürünler yüklenemedi.** mesajını bulun.
- [!queryBy] ile **Ürünler yükleniyor...** mesajının kaybolduğunu doğrulayın.

1. [Testing Library: Async Methods](https://testing-library.com/docs/dom-testing-library/api-async) *(Doküman)* — `findBy`, `waitFor` ve `waitForElementToBeRemoved`.
2. [Vitest: Timers](https://vitest.dev/guide/mocking/timers) *(Doküman)* — Fake timers rehberi.
3. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(Doküman)* — `getBy`, `queryBy` ve `findBy` farkı.
4. [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(Makale)* — `waitFor` içinde yan etki ve `find*` yerine `waitFor` hataları.
5. [jest-dom: toBeInTheDocument kaynak kodu](https://github.com/testing-library/jest-dom/blob/main/src/to-be-in-the-document.js) *(Repo)* — Verilen değerin HTMLElement olup olmadığı kontrol edilir.
6. [Vitest: vi API](https://vitest.dev/api/vi) *(Doküman)* — Fake timers komutları.
7. [React: act](https://react.dev/reference/react/act) *(Doküman)* — Güncellemeleri assertion'dan önce uygulama.
8. [Testing Library: Using Fake Timers](https://testing-library.com/docs/using-fake-timers) *(Doküman)* — Fake timers kurulumu ve temizliği.
9. [dom-testing-library #1218: useFakeTimers ve findBy](https://github.com/testing-library/dom-testing-library/issues/1218) *(Repo)* — Vitest'te `findBy` timeout'a düşer.
10. [Vitest: fakeTimers yapılandırması](https://vitest.dev/config/faketimers) *(Doküman)* — `shouldAdvanceTime` seçeneği.
11. [user-event: Options](https://testing-library.com/docs/user-event/options) *(Doküman)* — `advanceTimers` seçeneği.
