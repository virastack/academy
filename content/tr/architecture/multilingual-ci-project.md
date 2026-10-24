---
title: "Çok dilli sayfa ve CI hattı"
description: "Mevcut bir sayfayı iki dile çevirip lint, tip ve test kontrollerini CI'a bağlama."
lastVerified: "2026-10-22"
translationKey: "architecture/multilingual-ci-project"
---

## Senaryo

Elinizde tek dilli bir ürün sayfası var. Ad, fiyat, stok ve güncelleme tarihi Türkçe olarak koda gömülü. Göreviniz:

- Sayfayı Türkçe ve İngilizce sunmak: `/tr` ve `/en`.
- `/` adresini tarayıcı diline göre yönlendirmek.
- Her pull request'te lint, biçim, tip ve testleri GitHub Actions'ta çalıştırmak.

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Yönlendirme, mesajlar, biçimlendirme | `src/i18n/`, `messages/`, `src/proxy.ts` | [Çoklu Dil (i18n)](/academy/architecture/i18n) |
| ESLint, Prettier, CI | `eslint.config.mjs`, `.github/workflows/ci.yml` | [Kod Kalitesi ve Ekip Standartları](/academy/architecture/code-quality) |
| Uçtan uca test | `e2e/i18n.spec.ts` | [!playwright] |

Başlangıç ve çözüm GitHub'da: [examples/architecture/multilingual-ci-project](https://github.com/virastack/academy/tree/main/examples/architecture/multilingual-ci-project).

> [!NOTE]
>
> Proje `next@16.4.2`, `next-intl@4.14.9`, `pnpm@10.28.0`, `vitest@5.0.5` ve `@playwright/test@1.64.1` ile yazıldı. `cacheComponents` açık bırakıldı.

## Adım 1: Metinleri çıkarın

Önce sayfadaki her metni bulun. `starter/src/app/page.tsx` içinde beş tane var: ürün adı, fiyat, stok, tarih ve buton. `layout.tsx`'te de başlık ve açıklama duruyor.

Ürün adı veriden gelir, arayüz metni değildir. Onu `messages/` dosyasına değil veriye koyun:

```ts
// src/data/product.ts
export const product = {
  name: { tr: "Mekanik Klavye", en: "Mechanical Keyboard" },
  price: 2499.9,
  stock: 3,
  updatedAt: new Date("2026-10-15T21:00:00Z"),
};
```

## Adım 2: next-intl'i kurun

```command
pnpm add next-intl
```

Kurulum [Çoklu Dil (i18n)](/academy/architecture/i18n) dersindekiyle aynı: `routing.ts`, `navigation.ts`, `request.ts`, `proxy.ts` ve `app/[locale]/` klasörü.[^1] Tek ek, `request.ts`'te saat dilimi:

```ts
// src/i18n/request.ts
return {
  locale,
  timeZone: "Europe/Istanbul",
  messages: (await import(`../../messages/${locale}.json`)).default,
};
```

Saat dilimini vermezseniz tarih sunucunun saat dilimine göre yazılır.[^2] Ürün UTC'de 15 Ekim 21:00'de güncellendi; İstanbul'da bu 16 Ekim.

## Adım 3: Mesajları yazın

```json
// messages/tr.json
"ProductPage": {
  "price": "Fiyat: {price, number, ::currency/TRY}",
  "stock": "{count, plural, =0 {Stokta yok} other {Son # ürün}}",
  "updated": "Güncelleme tarihi: {date, date, long}",
  "addToCart": "Sepete ekle"
}
```

```json
// messages/en.json
"ProductPage": {
  "price": "Price: {price, number, ::currency/TRY}",
  "stock": "{count, plural, =0 {Out of stock} one {Last one left} other {Only # left}}",
  "updated": "Updated on {date, date, long}",
  "addToCart": "Add to cart"
}
```

- **Çoğul:** Türkçe sayıyla birlikte ismi tekil kullanır, `one` dalı gerekmez. İngilizcede `one` ayrı yazılır.[^3]
- **Para birimi:** İki dilde de `TRY`. Para birimine ürün karar verir, dil yalnızca gösterimi değiştirir. Denemede Türkçe `₺2.499,90`, İngilizce `TRY 2,499.90` çıktı; `en` dilinde lira için bir sembol yok, kod yazılıyor.[^4]

## Adım 4: Sayfa ve dil değiştirici

```tsx
// src/app/[locale]/page.tsx
const t = useTranslations("ProductPage");
const locale = useLocale() as Locale;

<h1>{product.name[locale]}</h1>
<p data-testid="price">{t("price", { price: product.price })}</p>
<p data-testid="stock">{t("stock", { count: product.stock })}</p>
```

Dil değiştirici `@/i18n/navigation`'daki `Link`'i kullanır: `<Link href="/" locale="en">EN</Link>`.[^1] Başlık ve açıklama `generateMetadata` içinde `getTranslations("Metadata")` ile çevrilir.

