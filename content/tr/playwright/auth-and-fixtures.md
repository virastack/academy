---
title: "Auth ve fixture"
description: "Fixture yazmak, storageState, roller ve izolasyon."
lastVerified: "2026-10-22"
translationKey: "playwright/auth-and-fixtures"
---

## Fixture Nedir?

İlk testten beri `async ({ page }) => …` yazıyorsunuz. `page` bir **fixture**'dır: test başlamadan hazırlanan, test bitince temizlenen bir araç. Test yalnızca adını yazar; Playwright hazırlar.[^1]

Hazır gelen fixture'lar:[^1]

| Fixture | Ne verir |
| :-- | :-- |
| `page` | Bu teste özel, temiz bir sekme |
| `context` | `page`'in ait olduğu tarayıcı bağlamı *(cookie'ler, izinler)* |
| `browser` | Testler arasında paylaşılan tarayıcı |
| `browserName` | `chromium`, `firefox` ya da `webkit` |
| `request` | Tarayıcısız HTTP istekleri için `APIRequestContext` |

Fixture'lar `beforeEach`'ten iyidir çünkü yalnızca isteyen teste kurulur, hazırlık ve temizlik aynı yerde durur ve birbirine bağımlı olabilir.[^1]

## Kendi Fixture'ınız

`test.extend` yeni bir `test` fonksiyonu üretir. Her fixture bir fonksiyondur: hazırlar, `use` ile teste verir, `use` dönünce temizler.[^1]

```ts
// tests/fixtures.ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/login-page";
import { OrdersPage } from "./pages/orders-page";

type Pages = {
  loginPage: LoginPage;
  ordersPage: OrdersPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

export { expect } from "@playwright/test";
```

Testler `test`'i artık bu dosyadan alır ve Page Object'ler parametrede hazır gelir *(bkz. [Page Object](/academy/playwright/page-objects))*:

```ts
import { test, expect } from "./fixtures";

test("hatalı parola", async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login("yonetici@example.com", "yanlis");
  await expect(loginPage.error).toHaveText("E-posta veya parola hatalı.");
});
```

> [!WARNING]
>
> [!nextjs] projelerinin ESLint ayarı fixture'lardaki `use(...)` çağrısını React'in `use` hook'u sanıp `react-hooks/rules-of-hooks` hatası verir. Test klasörü için kuralı kapatın:
>
> ```js
> // eslint.config.mjs
> {
>   files: ["tests/**"],
>   rules: { "react-hooks/rules-of-hooks": "off" },
> },
> ```

`use`'dan sonraki kod temizliktir. Test başarısız olsa da çalışır. Sipariş oluşturan ve silen bir API'si olan uygulamada:

```ts
tempOrder: async ({ request }, use) => {
  const response = await request.post("/api/orders", { data: { customer: "Test" } });
  const order = await response.json();
  await use(order);
  await request.delete(`/api/orders/${order.id}`);
},
```

Bir fixture'ı bütün işçi süreci için bir kez kurmak isterseniz `{ scope: "worker" }` verin. Örneğin her işçiye ayrı bir test hesabı açmak için. Testin kendisi hiç istemese de çalışması gereken fixture'lar için `{ auto: true }` vardır.[^1]

## Her Testte Giriş Yapmamak

Oturum gerektiren her test giriş formunu doldurursa test paketi yavaşlar ve giriş sayfasındaki bir hata tüm testleri düşürür. Playwright'ın önerdiği yol: bir **setup projesinde** bir kez giriş yapmak, tarayıcı durumunu *(cookie'ler ve `localStorage`)* bir dosyaya kaydetmek ve diğer testleri bu durumla başlatmak.[^2]

```ts
// tests/auth.setup.ts
import { expect, test as setup } from "./fixtures";

setup("yönetici olarak oturum aç", async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login("yonetici@example.com");
  await expect(page).toHaveURL("/orders");
  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
```

`toHaveURL` önemlidir. Giriş sonrasında cookie yönlendirmeyle birlikte yazılır; adres değişmeden kaydederseniz boş bir durum saklarsınız.[^2]

```ts
// playwright.config.ts
projects: [
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
    dependencies: ["setup"],
  },
],
```

`dependencies: ["setup"]` setup projesinin her zaman önce çalışmasını sağlar. `chromium` projesindeki her test oturum açmış başlar.[^2][^3]

> [!CAUTION]
>
> `playwright/.auth/` içindeki dosyalar gerçek oturum cookie'leri taşır. Dokümanın uyarısı açıktır: bu dosyaları özel ya da açık hiçbir depoya göndermeyin. Klasörü `.gitignore`'a ekleyin; `npm init playwright` bunu sizin için yapar.[^2]

## Birden Fazla Rol

Uygulamanızda yönetici ve izleyici gibi roller varsa setup her biri için ayrı dosya yazar:[^2]

```ts
// tests/auth.setup.ts
const accounts = [
  { email: "yonetici@example.com", file: "playwright/.auth/admin.json" },
  { email: "izleyici@example.com", file: "playwright/.auth/viewer.json" },
];

for (const { email, file } of accounts) {
  setup(`${email} ile oturum aç`, async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(email);
    await expect(page).toHaveURL("/orders");
    await page.context().storageState({ path: file });
  });
}
```

