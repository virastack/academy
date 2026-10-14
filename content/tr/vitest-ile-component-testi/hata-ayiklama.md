---
title: "Hata Ayıklama"
description: "screen.debug, sık hatalar ve coverage."
lastVerified: "2026-10-14"
translationKey: "vitest-ile-component-testi/hata-ayiklama"
---

## Test kırıldığında ne yapmalı?

Hata mesajını okuyun. Testing Library hata mesajları, sorunu ve çözümü anlatır. Aşağıdaki sıra çoğu sorunu çözer:

- Hata mesajının ilk satırını okuyun.
- `screen.debug()` ile DOM'a bakın.
- Sorgu listesine bakın. Mesajdaki **accessible roles** bölümü size gerçek rolleri gösterir.
- Sorguyu veya testi düzeltin.

## screen.debug: DOM'a bakın

`screen.debug()` o andaki DOM'u konsola yazar. Testin geçtiği veya kırıldığı noktada ekranda ne olduğunu görürsünüz.

```tsx
test("ürün listesi", async () => {
  render(<ProductList loadProducts={loadProducts} onAddToCart={vi.fn()} />);

  screen.debug();

  await screen.findAllByRole("article");

  screen.debug(screen.getByRole("article", { name: "Mekanik Klavye" }));
});
```

Argümansız çağrı tüm sayfayı, argümanlı çağrı yalnızca verdiğiniz elemanı yazar.

> [!TIP]
>
> Sorunu çözdükten sonra `screen.debug()` satırlarını silin.

<details>
<summary>Diğer debug araçları</summary>

<ul>
<li>`logRoles(container)`: bir elemanın içindeki tüm rolleri ve erişilebilir adları yazar. `@testing-library/react` paketinden import edilir.</li>
<li>`screen.logTestingPlaygroundURL()`: o anki DOM için bir Testing Playground bağlantısı yazar. Bağlantıda en iyi sorguyu seçebilirsiniz.</li>
</ul>

</details>

## En sık görülen 4 hata

### 1. Found multiple elements

```bash
TestingLibraryElementError: Found multiple elements with the role "button" and name "Sepete ekle"
```

**Sebep:** Sayfada aynı sorguya uyan birden fazla eleman var. Her ürün kartında bir **Sepete ekle** butonu bulunur.

**Çözüm:** Aramayı `within` ile bir karta daraltın. Tüm elemanlar gerekiyorsa `getAllByRole` kullanın.

```tsx
const card = screen.getByRole("article", { name: "Mekanik Klavye" });

within(card).getByRole("button", { name: "Sepete ekle" });
```

### 2. Unable to find an accessible element

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

- Mesajdaki rol listesine bakın. Aradığınız rol listede var mı?
- `name` değerini kontrol edin. Tam eşleşme gerekir: `"Klavye"` değil `"Mekanik Klavye"`. Kısmi eşleşme için regex kullanın: `/klavye/i`.
- Eleman sonradan geliyorsa `findBy` kullanın.

### 3. Eleman henüz ekranda değil

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "article"
Here are the accessible roles:
  status:
```

**Sebep:** Ürünler API'den sonra gelir. Test, yükleme bitmeden kontrol yapmıştır. Rol listesinde yalnızca `status` (yükleme mesajı) görünür.

**Çözüm:** `getBy` yerine `await screen.findBy` kullanın.

### 4. not wrapped in act(...)

```bash
An update to ProductList inside a test was not wrapped in act(...).
```

**Sebep:** Component, test bittikten veya test beklemeyi bırakmışken state'ini güncelledi. Genellikle bir asenkron işlem tamamlanmadan test sona erer.

- Testin sonunda, beklediğiniz sonucu `await findBy` veya `await waitFor` ile bekleyin.
- Zamanlayıcı kullanıyorsanız `vi.advanceTimersByTime` çağrısını `act` içine alın.

> [!WARNING]
>
> `act` uyarısını `console.error` susturarak gizlemeyin. Uyarı, testin eksik beklediğini gösterir.

## Yaygın hatalar

| Hata | Doğrusu |
| --- | --- |
| Yokluğu `getBy` ile kontrol etmek | `queryBy` kullanın. |
| `userEvent` çağrısına `await` yazmamak | Her `user.*` çağrısına `await` yazın. |
| `vi.useFakeTimers()` sonrası `findBy` ile takılmak | `vi.useFakeTimers({ shouldAdvanceTime: true })` |
| Göreli URL ile `fetch` çağırmak | Tam URL kullanın: `https://api.magaza.test/products` |
| Testin bir önceki testten kalan veriye bağlı olması | Her test kendi verisini kursun. |

## Tek testi çalıştırma

Tüm testleri çalıştırmayın. Üzerinde çalıştığınız testi seçin:

```bash
pnpm vitest run src/ProductList.test.tsx

pnpm vitest run src/ProductList.test.tsx -t "aramaya göre"
```

`-t` seçeneği, adı verilen metni içeren testleri çalıştırır. Geliştirme sırasında `pnpm vitest` (izleme modu) kullanın. Dosya değişince ilgili testler yeniden çalışır.

## Coverage

Coverage, testlerin kodun ne kadarını çalıştırdığını gösterir. Kodun test edilmeyen kısımlarını bulmak için kullanın.

```bash
pnpm add -D @vitest/coverage-v8
pnpm vitest run --coverage
```

Testi olmayan dosyaları da rapora eklemek için `vitest.config.ts` dosyasına `include` ekleyin:

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
> %100 coverage hedeflemeyin. Coverage, testin **doğru** olduğunu göstermez. Yalnızca kodun çalıştığını gösterir. Önemli akışlara (sepete ekleme, ödeme, form doğrulama) odaklanın.

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

- [Testing Library: Debug](https://testing-library.com/docs/dom-testing-library/api-debugging)
- [Vitest: Coverage](https://vitest.dev/guide/coverage)

## Ek kaynaklar

- [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(article)* — İlkeler bu dersle aynıdır. userEvent örnekleri setup() öncesi sürümdendir.
- [Kent C. Dodds: Fix the "not wrapped in act(...)" warning](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning) *(article)*
