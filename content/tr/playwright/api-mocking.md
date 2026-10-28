---
title: "API mock"
description: "page.route, yanıt değiştirme ve request fixture'ı."
lastVerified: "2026-10-22"
translationKey: "playwright/api-mocking"
---

## Neden mock?

Gerçek sunucu çoğu zaman istediğiniz durumu vermez. Sunucu hatası, boş liste, çok uzun bir müşteri adı ya da yavaş bir yanıt için veritabanını bozmak istemezsiniz. Playwright tarayıcının yaptığı her isteği yakalayıp istediğiniz yanıtı verebilir.[^1]

Playwright dokümanı kontrol etmediğiniz üçüncü parti servisleri test etmemeyi, onların yanıtlarını ağ API'siyle garanti altına almayı da önerir.[^2] [Martin Fowler](https://martinfowler.com/) da uzak servisleri kırılgan testlerin başlıca kaynaklarından sayar ve test dublörleriyle belirli yanıtlar almayı önerir.[^3]

## page.route ile sahte yanıt

`page.route` bir URL kalıbı ve bir işleyici alır. `route.fulfill` isteği sunucuya hiç göndermeden yanıtlar:[^1]

```ts
test("empty list message", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) => route.fulfill({ json: { orders: [] } }));

  await ordersPage.goto();
  await expect(ordersPage.empty).toBeVisible();
});
```

Kuralı **sayfaya gitmeden önce** kurun. Sayfa yüklenirken giden ilk istek de yakalanır.[^1]

`json` verdiğinizde `Content-Type` başlığı kendiliğinden eklenir. Hata durumu için `status` verin:

```ts
await page.route("**/api/orders?*", (route) =>
  route.fulfill({ status: 500, json: { error: "Server error" } }),
);
```

## Hata ve tekrar deneme

Bu rehberin projesindeki sipariş listesi [!tanstack-query] ile yüklenir; hata olunca "Orders could not be loaded." ve "Try again" butonu gösterir. Testte önce hatayı üretir, sonra kuralı kaldırıp butona basarsınız:

```ts
test("error state and retry on a server error", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", (route) =>
    route.fulfill({ status: 500, json: { error: "Server error" } }),
  );

  await ordersPage.goto();
  await expect(ordersPage.loadError).toBeVisible();

  await page.unroute("**/api/orders?*");
  await ordersPage.loadError.getByRole("button", { name: "Try again" }).click();

  await expect(ordersPage.rows).toHaveCount(6);
});
```

> [!NOTE]
>
> TanStack Query başarısız bir sorguyu varsayılan olarak 3 kez, artan aralıklarla tekrar dener. Hata ekranı birkaç saniye sonra görünür ve 5 saniyelik assertion süresini aşabilir. Projede `QueryClient` için `retry: 1` ayarlıdır *(bkz. [TanStack Query](/academy/tanstack-query))*. Testi geçirmek için uygulamadaki tekrar denemeyi kapatmayın; ayarın gerçek kullanıcıya uygun olup olmadığına bakın.

## Gerçek yanıtı değiştirmek

Bazen yanıtın çoğu gerçek kalsın, tek bir alan değişsin istersiniz. `route.fetch` isteği gerçekten yapar; yanıtı değiştirip `fulfill` ile verirsiniz:[^1]

```ts
test("a long customer name does not break the table", async ({ page, ordersPage }) => {
  await page.route("**/api/orders?*", async (route) => {
    const response = await route.fetch();
    const { orders } = await response.json();
    orders[0].customer = "Wilhelmina Fitzgerald-Montgomery Vandersteen Verylongsurname";
    await route.fulfill({ response, json: { orders } });
  });

  await ordersPage.goto();
  await expect(ordersPage.row("SP-1001")).toContainText("Verylongsurname");
});
```

`response`'u vermek durum kodunu ve başlıkları korur; yalnızca gövde değişir.

## Yükleniyor durumu

Yükleniyor ekranı çoğu zaman o kadar kısa sürer ki assertion yakalayamaz. `page.waitForTimeout` ile gecikme eklemek yerine yanıtı bir sözle *(Promise)* tutun ve testin kendisi bıraksın:

```ts
test("the loading state is visible", async ({ page, ordersPage }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));

  await page.route("**/api/orders?*", async (route) => {
    await gate;
    await route.continue();
  });

  await ordersPage.goto();
  await expect(ordersPage.loading).toBeVisible();

  release();
  await expect(ordersPage.rows).toHaveCount(6);
});
```

`route.continue()` isteği değiştirmeden sunucuya gönderir. Süre yerine olaya bağlı olduğu için test her makinede aynı davranır.

## Diğer eylemler

| Metod | Ne yapar |
| :-- | :-- |
| `route.fulfill()` | Sunucuya gitmeden yanıt verir |
| `route.fetch()` | İsteği yapar, yanıtı size verir |
| `route.continue()` | İsteği gönderir; başlık, metod ya da gövdeyi değiştirebilir |
| `route.abort()` | İsteği iptal eder; ağ hatası taklidi |
| `page.unroute()` | Kuralı kaldırır |

Görselleri engelleyerek testi hızlandırmak gibi kurallar da yazılabilir: `page.route("**/*.{png,jpg,jpeg}", (route) => route.abort())`.[^4]

## URL kalıpları

Glob kalıbı URL'nin **tamamına** uymalıdır:[^4]

