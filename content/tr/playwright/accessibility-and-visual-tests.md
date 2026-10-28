---
title: "Erişilebilirlik ve görsel testler"
description: "axe, klavye, aria snapshot ve ekran görüntüsü."
lastVerified: "2026-10-22"
translationKey: "playwright/accessibility-and-visual-tests"
---

## Üç farklı soru

Bu derste üç tür test var ve her biri farklı bir soruya cevap verir:

| Test | Sorusu | Araç |
| :-- | :-- | :-- |
| Erişilebilirlik taraması | Otomatik bulunabilen erişilebilirlik hatası var mı? | `@axe-core/playwright` |
| Aria snapshot | Sayfanın yapısı *(roller, adlar, sıra)* beklenen gibi mi? | `toMatchAriaSnapshot` |
| Görsel karşılaştırma | Sayfa piksel olarak öncekiyle aynı mı görünüyor? | `toHaveScreenshot` |

## axe ile tarama

axe-core motoru ve `AxeBuilder` [Erişilebilirlik testi](/academy/performance-accessibility/accessibility-testing) dersinde ayrıntılı anlatılıyor. Playwright tarafında kalıp kısadır:[^1]

```command
npm install -D @axe-core/playwright
```

```ts
// tests/accessibility.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test("no accessibility violations on the orders page", async ({ page, ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Taramadan önce sayfanın **hazır** olduğunu bekleyin. Liste yüklenmeden tararsanız yalnızca "yükleniyor" yazısını taramış olursunuz.

JSDOM'da çalışmayan renk kontrastı kuralı gerçek tarayıcıda çalışır; uçtan uca taramanın en büyük kazancı budur. Yine de Playwright dokümanının uyarısı nettir: otomatik testler yalnızca bazı yaygın sorunları bulur, birçok sorun ancak elle ve gerçek kullanıcılarla test edilerek ortaya çıkar.[^1]

## Klavye ile gezinme

axe'ın göremediği şeylerden biri akıştır: klavyeyle formu doldurup gönderebiliyor musunuz, odak doğru yere gidiyor mu? Bunu kullanıcı gibi test edin:

```ts
test("the sign-in form is usable with the keyboard", async ({ page, loginPage }) => {
  await loginPage.goto();

  await loginPage.email.focus();
  await page.keyboard.type("admin@example.com");
  await page.keyboard.press("Tab");
  await expect(loginPage.password).toBeFocused();

  await page.keyboard.type("password123");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/orders");
});
```

`toBeFocused` ve `keyboard.press` ile hata sonrası odağın ilk hatalı alana gittiğini de doğrulayabilirsiniz *(bkz. [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility))*.

## Aria snapshot

Aria snapshot, bir elementin erişilebilirlik ağacının YAML ile yazılmış halidir: roller, erişilebilir adlar, durumlar ve hiyerarşi. Ekran okuyucunun sayfayı nasıl gördüğünü tek bakışta gösterir.[^2]

```ts
test("the table structure is as expected", async ({ ordersPage }) => {
  await ordersPage.goto();
  await ordersPage.filterBy("Delivered");

  await expect(ordersPage.table).toMatchAriaSnapshot(`
    - table "Order list":
      - rowgroup:
        - row "Order Customer Amount Status Action"
      - rowgroup:
        - row /SP-1003 Nina Kowalski/:
          - cell "SP-1003"
          - cell "Nina Kowalski"
          - cell /2,150\\.00/
          - cell "Delivered"
          - cell
  `);
});
```

Bu tek assertion tablonun bir başlığı olduğunu, sütunların sırasını, tek satır kaldığını ve her hücrenin içeriğini doğrular. Aynı şeyi `toHaveText` ile yazmak bir düzine satır tutardı.

Eşleştirme kuralları:[^2]

- Şablon **kısmi** eşleşir: bir listenin yalnızca bazı elemanlarını yazarsanız diğerleri yok sayılır. Tam eşleşme için `/children: equal` kullanılır.
- Adlar `/…/` arasında düzenli ifade olabilir. Para birimi gibi biçimi değişebilen değerler için idealdir. Şablon bir JavaScript dizesi olduğu için ters eğik çizgiyi iki kez yazın: `/2,150\\.00/`.
- Bir özelliği *(`checked`, `disabled`)* yazmazsanız o özellik kontrol edilmez.

Şablonu elle yazmak zorunda değilsiniz. Boş bir şablonla başlayın; Playwright ilk çalıştırmada üretir. Değişen yapıyı güncellemek için `-u` *(`--update-snapshots`)* kullanın; satır içi şablonlar için uygulanabilir bir yama dosyası oluşturulur:[^2]

```ts
await expect(ordersPage.table).toMatchAriaSnapshot("");
```

```command
npx playwright test --update-snapshots
```

> [!WARNING]
>
> Snapshot'ı okumadan güncellemek, testin yakalaması gereken hatayı kabul etmek demektir. Playwright dokümanı da snapshot testinin en büyük riskini bu sayar: değişikliği anlamadan onaylamak.[^2] Güncellemeden önce farkı inceleyin.

Aria snapshot ve assertion birbirinin yerine geçmez. Doküman ikisini birlikte önerir: yapı için snapshot, belirli bir değer ya da davranış için assertion.[^2]

## Görsel karşılaştırma

`toHaveScreenshot` sayfanın ya da bir elementin ekran görüntüsünü alır ve kayıtlı referans görüntüyle piksel piksel karşılaştırır:[^3]

```ts
// tests/orders.visual.ts
import { expect, test } from "./fixtures";

