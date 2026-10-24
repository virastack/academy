---
title: "Hata ayıklama"
description: "screen.debug, sık hatalar ve coverage."
lastVerified: "2026-10-14"
translationKey: "vitest/debugging"
---

## Test kırıldığında ne yapmalı?

Hata mesajını okuyun. Testing Library, bir sorgu başarısız olunca o anki DOM'u hata mesajıyla birlikte yazar.[^1] Aşağıdaki sıra çoğu sorunu çözer:

- Hata mesajının ilk satırını okuyun.
- `screen.debug()` ile DOM'a bakın.
- Sorgu listesine bakın. Mesajdaki **accessible roles** bölümü size gerçek rolleri gösterir.[^2]
- Sorguyu veya testi düzeltin.

## screen.debug: DOM'a bakın

`screen.debug()` o andaki DOM'u konsola yazar.[^1] Testin geçtiği veya kırıldığı noktada ekranda ne olduğunu görürsünüz.

```tsx
test("ürün listesi", async () => {
  render(<ProductList loadProducts={loadProducts} onAddToCart={vi.fn()} />);

  screen.debug();

  await screen.findAllByRole("article");

  screen.debug(screen.getByRole("article", { name: "Mekanik Klavye" }));
});
```

Argümansız çağrı tüm sayfayı, argümanlı çağrı yalnızca verdiğiniz elemanı yazar.[^1]

> [!TIP]
>
> Sorunu çözdükten sonra `screen.debug()` satırlarını silin.

<details>
<summary>Diğer debug araçları</summary>

- `logRoles(container)`: bir elemanın içindeki tüm örtük (implicit) ARIA rollerini ve her rolü taşıyan elemanları yazar. `@testing-library/react` paketinden de import edilir.[^1], [^3]
- `screen.logTestingPlaygroundURL()`: o anki DOM için bir Testing Playground bağlantısı yazar. Bağlantıda en iyi sorguyu seçebilirsiniz.[^1]
- Debug çıktısı varsayılan olarak 7000 karakterde kesilir. Uzun DOM'larda `DEBUG_PRINT_LIMIT` ortam değişkenini artırın: `DEBUG_PRINT_LIMIT=20000 pnpm vitest run` (macOS ve Linux; Windows'ta `cross-env` kullanın).[^1]

</details>

## En sık görülen 4 hata

### 1. found multiple elements

```bash
TestingLibraryElementError: Found multiple elements with the role "button" and name "Sepete ekle"
```

**Sebep:** Sayfada aynı sorguya uyan birden fazla eleman var. Her ürün kartında bir **Sepete ekle** butonu bulunur.[^4]

**Çözüm:** Aramayı `within` ile bir karta daraltın.[^5] Tüm elemanlar gerekiyorsa `getAllByRole` kullanın.[^4]

```tsx
const card = screen.getByRole("article", { name: "Mekanik Klavye" });

within(card).getByRole("button", { name: "Sepete ekle" });
```

### 2. unable to find an accessible element

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "Klavye"
Here are the accessible roles:
  region:
  searchbox:
  article:
  heading:
  button:
```

**Sebep:** Sorgu eleman bulamadı. Rol, isim veya yazım yanlış olabilir. Veya eleman henüz ekranda değildir.

- Mesajdaki rol listesine bakın. Aradığınız rol listede var mı?[^2]
- `name` değerini kontrol edin. Tam eşleşme gerekir: `"Klavye"` değil `"Mekanik Klavye"`. Kısmi eşleşme için regex kullanın: `/klavye/i`.[^6], [^4]
- Eleman sonradan geliyorsa `findBy` kullanın.[^4]

### 3. eleman henüz ekranda değil

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "article"
Here are the accessible roles:
  status:
```

**Sebep:** Ürünler API'den sonra gelir. Test, yükleme bitmeden kontrol yapmıştır. Rol listesinde yalnızca `status` (yükleme mesajı) görünür.

**Çözüm:** `getBy` yerine `await screen.findBy` kullanın.[^7]

### 4. not wrapped in act(...)

```bash
An update to ProductList inside a test was not wrapped in act(...).
```

**Sebep:** Component, test bittikten veya test beklemeyi bırakmışken state'ini güncelledi. Genellikle bir asenkron işlem tamamlanmadan test sona erer.[^8]

- Testin sonunda, beklediğiniz sonucu `await findBy` veya `await waitFor` ile bekleyin.[^8]
- Zamanlayıcı kullanıyorsanız `vi.advanceTimersByTime` çağrısını `act` içine alın.[^8]

> [!WARNING]
>
> `act` uyarısını `console.error` susturarak gizlemeyin. Uyarı, testin eksik beklediğini gösterir.[^8]

## Yaygın hatalar

| Hata | Doğrusu |
| --- | --- |
| Yokluğu `getBy` ile kontrol etmek | `queryBy` kullanın.[^4] |
| `userEvent` çağrısına `await` yazmamak | Her `user.*` çağrısına `await` yazın.[^9] |
| `vi.useFakeTimers()` sonrası `findBy` ile takılmak | `vi.useFakeTimers({ shouldAdvanceTime: true })`[^10], [^11] |
| Göreli URL ile `fetch` çağırmak | Tam URL kullanın: `https://api.magaza.test/products`. Göreli URL, test ortamına göre `Failed to parse URL` hatası verebilir.[^12], [^13] |
| Testin bir önceki testten kalan veriye bağlı olması | Her test kendi verisini kursun.[^14] |