- `*` eğik çizgi dışındaki her şeye uyar, `**` eğik çizgi dahil her şeye.
- `?` herhangi bir karaktere değil, yalnızca soru işaretinin kendisine uyar.
- `{png,jpg}` seçeneklerden birine uyar.

`"**/api/orders"` kalıbı `/api/orders?status=all` isteğine **uymaz**; sorgu dizesi de URL'nin parçasıdır. Projede bu yüzden `"**/api/orders?*"` kullanılır. Karmaşık durumlar için düzenli ifade verin: `page.route(/\/api\/orders(\?|$)/, …)`.

## Yanıtı beklemek ve doğrulamak

Bir eylemin doğru isteği gönderdiğini doğrulamak için `waitForResponse` kullanın. Bekleyiciyi eylemden **önce** başlatın, sonra bekleyin:[^4]

```ts
const responsePromise = page.waitForResponse("**/api/orders/SP-1001/cancel");
await ordersPage.cancel("SP-1001");
const response = await responsePromise;
expect(response.status()).toBe(200);
```

Çoğu durumda bunu yapmanız gerekmez. Ekrandaki sonucu doğrulamak *(satır "Cancelled" oldu mu)* hem kullanıcının gördüğünü test eder hem de yanıtı dolaylı olarak bekler.

## Tarayıcısız API testi

`request` fixture'ı tarayıcı açmadan HTTP isteği atar. Yetki kurallarını hızlıca denemek ya da teste veri hazırlamak için idealdir.[^5]

```ts
test("a request without a session returns 401", async ({ request }) => {
  const response = await request.get("/api/orders");
  expect(response.status()).toBe(401);
});
```

`page.request` ise sayfanın cookie'lerini paylaşır; oturum açmış kullanıcı adına istek atar *(bkz. [Auth ve fixture](/academy/playwright/auth-and-fixtures))*. Playwright 1.63 ile `request.get<User>(...)` gibi bir tip parametresi `json()`'ın dönüşünü tipler.[^6]

## HAR dosyaları

Çok sayıda isteği tek tek mock'lamak yerine gerçek trafiği bir HAR dosyasına kaydedip testlerde oradan oynatabilirsiniz. `update: true` kaydeder, olmadan oynatır:[^1]

```ts
await page.routeFromHAR("./hars/orders.har", {
  url: "**/api/orders?*",
  update: true,
});
```

Kaydı bir kez alın, dosyayı depoya ekleyin, `update`'i kaldırın. Veri değiştiğinde kaydı yenilemeyi unutmayın.

## Next.js'te sınır: Sunucu istekleri

`page.route` yalnızca **tarayıcının** yaptığı istekleri görür. Bir Server Component'in ya da Server Action'ın sunucuda yaptığı `fetch` tarayıcıdan geçmez; Playwright onu yakalayamaz.

Bu rehberin projesinde sipariş listesi tarayıcıda, TanStack Query ile yüklendiği için mock'lanabilir. Aynı liste bir Server Component'te çekilseydi seçenekler:

- Testleri test verisiyle dolu ayrı bir ortama karşı çalıştırmak.
- Dış servisin adresini ortam değişkeniyle bir sahte sunucuya yönlendirmek.
- Sunucu tarafı mantığı [Vitest](/academy/vitest) ile ayrıca test etmek.

> [!WARNING]
>
> Uygulamanız Mock Service Worker *(MSW)* gibi bir Service Worker tabanlı mock aracı kullanıyorsa, o araç istekleri devralır ve `page.route` onları göremez. Playwright dokümanı bu durumda testlerde Playwright'ın kendi yönlendirmesini kullanmayı ya da Service Worker'ları `serviceWorkers: "block"` ile kapatmayı önerir.[^4]

## Kendin dene

- Sipariş listesine 500 döndürün ve hata mesajını doğrulayın. `retry` ayarını kaldırıp testin ne kadar sürdüğüne bakın.
- `route.fetch` ile gerçek yanıtı alıp bir siparişin durumunu "Shipped" yapın. Tablonun buna göre güncellendiğini doğrulayın.
- `"**/api/orders"` kalıbının neden uymadığını görmek için bir test yazın, sonra `"**/api/orders?*"` ile düzeltin.
- `request` fixture'ıyla oturumsuz ve izleyici rolüyle iptal isteği atıp durum kodlarını doğrulayın.

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Mock APIs"; sahte yanıt, yanıt değiştirme ve HAR.[^1]
- **Resmi doküman:** Playwright, "Network"; istek olayları, URL kalıpları ve Service Worker notu.[^4]
- **Resmi doküman:** Playwright, "API testing"; `request` fixture'ı ile tarayıcısız test.[^5]

## Kaynaklar

1. [Playwright: Mock APIs](https://playwright.dev/docs/mock) *(doc)* — `route.fulfill`, `route.fetch` ile yanıt değiştirme ve `routeFromHAR`.
2. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Üçüncü parti bağımlılıkları test etmemek, yanıtı ağ API'siyle garanti altına almak.
3. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — 14 Nisan 2011. Uzak servisler, test dublörleri ve kontrat testleri.
4. [Playwright: Network](https://playwright.dev/docs/network) *(doc)* — `route.abort`, `waitForResponse`, glob kalıpları ve Service Worker'lar.
5. [Playwright: API testing](https://playwright.dev/docs/api-testing) *(doc)* — `request` fixture'ı ve `APIRequestContext`.
6. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — İstek metodlarında tipli `json()`.