test("order table appearance", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.rows).toHaveCount(6);

  await expect(ordersPage.table).toHaveScreenshot("orders-table.png");
});
```

İlk çalıştırmada referans yoktur. Varsayılan modda Playwright görüntüyü yazar ama testi **başarısız** sayar; böylece yeni bir snapshot sessizce kabul edilmez. Playwright 1.64 ile `--update-snapshots=missing` eksik görüntüleri yazar ve testi geçirir; CI'ın yeni görüntüleri üretip mevcutları tek çalıştırmada doğrulaması için tasarlanmıştır.[^4]

Referans dosyanın adı tarayıcıyı ve işletim sistemini içerir: `orders-table-visual-linux.png`. Yazı tipi ve çizim farkları yüzünden macOS'ta alınan görüntü Linux'takiyle eşleşmez. Doküman tutarlı sonuç için testleri referansın üretildiği ortamda çalıştırmayı söyler.[^3] Bu yüzden referansları CI'da ya da Playwright'ın resmi [!docker] imajında üretin; herkes aynı ortamı kullanmış olur.[^5]

Kırılganlığı azaltan ayarlar:[^3]

| Ayar | Ne yapar |
| :-- | :-- |
| `animations` | Varsayılan `"disabled"`; animasyonları bitirip durdurur |
| `caret` | Varsayılan `"hide"`; yanıp sönen imleci gizler |
| `mask` | Verilen locator'ların üstünü kutuyla kapatır *(tarih, avatar)* |
| `maxDiffPixels` / `threshold` | Kabul edilebilir fark miktarı |
| `stylePath` | Ekran görüntüsü sırasında ek CSS uygular |

```ts
await expect(page).toHaveScreenshot({
  mask: [page.getByText(/Last updated/)],
  maxDiffPixels: 100,
});
```

## Görsel testleri ayrı projede tutmak

Görsel testler yavaştır ve platforma bağlıdır. Her `npm test`'te çalışmaları gerekmez. Playwright 1.64'teki `default: false` ile onları ayrı bir projede tutun:[^4]

```ts
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    testIgnore: /.*\.visual\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
  },
  {
    name: "visual",
    testMatch: /.*\.visual\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
    default: false,
  },
],
```

```command
npx playwright test --project=visual --update-snapshots=missing
```

```command
npx playwright test --project=visual
```

Görsel test dosyalarının `.visual.ts` ile bitmesi, onları normal projeden `testIgnore` ile ayırmayı kolaylaştırır.

## Hangisini ne zaman?

| Durum | Öneri |
| :-- | :-- |
| Her sayfa için temel erişilebilirlik güvencesi | axe taraması |
| Form, menü ve modalın klavyeyle çalışması | Klavye testi |
| Tablo, liste, menü gibi yapısı önemli bileşenler | Aria snapshot |
| Tasarım sisteminin görünümü, kritik sayfaların düzeni | Görsel karşılaştırma, ayrı projede |
| Hesaplanan bir değer, bir davranış | Normal assertion |

## Kendin dene

- Projenizdeki her sayfa için bir axe testi yazın. Bir butonun adını silip testin ne raporladığına bakın.
- Bir tabloya boş bir `toMatchAriaSnapshot("")` ekleyin ve Playwright'ın ürettiği şablonu okuyun. Bir hücreyi düzenli ifadeye çevirin.
- Görsel test için ayrı bir proje kurun, referansı `--update-snapshots=missing` ile oluşturun. Bir rengi değiştirip farkı HTML raporunda inceleyin.
- Giriş formunu yalnızca klavyeyle dolduran bir test yazın.

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Snapshot testing"; aria snapshot söz dizimi, kısmi ve tam eşleşme, güncelleme modları.[^2]
- **Resmi doküman:** Playwright, "Visual comparisons"; referans görüntüler, platform adlandırması ve seçenekler.[^3]
- **Resmi doküman:** Playwright, "Accessibility testing"; axe ile tarama ve otomatik testin sınırları.[^1]

## Kaynaklar

1. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — `AxeBuilder`, sayfa taraması ve otomatik testin sınırları.
2. [Playwright: Snapshot testing](https://playwright.dev/docs/aria-snapshots) *(doc)* — Aria snapshot söz dizimi, eşleştirme kuralları, `--update-snapshots` ve snapshot ile assertion karşılaştırması.
3. [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots) *(doc)* — `toHaveScreenshot`, platforma göre dosya adı, `maxDiffPixels`, `threshold` ve `stylePath`.
4. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `--update-snapshots=missing` davranışı ve `TestProject.default`.
5. [Playwright: Docker](https://playwright.dev/docs/docker) *(doc)* — Playwright'ın resmi Docker imajı ve tutarlı test ortamı.
