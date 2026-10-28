---
title: "İlk test ve locator'lar"
description: "getByRole, strict mod, filtreleme ve within()."
lastVerified: "2026-10-22"
translationKey: "playwright/first-test-and-locators"
---

## Bir testin yapısı

Her test bir başlık ve async bir fonksiyondan oluşur. Fonksiyon ihtiyaç duyduğu araçları parametre olarak alır; bunlara **fixture** denir. En sık kullanılanı `page`'dir: test için açılmış, temiz bir tarayıcı sekmesi.[^1]

```ts
// tests/login.spec.ts
import { test, expect } from "@playwright/test";

test("a wrong password shows an error message", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("E-posta").fill("admin@example.com");
  await page.getByLabel("Parola").fill("wrongpass");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect.");
});
```

Üç parça var: sayfaya git, kullanıcı gibi davran, sonucu doğrula. `page.goto("/login")` yapılandırmadaki `baseURL`'i kullanır *(bkz. [Kurulum](/academy/playwright/setup))*. Her test kendi tarayıcı bağlamında çalışır; cookie'ler, `localStorage` ve oturum testler arasında paylaşılmaz.[^1][^2]

Ortak hazırlığı `test.beforeEach` ile, ilgili testleri `test.describe` ile gruplayın:[^1]

```ts
test.describe("order list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
  });

  test("lists all orders", async ({ page }) => {
    // ...
  });
});
```

## Locator nedir?

Locator, sayfada bir elementi **bulmanın tarifidir**; elementin kendisi değil. Locator oluşturmak sayfaya dokunmaz. Element ancak bir eylem *(`click`, `fill`)* ya da assertion sırasında aranır ve her seferinde yeniden aranır. Sayfa yeniden render olsa da locator güncel elementi bulur.[^3]

```ts
const submit = page.getByRole("button", { name: "Sign in" }); // henüz arama yok
await submit.click(); // şimdi aranır, görünür ve tıklanabilir olması beklenir
```

## Hangi locator?

Playwright dokümanı kullanıcının gördüğü özellikleri ve açık sözleşmeleri öncelemenizi önerir. Kullanıcı bir butonu sınıf adıyla değil, rolü ve üzerindeki yazıyla tanır:[^3][^4]

| Locator | Ne zaman |
| :-- | :-- |
| `getByRole` | Buton, link, başlık, tablo, checkbox; ilk tercih |
| `getByLabel` | Etiketi olan form alanları |
| `getByPlaceholder` | Etiketi olmayan alan *(etiket eklemek daha iyi)* |
| `getByText` | Etkileşimsiz metin: mesaj, paragraf |
| `getByAltText` | Görseller |
| `getByTitle` | `title` özelliği olan elementler |
| `getByTestId` | Başka yolu olmayan durumlar için `data-testid` |

`getByRole` elementin erişilebilirlik ağacındaki rolünü ve **erişilebilir adını** kullanır. Yani ekran okuyucunun gördüğünü görür.[^3] Bir buton `getByRole` ile bulunamıyorsa çoğu zaman bir erişilebilirlik sorunu vardır *(bkz. [Erişilebilirlik testi](/academy/performance-accessibility/accessibility-testing))*.

```ts
page.getByRole("heading", { name: "Orders" });
page.getByRole("link", { name: "Sign out" });
page.getByRole("checkbox", { name: "Remember me" });
page.getByRole("table", { name: "Order list" }); // <caption> adı verir
```

`name` varsayılan olarak **büyük küçük harf duyarsız ve parça eşleşmesi** yapar. `"Sign in"`, "Sign in" butonunu da bulur. Tam eşleşme için `exact: true` verin ya da düzenli ifade kullanın:[^5]

```ts
page.getByRole("button", { name: "Sign in", exact: true });
page.getByRole("button", { name: /^giriş yap$/i });
```

> [!DONT]
>
> CSS sınıfına ya da DOM yapısına bağlı locator yazmayın. Tasarımcı sınıfı değiştirdiğinde test kırılır, oysa kullanıcı için hiçbir şey değişmemiştir.[^4]
>
> ```ts
> page.locator("button.btn-primary.mt-4");
> page.locator("//div[2]/form/button");
> ```

> [!DO]
>
> ```ts
> page.getByRole("button", { name: "Sign in" });
> ```

## Strict mod

Locator'lar katıdır: bir eylem tek element bekler. Locator birden fazla elemente uyuyorsa Playwright tahmin etmez, "strict mode violation" hatası verir.[^3]

```ts
// Sayfada iki "Cancel" butonu varsa hata verir
await page.getByRole("button", { name: "Cancel" }).click();
```

Çözüm `first()` değil, aramayı daraltmaktır. `first()` bugün doğru elementi bulur; yarın sıralama değişince sessizce yanlışına tıklar.

[!nextjs] uygulamalarında sık bir tuzak: sayfada kendi `role="alert"` mesajınızın yanında Next'in yönlendirme duyurucusu da olabilir. `page.getByRole("alert")` iki element bulur. Aramayı formun içine daraltın:

```ts
const form = page.getByRole("form", { name: "Sign in" });
await expect(form.getByRole("alert")).toHaveText("Email or password is incorrect.");
```

`<form>` yalnızca erişilebilir bir adı varsa `form` rolü alır; adı `aria-label` ya da `aria-labelledby` ile verin.

## Zincirleme ve filtreleme

Locator'lar zincirlenebilir. Her halka aramayı bir öncekinin içine daraltır:[^3]

