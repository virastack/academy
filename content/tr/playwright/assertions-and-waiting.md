---
title: "Assertion ve bekleme"
description: "Otomatik bekleme, web-first assertion ve hidrasyon."
lastVerified: "2026-10-22"
translationKey: "playwright/assertions-and-waiting"
---

## Neden bekleme yazmıyoruz?

Web sayfası asenkrondur. Butona tıklarsınız; istek gider, yanıt gelir, liste yeniden çizilir. Eski test araçlarında bu yüzden `sleep(2000)` gibi beklemeler yazılırdı. [Martin Fowler](https://martinfowler.com/) bunun iki yönlü kaybettiğini anlatır: uzun bekleme test paketini yavaşlatır, kısa bekleme yavaş bir makinede testi rastgele düşürür. Önerisi açıktır: sabit bekleme kullanmayın, bir sinyali bekleyin ya da koşul sağlanana kadar kısa aralıklarla tekrar bakın.[^1]

Playwright bu ikinci yolu kendisi yapar. Eylemlerden önce elementin hazır olmasını, assertion'larda da beklenen durumun oluşmasını bekler.

## Eylemlerden önce otomatik bekleme

`click()` çağırdığınızda Playwright tıklamadan önce şunları kontrol eder ve hepsi sağlanana kadar bekler:[^2]

- Locator tam olarak **bir** elemente uyuyor.
- Element **görünür**.
- Element **sabit**; animasyon bitmiş.
- Element **olayları alıyor**; üstünde başka bir element yok.
- Element **etkin**; `disabled` değil.
- Element **inert değil**; açık bir modalın arkasında kalmamış.

`fill()` için görünür, etkin ve düzenlenebilir olmak yeter. Kontroller zaman aşımına kadar sağlanmazsa eylem `TimeoutError` ile düşer.[^2]

> [!WARNING]
>
> `click({ force: true })` bu kontrollerin bir kısmını kapatır. Test geçer ama kullanıcının tıklayamadığı bir butona tıklamış olabilirsiniz. Önce elementin neden tıklanamadığını bulun.[^2]

## Web-First assertion'lar

`expect(locator)` ile başlayan assertion'lar koşul sağlanana kadar elementi tekrar tekrar bulur ve kontrol eder. Varsayılan bekleme süresi 5 saniyedir.[^3]

```ts
await page.getByRole("button", { name: "Cancel" }).click();
await expect(page.getByRole("status")).toHaveText("SP-1001 cancelled.");
```

Mesaj yarım saniye sonra gelse de test geçer. Bu assertion'lar asenkron olduğu için **mutlaka `await`** gerekir.

> [!DONT]
>
> ```ts
> expect(await page.getByText("Saved").isVisible()).toBe(true);
> ```
>
> `isVisible()` o anki durumu döndürür ve beklemez. Mesaj 100 milisaniye sonra gelirse test düşer.[^4]

> [!DO]
>
> ```ts
> await expect(page.getByText("Saved")).toBeVisible();
> ```

Sık kullanılan web-first assertion'lar:[^3]

| Assertion | Doğruladığı |
| :-- | :-- |
| `toBeVisible()` / `toBeHidden()` | Element görünür / görünmez ya da yok |
| `toHaveText()` | Metin tam eşleşir; dizi verilirse her element sırayla |
| `toContainText()` | Metin içinde geçer |
| `toHaveCount(n)` | Locator tam `n` elemente uyar |
| `toHaveValue()` | Input'un değeri |
| `toBeEnabled()` / `toBeDisabled()` | Etkin / devre dışı |
| `toBeFocused()` | Odak bu elementte |
| `toHaveAccessibleName()` | Erişilebilir ad |
| `toHaveURL()` | Sayfanın adresi; `baseURL`'e göre de yazılabilir |
| `toHaveTitle()` | Sayfa başlığı |

`toHaveText` bir dizi alırsa locator'ın uyduğu elementlerin sayısı ve sırası da eşleşmelidir. Liste testleri için idealdir:

```ts
await expect(page.getByRole("cell").nth(3).within(rows)).toHaveText(["Shipped", "Shipped"]);
```

Değillemek için `not` kullanın. `not` da bekler; koşulun **ortadan kalkmasını** bekler:[^3]

```ts
await expect(page.getByText("Loading orders...")).not.toBeVisible();
```

`expect(value)` ile başlayan genel assertion'lar *(`toBe`, `toEqual`, `toContain`)* ise beklemez; zaten elinizde olan bir değeri kontrol eder.[^3]

```ts
const response = await page.request.post("/api/orders/SP-1001/cancel");
expect(response.status()).toBe(403);
```

## Zaman aşımları

| Zaman aşımı | Varsayılan | Ayarı |
| :-- | :-- | :-- |
| Test | 30 saniye | `timeout` ya da `test.setTimeout()` |
| Assertion | 5 saniye | `expect: { timeout }` ya da assertion'a `{ timeout }` |
| Eylem ve gezinme | Sınır yok, test süresiyle sınırlı | `use: { actionTimeout, navigationTimeout }` |

Test süresine `beforeEach` ve fixture hazırlığı da dahildir.[^5] Bir assertion'ın süresini uzatmak çoğu zaman sorunu gizler. Önce neden yavaş olduğuna bakın.

## Soft assertion

Normalde ilk başarısız assertion testi durdurur. `expect.soft` testi başarısız işaretler ama devam eder; bir formdaki beş alanı tek seferde kontrol etmek gibi durumlarda tüm hataları birden görürsünüz:[^3]

```ts
await expect.soft(page.getByLabel("E-posta")).toHaveValue("admin@example.com");
await expect.soft(page.getByLabel("Parola")).toHaveValue("");
```

## expect.poll ve toPass

Bir locator'a değil de bir fonksiyonun sonucuna bağlı koşullar için iki araç var.[^3]

`expect.poll` fonksiyonu sonuç beklenen değere ulaşana kadar tekrar çağırır:

```ts
await expect
  .poll(async () => (await page.request.get("/api/orders?status=cancelled")).status())
  .toBe(200);
```

`toPass` bir kod bloğunu içindeki tüm assertion'lar geçene kadar tekrar çalıştırır:

```ts
await expect(async () => {
  const response = await page.request.get("/api/orders?status=all");
  expect(response.status()).toBe(200);
}).toPass({ timeout: 10_000 });
```

> [!NOTE]
>
> `toPass`'in varsayılan zaman aşımı 0'dır ve `expect` ayarındaki süreyi kullanmaz. Süreyi kendiniz verin; yoksa yalnızca test süresi sınırlar.[^3]

## Sabit bekleme yok

> [!DONT]
>
> ```ts
> await page.waitForTimeout(2000);
> ```
>
> Playwright dokümanı bu metodu "önerilmez" diye işaretler: süre beklemek doğası gereği kırılgandır ve yalnızca hata ayıklamada kullanılmalıdır.[^6]

`page.waitForLoadState("networkidle")` da aynı kategoridedir. Doküman `networkidle`'ı açıkça önermez ve hazır olmayı web-first assertion'larla doğrulamayı söyler.[^7] Bir sonraki adımın önkoşulu neyse onu bekleyin: liste mi yüklenecek, satır sayısını; mesaj mı gelecek, mesajı.

## Hidrasyon tuzağı

Server-side render edilen bir [!nextjs] sayfasında HTML, JavaScript'ten önce gelir. Playwright butonu görür, görünür ve etkin olduğu için tıklar. Ama React henüz sayfaya bağlanmadıysa *(hidrasyon)* `onClick` ya da `onSubmit` çalışmaz.

Sonuç uygulamaya göre değişir:

- `onSubmit` ile yönetilen bir formda tarayıcı formu kendisi gönderir; sayfa yenilenir ve alanlar boşalır.
- `onChange` ile çalışan bir select'te seçim kaybolur.

Bu rehberdeki [Formlar](/academy/forms/project) projesinin testleri tam bu yüzden ara sıra düşüyordu. Üç çözüm var:

1. **Formu JavaScript'siz de çalışır yapın.** `action` prop'una Server Action verilen form hidrasyondan önce de gönderilir *(bkz. [Server Actions ile form](/academy/forms/forms-with-server-actions))*. Hem test kararlı olur hem yavaş bağlantıdaki kullanıcı kazanır.
2. **Yalnızca istemci kodu çalışınca görünen bir şeyi bekleyin.** Örneğin TanStack Query ile tarayıcıda yüklenen bir liste. Satırlar göründüyse React çalışıyordur.
3. **Son çare `networkidle`.** Çalışır ama yavaştır ve doküman önermez.

Bu rehberin projesinde giriş formu Server Action kullanır; sipariş testleri de filtreye dokunmadan önce satırların yüklenmesini bekler.

## Düzen kayması

Otomatik bekleme elementin **sabit** olmasını bekler ama sizin tıklamanızdan sonraki kaymayı bilemez. Bir alandan çıkınca hata mesajı beliriyor ve alttaki butonu aşağı itiyorsa, Playwright butonun eski yerine tıklayabilir ve boşluğa basar. Kullanıcı da aynı sorunu yaşar.

Çözüm testte değil arayüzdedir: hata mesajı için yeri baştan ayırın *(`min-h-5` gibi)*. Formlar projesinde bu düzeltmeyle hem testler kararlı hale geldi hem de kayma ortadan kalktı.

## Kendin dene

- Bir assertion'ı `isVisible()` ile yazın, API yanıtına 500 milisaniye gecikme ekleyin. Test düşüyor mu? Sonra `toBeVisible()`'a çevirin.
- `toHaveText` ile bir listenin tüm elemanlarını sırasıyla doğrulayın. Bir eleman eksik olunca hata mesajı neyi gösteriyor?
- Bir testte `expect.soft` ile üç alan kontrol edin, ikisini bilerek yanlış yazın. Raporda kaç hata görüyorsunuz?
- `onSubmit` ile çalışan bir formun testini `--repeat-each=20` ile çalıştırın. Ara sıra düşüyor mu? Formu Server Action'a çevirip tekrar deneyin.

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Auto-waiting"; hangi eylemin hangi kontrolleri beklediğinin tam tablosu.[^2]
- **Resmi doküman:** Playwright, "Assertions"; tüm assertion'lar, soft, poll ve toPass.[^3]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; sabit beklemeler, izolasyon ve kırılgan testleri karantinaya almak.[^1]

## Kaynaklar

1. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — 14 Nisan 2011. Sabit beklemek yerine sinyal ya da yoklama, izolasyon ve karantina.
2. [Playwright: Auto-waiting](https://playwright.dev/docs/actionability) *(doc)* — Eylem öncesi kontroller, `force` seçeneği ve `TimeoutError`.
3. [Playwright: Assertions](https://playwright.dev/docs/test-assertions) *(doc)* — Web-first ve genel assertion'lar, `not`, soft, `expect.poll` ve `toPass`.
4. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Web-first assertion kullanmak, elle assertion yazmamak.
5. [Playwright: Timeouts](https://playwright.dev/docs/test-timeouts) *(doc)* — Test, assertion, eylem ve gezinme zaman aşımları.
6. [Playwright: Page.waitForTimeout](https://playwright.dev/docs/api/class-page#page-wait-for-timeout) *(doc)* — Önerilmeyen sabit bekleme ve yerine kullanılacaklar.
7. [Playwright: Page.waitForLoadState](https://playwright.dev/docs/api/class-page#page-wait-for-load-state) *(doc)* — `networkidle` durumunun önerilmemesi.
