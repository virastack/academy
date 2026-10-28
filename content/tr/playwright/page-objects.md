---
title: "Page Object"
description: "Locator'ları ve akışları sayfa nesnelerinde toplamak."
lastVerified: "2026-10-22"
translationKey: "playwright/page-objects"
---

## Sorun: Tekrar eden locator'lar

Giriş akışını test eden on test düşünün. Her biri e-posta alanını, parola alanını ve butonu kendisi bulur. Buton metni "Sign in"tan "Oturum aç"a değişince on dosyayı düzeltirsiniz.

**Page Object** bu tekrarı bir sınıfta toplar. Playwright dokümanı iki faydasını sayar: uygulamanıza uygun, üst seviye bir API ile testi **yazmayı kolaylaştırır**; locator'ları tek yerde toplayarak **bakımı kolaylaştırır**.[^1]

[Martin Fowler](https://martinfowler.com/) kalıbın amacını şöyle anlatır: Page Object, bir insanın sayfada yapabildiği ve görebildiği her şeyi test koduna sunar, alttaki HTML ayrıntısını gizler. Test "e-posta alanına yaz" der; alanın nasıl bulunduğunu bilmez.[^2]

## İlk Page Object

```ts
// tests/pages/login-page.ts
import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole("form", { name: "Sign in" });
    this.email = form.getByLabel("Email");
    this.password = form.getByLabel("Password");
    this.submit = form.getByRole("button", { name: "Sign in" });
    this.error = form.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password = "password123") {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
```

İki tür üye var:

- **Locator alanları** *(`email`, `error`)*: testin doğrulayacağı ya da tek başına kullanacağı elementler. Locator oluşturmak sayfaya dokunmadığı için constructor'da tanımlamak güvenlidir *(bkz. [İlk test ve locator'lar](/academy/playwright/first-test-and-locators))*.
- **Eylem metodları** *(`goto`, `login`)*: birkaç adımdan oluşan, kullanıcının diliyle adlandırılmış akışlar.

Test artık niyeti okur:

```ts
// tests/login.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login-page";

test("a wrong password shows an error and keeps the email", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("admin@example.com", "wrongpass");

  await expect(loginPage.error).toHaveText("Email or password is incorrect.");
  await expect(loginPage.email).toHaveValue("admin@example.com");
});
```

## Satıra ve listeye metod

Tabloda belirli bir satır gibi parametreli elementler için locator döndüren bir metod yazın:

```ts
// tests/pages/orders-page.ts
export class OrdersPage {
  readonly table: Locator;
  readonly rows: Locator;
  readonly statusFilter: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByRole("table", { name: "Order list" });
    this.rows = this.table.getByRole("row").filter({ has: page.getByRole("cell") });
    this.statusFilter = page.getByLabel("Status");
  }

  row(orderId: string) {
    return this.rows.filter({ hasText: orderId });
  }

  async filterBy(label: string) {
    await this.statusFilter.selectOption({ label });
  }

  async cancel(orderId: string) {
    await this.row(orderId).getByRole("button", { name: "Cancel" }).click();
  }
}
```

`row("SP-1001")` hem eylemde *(`cancel`)* hem assertion'da kullanılır:

```ts
await expect(ordersPage.row("SP-1001")).toContainText("Cancelled");
```

## Assertion Page Object'e girer mi?

İki görüş var.