Varsayılan rol yapılandırmada kalır; başka bir rol isteyen dosya `test.use` ile değiştirir:

```ts
// tests/viewer.spec.ts
import { expect, test } from "./fixtures";

test.use({ storageState: "playwright/.auth/viewer.json" });

test("izleyici iptal düğmesini görmez", async ({ ordersPage }) => {
  await ordersPage.goto();
  await expect(ordersPage.table.getByRole("button", { name: "İptal et" })).toHaveCount(0);
});
```

Arayüzde butonun gizlenmesi yetki kontrolü değildir. Aynı testte sunucunun da reddettiğini doğrulayın. `page.request` sayfanın cookie'lerini kullanır:

```ts
test("izleyici API ile de iptal edemez", async ({ page }) => {
  const response = await page.request.post("/api/orders/SP-1001/cancel");
  expect(response.status()).toBe(403);
});
```

## Oturumsuz Testler

Giriş sayfasını test eden dosya oturumla başlamamalı. Boş bir durum verin:[^2]

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

Bunu sık kullanacaksanız `fixtures.ts`'ten `signedOut` adıyla export edin.

## Veriyi Değiştiren Testler

Setup projesi bütün testlere **aynı hesabı** verir. Doküman bu yolu, testlerin aynı anda aynı hesapla çalışıp birbirini etkilemediği durumlar için önerir.[^2] Bir test siparişi iptal ederken başka bir test aynı anda "hazırlanan siparişleri" sayıyorsa, sonuç hangisinin önce bittiğine bağlıdır.

[Martin Fowler](https://martinfowler.com/) bunu izolasyon eksikliği diye anlatır: her test bilinen bir başlangıç durumundan başlamalı ve hangi sırayla çalışırsa çalışsın geçmelidir.[^4] Seçenekler:

1. **Veriyi değiştiren test kendi oturumunu açar.** Bu rehberin projesinde demo sunucu her oturuma siparişlerin ayrı bir kopyasını verir; iptal testi kendi girişini yapar ve diğer testler etkilenmez.
2. **Her işçiye ayrı hesap.** Worker-scoped bir fixture `workerInfo.workerIndex` ile her işçiye kendi hesabını açar.[^2]
3. **Test kendi verisini oluşturur.** Testten önce API ile yeni bir sipariş oluşturup onu iptal edin; başkasının verisine dokunmayın.

```ts
// tests/cancel-order.spec.ts
import { expect, signedOut, test } from "./fixtures";

test.use({ storageState: signedOut });

test("yönetici hazırlanan siparişi iptal eder", async ({ loginPage, ordersPage }) => {
  await loginPage.goto();
  await loginPage.login("yonetici@example.com");

  await ordersPage.cancel("SP-1001");
  await expect(ordersPage.row("SP-1001")).toContainText("İptal edildi");
});
```

## Test Kilitleri

Bazı kaynaklar gerçekten paylaşılır: tek bir dış servis, hesabın genel bir ayarı. Playwright 1.63 ile testlere adlandırılmış bir **kilit** verebilirsiniz. Aynı kilidi taşıyan testler dosya, işçi ve proje fark etmeksizin asla aynı anda çalışmaz; diğer testler paralel devam eder.[^5]

```ts
test("bildirim ayarını kapatır", { lock: "account-settings" }, async ({ page }) => {
  // ...
});
```

Kilit, izolasyonun yerine geçmez. Önce testi bağımsız yapmayı deneyin; paylaşılan kaynak gerçekten tekse kilit kullanın.

## Kendin Dene

- Page Object'lerinizi `test.extend` ile fixture'a çevirin. Testlerden `new` satırlarını silin.
- Setup projesi ekleyip yönetici oturumunu kaydedin. `playwright/.auth/admin.json` dosyasını açıp içinde ne olduğuna bakın.
- İkinci bir rol ekleyin ve o rolde yalnızca arayüzü değil API'yi de test edin.
- Veriyi değiştiren bir testi paylaşılan oturumla bırakıp `--repeat-each=5` ile çalıştırın. Başka bir test düşüyor mu?

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Playwright, "Fixtures"; worker kapsamı, otomatik fixture, seçenek fixture'ları ve sıralama.[^1]
- **Resmi doküman:** Playwright, "Authentication"; paylaşılan hesap, işçi başına hesap, API ile giriş ve birden fazla rol.[^2]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; testler arasında izolasyon.[^4]

## Kaynaklar

1. [Playwright: Fixtures](https://playwright.dev/docs/test-fixtures) *(doc)* — Hazır fixture'lar, `test.extend`, temizlik, worker kapsamı ve otomatik fixture.
2. [Playwright: Authentication](https://playwright.dev/docs/auth) *(doc)* — Setup projesi, `storageState`, güvenlik uyarısı, roller ve oturumsuz testler.
3. [Playwright: Projects](https://playwright.dev/docs/test-projects) *(doc)* — Proje bağımlılıkları ve setup projesi.
4. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — 14 Nisan 2011. İzolasyon eksikliği ve testin kendi başlangıç durumunu kurması.
5. [Playwright: Parallelism](https://playwright.dev/docs/test-parallel) *(doc)* — İşçi süreçleri ve test kilitleri.
