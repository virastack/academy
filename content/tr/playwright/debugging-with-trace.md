---
title: "Trace ile hata ayıklama"
description: "UI Mode, Inspector, trace ve kırılgan testler."
lastVerified: "2026-10-22"
translationKey: "playwright/debugging-with-trace"
---

## Önce hata mesajını okuyun

Başarısız bir testin çıktısı çoğu zaman sorunu söyler. Bu rehberin projesinde sipariş sayısını bilerek yanlış yazınca çıkan hata:

```bash
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('table', { name: 'Order list' }).getByRole('row').filter({ has: getByRole('cell') })
Expected: 7
Received: 6
Timeout:  2000ms

Call log:
  - waiting for getByRole('table', { name: 'Order list' }).getByRole('row')...
    6 × locator resolved to 0 elements
    14 × locator resolved to 6 elements
```

Call log hikâyeyi anlatır: tablo önce boştu *(liste yükleniyordu)*, sonra 6 satır geldi ve hiç 7 olmadı. Locator doğru, beklenti yanlış. "0 element" satırı hiç bitmeseydi locator'ı sorgulardınız.

Hata ayrıca bir **error-context** dosyası üretir: `test-results/<test>/error-context.md`. İçinde testin adı, hata ve sayfanın o anki aria snapshot'ı vardır. Dosya bir yapay zekâ asistanına "neden düştü, düzeltmesi ne" diye sorulacak biçimde yazılmıştır; kendiniz okurken de sayfada neyin göründüğünü hızlıca gösterir.

## UI Mode

Test yazarken en verimli araç UI Mode'dur:[^1]

```command
npx playwright test --ui
```

- Testleri listeden seçip çalıştırırsınız; dosya değişince yeniden çalıştıran izleme modu vardır.
- Her adım zaman çizelgesinde görünür. Bir adıma tıklayınca sayfanın o anki halini görürsünüz.
- "Pick locator" ile sayfadaki bir elementin locator'ını alırsınız.
- Konsol, ağ istekleri ve hata aynı ekrandadır.

## Inspector ile adım adım

`--debug` testi görünür tarayıcıda başlatır ve Playwright Inspector'ı açar. Her eylemden önce durur; adım adım ilerler, locator'ı canlı düzenler ve hangi elementlere uyduğunu görürsünüz.[^2]

```command
npx playwright test tests/orders.spec.ts:13 --debug
```

Dosya adından sonraki `:13` yalnızca o satırdaki testi çalıştırır. Testin belirli bir yerinde durmak için koda `await page.pause()` ekleyin. [!vscode] eklentisi aynı şeyi kesme noktalarıyla yapar.[^2]

Inspector'daki **actionability log** bir eylemin neden beklediğini söyler: "element is not visible", "element is not enabled", "another element would receive the click" gibi *(bkz. [Assertion ve bekleme](/academy/playwright/assertions-and-waiting))*.[^2]

## Trace nedir?

Trace, bir test çalıştırmasının tam kaydıdır: her eylem, öncesi ve sonrasındaki DOM, ağ istekleri, konsol mesajları, kaynak kod satırı. CI'da düşen bir testi kendi makinenizde **yeniden çalıştırmadan** incelemenizi sağlar. Playwright dokümanı CI hataları için video ve ekran görüntüsü yerine trace önerir.[^3]

## Trace kaydetmek

`use.trace` hangi çalıştırmada trace kaydedileceğini belirler:[^4]

| Mod | Kaydeder | Saklar |
| :-- | :-- | :-- |
| `"off"` | Hiç | — |
| `"on"` | Her çalıştırmada | Her zaman |
| `"retain-on-failure"` | Her çalıştırmada | Çalıştırma düştüyse |
| `"retain-on-first-failure"` | Yalnızca ilk çalıştırmada | İlk çalıştırma düştüyse |
| `"on-first-retry"` | Yalnızca ilk tekrar denemede | Her zaman |
| `"on-all-retries"` | Her tekrar denemede | Her zaman |

Oluşturulan yapılandırma `"on-first-retry"` kullanır. CI'da `retries: 2` olduğu için düşen test bir kez daha çalışır ve o çalıştırma kaydedilir. Doküman `"on"`'u her test için önermez; trace kaydetmek testleri yavaşlatır.[^3]

> [!NOTE]
>
> Yerelde `retries: 0` olduğu için `"on-first-retry"` hiç trace üretmez. Yerelde trace istiyorsanız komut satırından açın:
>
> ```command
> npx playwright test --trace on
> ```

Trace'ler HTML rapordan açılır ya da doğrudan:[^5]

```command
npx playwright show-trace test-results/orders-filters-by-status-chromium/trace.zip
```