```command
pnpm build && pnpm start
curl -I -H "Accept-Language: en-US" http://localhost:3000/
```

Yanıtta `location: /en` gelmeli. `/tr` yanıtındaki `link` başlığında `hreflang="tr"`, `hreflang="en"` ve `x-default` görünür.

## Adım 5: Kontrolleri yazın

CI'ın çalıştıracağı her kontrol önce yerelde bir script olmalı:

```json
// package.json
"scripts": {
  "lint": "eslint",
  "format:check": "prettier --check .",
  "check-types": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

`check-types` önce `next typegen` çalıştırır. Temiz bir kopyada `PageProps` ve `LayoutProps` tipleri henüz üretilmediği için `tsc` tek başına hata verir.

**Eksik çeviri testi.** En sık hata, bir dile eklenip diğerine eklenmeyen anahtardır. Küçük bir Vitest testi iki dosyanın anahtarlarını karşılaştırır:

```ts
// src/i18n/messages.test.ts
test("every locale has the same message keys", () => {
  expect(keys(en).sort()).toEqual(keys(tr).sort());
});
```

Denemede `en.json`'dan `addToCart` silinince test kırmızıya döndü.

**Uçtan uca test.** Playwright `/tr`'yi açar, değerleri kontrol eder ve `EN` linkine tıklar.

> [!WARNING]
>
> `cacheComponents` açıkken Next.js önceki sayfayı silmez, `<Activity>` ile `display: none` yapıp DOM'da tutar.[^5] Dil değiştirdikten sonra `getByTestId("price")` iki eleman buldu: görünen İngilizce ve gizli Türkçe. `getByRole` gizli elemanları atladığı için kontrolleri görünen `<main>` içine alın:
>
> ```ts
> const main = page.getByRole("main");
> await expect(main.getByTestId("price")).toHaveText("Price: TRY 2,499.90");
> ```

## Adım 6: CI'a bağlayın

```yaml
# .github/workflows/ci.yml
jobs:
  quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
        with:
          runtime: node@24
          cache: true
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm check-types
      - run: pnpm test

  e2e:
    runs-on: ubuntu-24.04
    steps:
      # checkout ve pnpm/setup aynı
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
```

- `pnpm/setup` pnpm'i, Node.js'i kurar ve `pnpm install`'ı kendisi çalıştırır.[^6]
- İki iş paralel çalışır. Hızlı kontroller, uzun süren tarayıcı testini beklemez.
- Test kırılınca rapor artifact olarak yüklenir; Playwright dokümanındaki örnek de böyle.[^7]
- `playwright.config.ts`'te `forbidOnly: !!process.env.CI` var: unutulmuş bir `test.only` CI'ı kırar.[^8]

Son olarak GitHub'da `quality` ve `e2e` işlerini *required status check* yapın. Böylece kontroller geçmeden birleştirme yapılamaz.[^9]

> [!NOTE]
>
> Bu workflow'un her komutu yerelde ve temiz kurulumda denendi. GitHub Actions'ta çalıştırılmadı; ilk PR'ınızda çıktısına bakın.

## Kendin dene

- Almanca ekleyin: `messages/de.json`'u eksik bir anahtarla oluşturun ve testin yakaladığını görün.
- `localePrefix: "as-needed"` yapın. Playwright testlerinde hangi URL'leri değiştirmeniz gerekiyor?
- Bir PR'da bilerek biçimi bozun ve `format:check` adımının kırmızıya döndüğünü görün.

## Kaynaklar

1. [next-intl: App Router with i18n routing](https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing) *(doc)* — `routing.ts`, `proxy.ts`, `navigation.ts`, `request.ts` ve `[locale]` segmenti.
2. [next-intl: Configuration](https://next-intl.dev/docs/usage/configuration) *(doc)* — `getRequestConfig` içinde `timeZone`, `messages` ve `formats`.
3. [next-intl: Messages](https://next-intl.dev/docs/usage/messages) *(doc)* — ICU argüman, `plural` kategorileri ve tam eşleşme.
4. [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat) *(doc)* — `currency` ve `currencyDisplay` seçenekleri.
5. [Next.js: Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state) *(doc)* — `cacheComponents` ile önceki sayfaların `<Activity>` ile gizlenip DOM'da tutulması.
6. [pnpm: Continuous Integration](https://pnpm.io/continuous-integration) *(doc)* — `pnpm/setup` ile GitHub Actions, önbellek ve `packageManager` alanı.
7. [Playwright: Setting up CI](https://playwright.dev/docs/ci-intro) *(doc)* — GitHub Actions workflow'u, tarayıcı kurulumu ve raporu artifact olarak yükleme.
8. [Playwright: Test configuration](https://playwright.dev/docs/test-configuration) *(doc)* — `forbidOnly` ve CI'a göre ayarlanan seçenekler.
9. [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) *(doc)* — Zorunlu durum kontrolleri ve benzersiz iş adı uyarısı.