[Martin Fowler](https://martinfowler.com/) Page Object'in assertion yapmamasını savunur. Görevi sayfanın durumunu sunmaktır; doğrulama testin işidir. Tek istisna, sayfanın her zaman doğru olması gereken bir değişmezini kontrol etmektir.[^2] Playwright dokümanının örneğinde ise bir eylem metodu `expect` ile bir sonraki sayfanın açıldığını doğrular.[^1]

Pratik bir ayrım:

| Page Object'e | Teste |
| :-- | :-- |
| Eylemin tamamlandığını beklemek *(sonraki sayfa geldi mi)* | Testin asıl iddiası *(mesaj doğru mu, satır iptal edildi mi)* |
| Locator ve eylem | Senaryoya özel beklenen değerler |

Testi okuyan kişi neyin doğrulandığını Page Object'e girmeden görebilmelidir. "Asıl iddia testte" kuralı bunu sağlar.

## Sayfa değil, anlamlı parça

Adına rağmen Page Object sayfayla birebir eşleşmek zorunda değildir. [Martin Fowler](https://martinfowler.com/) sayfadaki **anlamlı parçalar** için nesne yazmayı önerir: bir albüm listesi sayfası birkaç albüm nesnesi, bir üst bilgi ve bir alt bilgi nesnesi içerebilir.[^2] Her sayfada tekrar eden bir gezinme menüsü ya da bir tarih seçici kendi nesnesini hak eder:

```ts
export class DatePicker {
  constructor(private readonly root: Locator) {}

  async pick(day: number) {
    await this.root.getByRole("button", { name: "Open the calendar" }).click();
    await this.root.getByRole("gridcell", { name: String(day), exact: true }).click();
  }
}
```

Kök bir `Locator` alan nesne sayfanın neresinde olursa olsun çalışır: `new DatePicker(page.getByRole("group", { name: "Teslim tarihi" }))`.

## Aşırı soyutlamadan kaçının

Page Object bir araçtır, hedef değil. Sık görülen hatalar:

- **Her elemente metod:** `clickSubmitButton()`, `getEmailInput()`. Locator alanını açın; `loginPage.submit.click()` yeterince okunur.
- **Tek kullanımlık akışlar:** Yalnızca bir testte geçen adımı Page Object'e taşımak tekrar azaltmaz, sadece testi okumayı zorlaştırır.
- **Locator'ı gizleyip boolean döndürmek:** `isErrorVisible(): Promise<boolean>` web-first assertion'ın beklemesini kaybettirir *(bkz. [Assertion ve bekleme](/academy/playwright/assertions-and-waiting))*. Locator döndürün, testte `expect` ile doğrulayın.

Playwright dokümanı da basit testlerde biraz tekrarın kabul edilebilir olduğunu, okunurluğu artırıyorsa tercih edilebileceğini söyler.[^3]

> [!NOTE]
>
> Playwright dokümanının Page Object örneği locator'ları `page.locator("a", { hasText: "Get started" })` ve CSS seçicilerle yazar. Kalıbı oradan öğrenin, locator'ları bu rehberdeki gibi `getByRole` ve `getByLabel` ile yazın.[^1]

## Her testte `new` yazmamak

Her testin başında `new LoginPage(page)` yazmak da bir tekrardır. Bir sonraki derste Page Object'leri **fixture** olarak vereceğiz; test parametresinde hazır gelecekler:

```ts
test("wrong password", async ({ loginPage }) => {
  await loginPage.goto();
});
```

## Kendin dene

- Giriş testlerinizdeki locator'ları bir `LoginPage` sınıfına taşıyın. Buton metnini değiştirip kaç dosyayı düzeltmeniz gerektiğine bakın.
- Bir tablo için `row(id)` metodu yazın ve hem bir eylemde hem bir assertion'da kullanın.
- Sayfanızda tekrar eden bir parça bulun *(menü, arama kutusu)* ve kök `Locator` alan bir bileşen nesnesi yazın.
- Page Object'lerinizdeki `Promise<boolean>` döndüren metodları bulun ve locator döndürecek şekilde değiştirin.

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Page object models"; Playwright'ta kalıbın uygulanışı.[^1]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Page Object"; kalıbın amacı, assertion tartışması ve parçalara bölmek.[^2]

## Kaynaklar

1. [Playwright: Page object models](https://playwright.dev/docs/pom) *(doc)* — Page Object sınıfı, locator alanları ve testte kullanımı.
2. [Martin Fowler](https://martinfowler.com/): [Page Object](https://martinfowler.com/bliki/PageObject.html) *(article)* — 10 Eylül 2013. Kalıbın amacı, assertion'ların yeri, parçalara bölmek ve başka Page Object döndürmek.
3. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Test izolasyonu ve basit testlerde tekrarın kabul edilebilirliği.