## Tek testi çalıştırma

Tüm testleri çalıştırmayın. Üzerinde çalıştığınız testi seçin:

```bash
pnpm vitest run src/ProductList.test.tsx

pnpm vitest run src/ProductList.test.tsx -t "aramaya göre"
```

`-t` seçeneği, adı verilen ifadeyle eşleşen testleri çalıştırır (ifade regex olarak okunur). Geliştirme sırasında `pnpm vitest` (izleme modu) kullanın. Dosya değişince testler yeniden çalışır.[^15]

## Coverage

Coverage, testlerin kodun ne kadarını çalıştırdığını gösterir. Kodun test edilmeyen kısımlarını bulmak için kullanın.[^16]

```bash
pnpm add -D @vitest/coverage-v8
pnpm vitest run --coverage
```

Testi olmayan dosyaları da rapora eklemek için `vitest.config.ts` dosyasına `include` ekleyin:[^17]

```ts
test: {
  coverage: {
    provider: "v8",
    include: ["src/**/*.{ts,tsx}"],
  },
},
```

> [!WARNING]
>
> %100 coverage hedeflemeyin. Coverage, testin **doğru** olduğunu göstermez. Yalnızca kodun çalıştığını gösterir. Önemli akışlara (sepete ekleme, ödeme, form doğrulama) odaklanın.[^16]

## Kendin dene

Aşağıdaki test kırılıyor. Hata mesajını okuyarak düzeltin:

```tsx
test("ürünü sepete ekler", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={onAddToCart}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

  expect(onAddToCart).toHaveBeenCalledTimes(1);
});
```

- Testi çalıştırın ve ilk hata mesajını okuyun.
- Hata mesajındaki rol listesine bakın.
- Önce yüklenmeyi bekleyin. Sonra **Mekanik Klavye** kartında `within` ile butonu bulun.

## Kaynaklar

1. [Testing Library: Debugging](https://testing-library.com/docs/dom-testing-library/api-debugging) *(doc)* — Otomatik DOM çıktısı, `screen.debug`, `logRoles`, `logTestingPlaygroundURL` ve `DEBUG_PRINT_LIMIT`.
2. [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(article)* — "Accessible roles" çıktısı ve yanlış sorgu kalıpları. İlkeler geçerli, `userEvent` örnekleri `setup()` öncesi sürümden.
3. [React Testing Library: API](https://testing-library.com/docs/react-testing-library/api) *(doc)* — DOM Testing Library'nin tamamı yeniden dışa aktarılır.
4. [Testing Library: About Queries](https://testing-library.com/docs/queries/about) *(doc)* — `getBy`, `queryBy` ve `findBy` farkı, `TextMatch`.
5. [Testing Library: Querying Within Elements](https://testing-library.com/docs/dom-testing-library/api-within) *(doc)* — `within` ile sorguyu bir elemana daraltma.
6. [Testing Library: ByRole](https://testing-library.com/docs/queries/byrole) *(doc)* — `name` seçeneği.
7. [Testing Library: Async Methods](https://testing-library.com/docs/dom-testing-library/api-async) *(doc)* — `findBy` sorguları.
8. [Kent C. Dodds: Fix the "not wrapped in act(...)" warning](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning) *(article)* — Uyarının sebebi ve çözümleri. Örnekler Jest ile yazılmış.
9. [user-event: Introduction](https://testing-library.com/docs/user-event/intro) *(doc)* — `userEvent.setup()` ve `await user.click(...)`.
10. [dom-testing-library #1218: useFakeTimers ve findBy](https://github.com/testing-library/dom-testing-library/issues/1218) *(repo)* — Vitest'te `findBy` timeout'a düşer.
11. [Vitest: fakeTimers yapılandırması](https://vitest.dev/config/faketimers) *(doc)* — `shouldAdvanceTime` seçeneği.
12. [The New Stack: When JSDOM and Fetch Collide](https://thenewstack.io/when-jsdom-and-fetch-collide-cross-environment-lessons/) *(article)* — Test ortamında göreli URL'lerin `Failed to parse URL` hatası verebilmesi.
13. [MSW #1999: resolve relative fetch URLs in jsdom](https://github.com/mswjs/msw/pull/1999) *(repo)* — Göreli `fetch` URL'lerinin jsdom'da çözülmesi MSW 2.1.5'te düzeltildi.
14. [Kent C. Dodds: Test Isolation with React](https://kentcdodds.com/blog/test-isolation-with-react) *(article)* — Testler arasında paylaşılan durumun sorunları.
15. [Vitest: Command Line Interface](https://vitest.dev/guide/cli) *(doc)* — `vitest run`, `-t` ve izleme modu.
16. [Martin Fowler: Test Coverage](https://martinfowler.com/bliki/TestCoverage.html) *(article)* — Coverage hedef değil, test edilmeyen yerleri bulma aracıdır.
17. [Vitest: Coverage](https://vitest.dev/guide/coverage) *(doc)* — Kurulum ve `coverage.include`.