[trace.playwright.dev](https://trace.playwright.dev) aynı görüntüleyicinin web sürümüdür. Dosyayı sürükleyip bırakırsınız; trace tamamen tarayıcınızda açılır, hiçbir yere gönderilmez.[^5]

## Trace viewer'da neye bakılır?

| Sekme | Ne gösterir |
| :-- | :-- |
| Actions | Her eylem, locator'ı ve süresi; üzerine gelince sayfa |
| Snapshots | Eylemin öncesi, anı ve sonrası; tıklanan nokta işaretli |
| Source | Eylemin test dosyasındaki satırı |
| Call / Log | Eylemin parametreleri ve actionability adımları |
| Errors | Hata mesajı ve yeri |
| Console | Tarayıcı ve test konsolu |
| Network | Tüm istekler, durum kodu ve yanıt gövdesi |

Snapshot'lar ekran görüntüsü değil, DOM kopyasıdır. Geliştirici araçlarıyla inceleyebilir, locator deneyebilirsiniz.[^5]

Playwright 1.63 ile trace'e aria snapshot ve ekran görüntüsü de eklenebilir. "Display Aria" modu ekran görüntüsünü ve erişilebilirlik ağacını yan yana gösterir:[^6]

```ts
use: {
  trace: {
    mode: "retain-on-failure",
    snapshots: { dom: true, aria: true, screen: true },
  },
},
```

## Kendi adımlarınız

Uzun testlerde `test.step` raporu ve trace'i okunur kılar. Adımlar raporda ve Trace Viewer'da başlıklarıyla görünür.[^7]

```ts
test("an admin cancels the order", async ({ loginPage, ordersPage }) => {
  await test.step("sign in", async () => {
    await loginPage.goto();
    await loginPage.login("admin@example.com");
  });

  await test.step("Cancel SP-1001", async () => {
    await ordersPage.cancel("SP-1001");
  });
});
```

## Kırılgan testi yakalamak

Bazen düşen, bazen geçen teste **kırılgan** *(flaky)* denir. Bir kez çalıştırarak yakalanmaz. İki seçenek işe yarar:[^8][^9]

```command
npx playwright test --repeat-each=10
```

```command
npx playwright test --shuffle
```

`--repeat-each` her testi N kez çalıştırır; zamanlamaya bağlı hatalar ortaya çıkar. `--shuffle` *(1.64)* testleri rastgele sırayla çalıştırır ve birbirine gizlice bağımlı testleri bulur. Çıktıdaki tohum değerini `--shuffle 271828182` gibi verip aynı sırayı tekrar üretebilirsiniz.[^9]

Bu rehberin projesinde `--shuffle --repeat-each=3 --workers=4` bir testi düşürdü: önceki bir `beforeEach` sayfayı `/orders`'a yönlendirirken test `/login`'e gidiyordu ve iki gezinme çakışıyordu. Hata yalnızca belirli bir sırada çıkıyordu. Düzeltme, veriyi değiştiren testi ortak `beforeEach`'i olmayan kendi dosyasına taşımaktı.

Son düşen testleri tekrar çalıştırmak için:[^8]

```command
npx playwright test --last-failed
```

## Kendin dene

- Bir assertion'ı bilerek yanlış yazın. Call log'u okuyun, sonra `error-context.md` dosyasını açın.
- `npx playwright test --trace on` ile çalıştırın, raporu açıp bir testin trace'ine girin. Network sekmesinde `/api/orders` isteğinin yanıtını bulun.
- Bir teste `await page.pause()` ekleyip `--headed` ile çalıştırın. Inspector'da locator'ı değiştirip hangi elementlere uyduğuna bakın.
- Test paketinizi `--shuffle --repeat-each=5` ile çalıştırın. Düşen test var mı?

## Detaylı öğrenmek için

- **Resmi doküman:** Playwright, "Trace viewer"; trace kaydetme, açma ve tüm sekmeler.[^5]
- **Resmi doküman:** Playwright, "Debugging Tests"; Inspector, VS Code ve ayrıntılı API logları.[^2]
- **Resmi doküman:** Playwright, "UI Mode"; izleme modu ve zaman çizelgesi.[^1]

## Kaynaklar

1. [Playwright: UI Mode](https://playwright.dev/docs/test-ui-mode) *(doc)* — İzleme modu, zaman çizelgesi, locator seçme ve ağ sekmesi.
2. [Playwright: Debugging Tests](https://playwright.dev/docs/debug) *(doc)* — `--debug`, Inspector, `page.pause()`, actionability logları ve VS Code.
3. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — CI hataları için trace önerisi ve `on` modunun maliyeti.
4. [Playwright: Configuration (use)](https://playwright.dev/docs/test-use-options) *(doc)* — Trace ve video modlarının tablosu.
5. [Playwright: Trace viewer](https://playwright.dev/docs/trace-viewer) *(doc)* — `show-trace`, trace.playwright.dev ve görüntüleyicinin sekmeleri.
6. [Playwright: Release notes 1.63](https://playwright.dev/docs/release-notes#version-163) *(doc)* — Trace'te aria ve ekran snapshot'ları, Display Aria modu.
7. [Playwright: Test.step](https://playwright.dev/docs/api/class-test#test-step) *(doc)* — Adımları raporda ve trace'te gruplamak.
8. [Playwright: Command line](https://playwright.dev/docs/test-cli) *(doc)* — `--repeat-each`, `--last-failed` ve diğer seçenekler.
9. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `--shuffle` ve tohum değeriyle sırayı tekrar üretmek.