```ts
page.getByRole("table", { name: "Order list" }).getByRole("row");
```

`filter` bir listeyi metne ya da içerdiği başka bir locator'a göre süzer. Tablodaki belirli bir satırın butonuna basmanın en okunur yolu budur:[^3][^4]

```ts
await page
  .getByRole("row")
  .filter({ hasText: "SP-1001" })
  .getByRole("button", { name: "Cancel" })
  .click();
```

| Seçenek | Anlamı |
| :-- | :-- |
| `hasText` / `hasNotText` | İçinde bu metin geçen / geçmeyen |
| `has` / `hasNot` | İçinde bu locator'a uyan element olan / olmayan |
| `visible` | Yalnızca görünür *(ya da görünmez)* olanlar |

Başlık satırını dışarıda bırakmak için hücre içeren satırları alın: `getByRole("row").filter({ has: page.getByRole("cell") })`. Başlık hücrelerinin rolü `columnheader`'dır.

## Locator.within()

Playwright 1.64 ile gelen `within()`, elinizdeki iki locator'ı doğal sırayla birleştirir: "bu buton, şu diyaloğun içinde".[^6]

```ts
const save = page.getByRole("button", { name: "Kaydet" });
const dialog = page.getByRole("dialog");
await save.within(dialog).click();
```

Asıl gücü sütun sorgularıdır. `nth()` ve `first()` her ebeveynin içinde ayrı ayrı çözülür; böylece "her satırın dördüncü hücresi" yazılabilir:[^6]

```ts
const rows = page.getByRole("row").filter({ has: page.getByRole("cell") });
const statusCells = page.getByRole("cell").nth(3).within(rows);

await expect(statusCells).toHaveText(["Shipped", "Shipped"]);
```

> [!WARNING]
>
> `within()`'e verilen ilk locator bağımsız olmalı. `rows.getByRole("cell").nth(3).within(rows)` satırların içinde bir kez daha satır arar ve hiçbir şey bulmaz. Bu rehberin projesini yazarken tam olarak bu hatayı yaptık.

## Görünür elementler

`visible()` *(1.63)* yalnızca görünür elementlere uyan bir locator döndürür. Eski `:visible` CSS sözde sınıfının önerilen yerine geçenidir.[^7] `getByRole` zaten gizli elementleri atlar; `visible()` daha çok `locator()` ve `getByText` ile işe yarar.

```ts
await page.getByText("Saved").visible().click();
```

## Codegen ile locator bulmak

Hangi locator'ı yazacağınızdan emin değilseniz Playwright'a sorun. `codegen` bir tarayıcı açar; tıkladığınız her elemente rol, metin ve test id önceliğiyle bir locator önerir ve birden fazla element eşleşirse locator'ı tekilleştirir:[^4][^8]

```command
npx playwright codegen localhost:3000
```

"Pick locator" ile bir elementin üzerine gelin; önerilen locator'ı kopyalayın. Kaydedilen testi olduğu gibi kullanmayın; adımları okunur hale getirip assertion ekleyin.

> [!NOTE]
>
> [!nextjs] dokümanındaki örnek test `page.click("text=About")` ve `page.locator("h1")` kullanır. İkisi de çalışır ama eski yazımdır. Aynı testi `page.getByRole("link", { name: "About" }).click()` ve `page.getByRole("heading", { name: "About" })` ile yazın.[^9]

## Kendin dene

- [Kurulum](/academy/playwright/setup) dersindeki projede bir giriş formu için test yazın. Locator'ları önce `codegen` ile bulun, sonra elle sadeleştirin.
- Bir butonu `getByRole` ile bulamıyorsanız nedenini araştırın: buton bir `<div>` mi, adı ikon mu?
- `name: "Gir"` ve `name: "Gir", exact: true` ile aynı butonu aramayı deneyin. Hangisi buluyor?
- Bir tabloda iki satırda aynı butonu bırakın ve `click()` çağırın. Strict mod hatasını okuyun, sonra `filter` ile düzeltin.

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Locators"; tüm locator'lar, filtreleme, zincirleme ve strict mod.[^3]
- **Resmi doküman:** Playwright, "Best Practices"; kullanıcı odaklı locator'lar ve CSS'ten kaçınmak.[^4]

## Kaynaklar

1. [Playwright: Writing tests](https://playwright.dev/docs/writing-tests) *(doc)* — Test yapısı, eylemler, `beforeEach`, `describe` ve test izolasyonu.
2. [Playwright: Isolation](https://playwright.dev/docs/browser-contexts) *(doc)* — Her testin kendi tarayıcı bağlamında çalışması.
3. [Playwright: Locators](https://playwright.dev/docs/locators) *(doc)* — Locator türleri, öncelik, filtreleme, zincirleme ve strict mod.
4. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Kullanıcının gördüğünü test etmek, zincirleme ve codegen.
5. [Playwright: Page.getByRole](https://playwright.dev/docs/api/class-page#page-get-by-role) *(doc)* — `name` eşleşmesi, `exact` ve diğer seçenekler.
6. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `Locator.within()` ve ebeveyn içinde çözülen `nth`.
7. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — `Locator.visible()`.
8. [Playwright: Generating tests](https://playwright.dev/docs/codegen-intro) *(doc)* — Codegen ile test kaydı ve locator seçimi.
9. [Next.js: How to set up Playwright with Next.js](https://nextjs.org/docs/app/guides/testing/playwright) *(doc)* — Next.js ile ilk Playwright testi.
