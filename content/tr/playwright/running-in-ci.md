---
title: "CI'da çalıştırma"
description: "GitHub Actions iş akışı, CI için yapılandırma ayarları, raporu ve trace'i artifact olarak saklamak, tarayıcı önbelleği, sharding ile birleştirilmiş rapor ve kırılgan testlerle başa çıkmak."
lastVerified: "2026-10-22"
translationKey: "playwright/running-in-ci"
---

## Neden CI?

Uçtan uca testler yerelde ara sıra çalıştırılırsa unutulur. Her push'ta ve her pull request'te otomatik çalışan testler, bozulan akışı birleştirmeden önce yakalar. Bu derste [!github] Actions kullanıyoruz; diğer CI servislerinde adımlar aynıdır.[^1]

## İş Akışı

`npm init playwright` sırasında GitHub Actions'ı seçtiyseniz dosya hazırdır. Bu rehberin projesindeki hali:[^1][^2]

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run Playwright tests
        run: npm test
      - uses: actions/upload-artifact@v5
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Adım adım:

- `npm ci` kilit dosyasından birebir kurulum yapar.
- `npx playwright install --with-deps chromium` tarayıcıyı ve Linux sistem bağımlılıklarını kurar. Yalnızca kullandığınız tarayıcıyı kurmak süreyi kısaltır.[^2]
- `npm test` `playwright test`'i çalıştırır. `webServer` uygulamayı build alıp başlatır *(bkz. [Kurulum](/academy/playwright/setup))*.
- `if: ${{ !cancelled() }}` testler düşse de raporun yüklenmesini sağlar. Asıl ihtiyaç duyduğunuz an testlerin düştüğü andır.[^1]
- `timeout-minutes` takılan bir işin dakikalarca çalışmasını önler.

## CI İçin Yapılandırma

Oluşturulan yapılandırma `process.env.CI` ile CI'da farklı davranır. GitHub Actions bu değişkeni kendisi tanımlar.[^3]

```ts
// playwright.config.ts
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

| Ayar | CI'da neden |
| :-- | :-- |
| `forbidOnly` | Unutulmuş `test.only` diğer testleri sessizce atlatmasın |
| `retries: 2` | Düşen test tekrar denenir; trace bu denemede kaydedilir |
| `workers: 1` | Playwright dokümanı kararlılık ve tekrarlanabilirlik için CI'da tek işçi önerir |
| `github` raporcusu | Hataları pull request'te ilgili satırın yanına not olarak yazar |
| `reuseExistingServer: false` | CI'da her zaman temiz bir sunucu başlar |

Tek işçi yavaş gelirse güçlü bir CI makinesinde işçi sayısını artırabilir ya da testleri birden fazla makineye bölebilirsiniz.[^3]

## Raporu ve Trace'i İncelemek

Test düştüğünde Actions çalıştırmasının özet sayfasındaki **Artifacts** bölümünden `playwright-report`'u indirin, açın ve çalıştırın:[^1]

```command
npx playwright show-report playwright-report
```

`retries: 2` ve `trace: "on-first-retry"` sayesinde düşen testin tekrar denemesinin trace'i rapordadır. Testi kendi makinenizde yeniden üretmeye çalışmadan, CI'da tam olarak ne olduğunu görürsünüz *(bkz. [Trace ile hata ayıklama](/academy/playwright/debugging-with-trace))*.

> [!TIP]
>
> Rapor indirmeden de bakabilirsiniz. Tek bir `trace.zip`'i [trace.playwright.dev](https://trace.playwright.dev) adresine sürükleyin; dosya tarayıcınızda açılır, hiçbir yere gönderilmez.

## Tarayıcıyı Önbelleğe Almak?

Akla gelen ilk optimizasyon tarayıcıları önbelleğe almaktır. Playwright dokümanı bunu önermez: önbelleği geri yüklemek indirmek kadar sürer ve Linux'ta sistem bağımlılıkları zaten önbelleğe alınamaz.[^3] `actions/setup-node`'un `cache: npm` ayarı ise npm paketlerini önbelleğe alır ve işe yarar.

## Sharding: Testleri Makinelere Bölmek

Test paketi büyüyünce tek makine yetmez. `--shard` testleri parçalara böler; her parça ayrı bir işte çalışır:[^4]

```yaml
jobs:
  playwright-tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]
    steps:
      # checkout, setup-node, npm ci, playwright install
      - run: npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v5
        if: ${{ !cancelled() }}
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1
```

Her parça ayrı bir rapor üretir. Bunları tek bir HTML rapora birleştirmek için CI'da `blob` raporcusunu kullanın ve ayrı bir işte birleştirin:[^4]

```ts
reporter: process.env.CI ? "blob" : "html",
```

```command
npx playwright merge-reports --reporter html ./all-blob-reports
```

Dokümandaki tam örnekte `merge-reports` işi `needs: [playwright-tests]` ile parçaları bekler, blob raporlarını `actions/download-artifact` ile tek klasöre indirir ve birleşik raporu yükler.[^4] `fail-fast: false` bir parça düşse de diğerlerinin bitmesini sağlar.

## Birden Fazla Tarayıcı

Yerelde yalnızca Chromium, CI'da tüm tarayıcılar çalışsın istiyorsanız diğer projelere `default: false` verin ve CI'da hepsini seçin:[^5]

```yaml
- run: npx playwright install --with-deps
- run: npx playwright test --project="*"
```

## Kırılgan Testler

Bir test bazen geçip bazen düşüyorsa kırılgandır. Google'ın test ekibi 2016'da paylaştığı verilerde test çalıştırmalarının yaklaşık yüzde 1,5'inin kırılgan sonuç verdiğini, testlerin yaklaşık yüzde 16'sında bir miktar kırılganlık olduğunu yazar. Gözlenen "geçiyordu, düştü" geçişlerinin yaklaşık yüzde 84'ü kırılgan bir testten kaynaklanır.[^6] Yani kırmızı bir CI'ın çoğu zaman gerçek bir hata olmaması, ekibin kırmızıya güvenmemeyi öğrenmesi demektir.

`retries` kırılganlığı gizlemez, raporlar. Bir test ilk denemede düşüp tekrar denemede geçerse rapor onu **flaky** olarak işaretler.[^7] Bu işareti görmezden gelmeyin:

- Trace'i açıp nedenini bulun. Çoğu zaman bir zamanlama varsayımı, paylaşılan veri ya da bir önceki testin bıraktığı durumdur *(bkz. [Assertion ve bekleme](/academy/playwright/assertions-and-waiting), [Auth ve fixture](/academy/playwright/auth-and-fixtures))*.
- `--repeat-each` ve `--shuffle` ile yerelde yeniden üretin.
- Kırılganlığa hiç tahammül etmek istemiyorsanız `--fail-on-flaky-tests` ile flaky testleri de başarısız sayın.[^8]

[Martin Fowler](https://martinfowler.com/) kırılgan testleri bir **karantinaya** almayı önerir: ana hattan çıkarın ki sağlam testlere duyulan güven bozulmasın, ama karantinayı küçük tutun ve testleri hızla düzeltin; karantinadaki test hiçbir hatayı yakalamaz.[^9] Playwright'ta bunu bir etiket ve `--grep-invert` ile yapabilirsiniz:

```ts
test("ara sıra düşen test", { tag: "@quarantine" }, async ({ page }) => {
  // ...
});
```

```command
npx playwright test --grep-invert @quarantine
```

> [!CAUTION]
>
> Karantina bir park yeri değil, bekleme salonudur. Her karantinadaki test için bir iş kaydı açın ve süre koyun.

## Kendin Dene

- Projenize iş akışını ekleyip bir pull request açın. Bir testi bilerek bozun ve `github` raporcusunun satıra yazdığı notu bulun.
- Düşen çalıştırmanın raporunu indirip trace'ini açın.
- Testleri `--shard=1/2` ve `--shard=2/2` ile yerelde iki parçada çalıştırın. Toplam test sayısı tutuyor mu?
- Bir testi `@quarantine` ile etiketleyip `--grep-invert` ile hariç tutun.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Playwright, "Setting up CI"; GitHub Actions iş akışı ve raporu incelemek.[^1]
- **Resmi doküman:** Playwright, "Sharding"; parçalara bölmek ve raporları birleştirmek.[^4]
- **Yazı:** Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them"; kırılgan testlerin ölçeği ve Google'ın önlemleri.[^6]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Eradicating Non-Determinism in Tests"; karantina ve kırılganlığın nedenleri.[^9]

## Kaynaklar

1. [Playwright: Setting up CI](https://playwright.dev/docs/ci-intro) *(doc)* — GitHub Actions iş akışı, raporu artifact olarak yüklemek ve incelemek.
2. [Playwright: Browsers](https://playwright.dev/docs/browsers) *(doc)* — Tek tarayıcı kurmak ve `--with-deps` ile sistem bağımlılıkları.
3. [Playwright: Continuous Integration](https://playwright.dev/docs/ci) *(doc)* — CI'da işçi sayısı, `CI` değişkeni ve tarayıcıları önbelleğe almamak.
4. [Playwright: Sharding](https://playwright.dev/docs/test-sharding) *(doc)* — `--shard`, blob raporcusu, `merge-reports` ve GitHub Actions örneği.
5. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `TestProject.default` ve `--project="*"`.
6. [Google](https://testing.googleblog.com/): [Testing Blog: Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) *(article)* — 27 Mayıs 2016, John Micco. Kırılgan testlerin oranı ve azaltma yöntemleri.
7. [Playwright: Retries](https://playwright.dev/docs/test-retries) *(doc)* — Tekrar deneme ve flaky işareti.
8. [Playwright: Command line](https://playwright.dev/docs/test-cli) *(doc)* — `--fail-on-flaky-tests`, `--grep-invert` ve `--shard`.
9. [Martin Fowler](https://martinfowler.com/): [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) *(article)* — 14 Nisan 2011. Kırılgan testleri karantinaya almak ve nedenleri.
