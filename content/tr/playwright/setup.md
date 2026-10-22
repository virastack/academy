---
title: "Kurulum"
description: "Uçtan uca testin yeri, Playwright'ı bir Next.js projesine eklemek, playwright.config.ts alanları, webServer ile production build'i test etmek ve testleri çalıştırmak."
lastVerified: "2026-10-22"
translationKey: "playwright/setup"
---

## Uçtan Uca Test Nedir?

[Vitest](/academy/vitest) dersleri bir component'i ya da hook'u tek başına, JSDOM içinde test eder. Uçtan uca *(end-to-end, E2E)* test ise uygulamanın tamamını gerçek bir tarayıcıda çalıştırır: sayfa açılır, kullanıcı gibi tıklanır, yazılır ve ekranda görünen sonuç doğrulanır. Sunucu, veritabanı, yönlendirme ve cookie'ler de işin içindedir.

| | Component testi *(Vitest)* | Uçtan uca test *(Playwright)* |
| :-- | :-- | :-- |
| Ortam | JSDOM, tek component | Gerçek tarayıcı, tüm uygulama |
| Hız | Milisaniyeler | Saniyeler |
| Yakaladığı hata | Component mantığı | Parçaların birlikte çalışması, yönlendirme, oturum |
| Sayısı | Çok | Az, kritik akışlar için |

[Martin Fowler](https://martinfowler.com/) test piramidinde uçtan uca testleri en üste koyar: en değerli güveni verirler ama en yavaş ve en kırılgan olanlardır. Bu yüzden sayıları az tutulur; her ayrıntı alttaki hızlı testlerle sınanır.[^1]

[!playwright], Microsoft'un geliştirdiği açık kaynak test aracıdır. Chromium, Firefox ve WebKit'i tek bir API ile yönetir; testleri paralel ve varsayılan olarak görünmez *(headless)* tarayıcıda çalıştırır.[^2]

## Kurulum

Playwright'ın desteklediği Node.js sürümleri 22, 24 ve 26'dır.[^2] Mevcut bir [!nextjs] projesinin kök klasöründe şu komutu çalıştırın:

```command
npm init playwright@latest
```

Komut birkaç soru sorar: TypeScript mi JavaScript mi, testlerin klasörü *(varsayılan `tests`)*, GitHub Actions iş akışı eklensin mi, tarayıcılar indirilsin mi. Komutu daha sonra tekrar çalıştırmak mevcut testleri silmez.[^2]

Oluşan dosyalar:

```bash
playwright.config.ts         # Yapılandırma
tests/
  example.spec.ts            # Örnek test
.github/workflows/playwright.yml   # İstediyseniz CI iş akışı
```

`package.json`'a `@playwright/test` eklenir. `.gitignore`'a test çıktıları yazılır: `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/` ve `playwright/.auth/`.

> [!NOTE]
>
> [!nextjs] dokümanı hazır bir başlangıç da sunar: `npx create-next-app@latest --example with-playwright`. Bu rehberde mevcut projeye eklemeyi öğreniyoruz.[^3]

Tarayıcıları sonradan indirmek ya da yalnızca birini kurmak için:

```command
npx playwright install chromium
```

## playwright.config.ts

Oluşan dosyanın sadeleştirilmiş hali ve her alanın görevi:[^4]

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

| Alan | Görevi |
| :-- | :-- |
| `testDir` | Test dosyalarının aranacağı klasör |
| `fullyParallel` | Aynı dosyadaki testleri de paralel çalıştırır |
| `forbidOnly` | CI'da unutulmuş `test.only` varsa çalıştırmayı durdurur |
| `retries` | Başarısız testi kaç kez tekrar deneyeceği; yerelde 0, CI'da 2 |
| `workers` | Aynı anda kaç işçi süreci çalışacağı |
| `reporter` | Sonucun biçimi; `html` tıklanabilir bir rapor üretir |
| `use.baseURL` | `page.goto("/login")` yazabilmek için kök adres |
| `use.trace` | Hangi çalıştırmada trace kaydedileceği *(bkz. [Trace ile hata ayıklama](/academy/playwright/debugging-with-trace))* |
| `projects` | Aynı testleri farklı tarayıcı ya da ayarlarla çalıştırmak |

Varsayılan olarak her test 30 saniye, her web-first assertion 5 saniye bekler.[^5]

## Projeler ve `default: false`

Her proje aynı testleri farklı bir ayarla çalıştırır. Playwright 1.64 ile bir projeyi yapılandırmada tutup varsayılan çalıştırmadan çıkarabilirsiniz. Yerelde yalnızca Chromium çalışır; CI'da hepsi:[^6]

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] }, default: false },
  { name: "webkit", use: { ...devices["Desktop Safari"] }, default: false },
],
```

```command
npx playwright test --project="*"
```

## webServer: Uygulamayı Playwright Başlatsın

Testler çalışan bir uygulamaya ihtiyaç duyar. `webServer` alanı, testlerden önce sunucuyu başlatır ve adres yanıt verene kadar bekler.[^7] [!nextjs] dokümanı testleri production build'e karşı çalıştırmayı önerir; uygulama gerçekte nasıl çalışacaksa öyle test edilir.[^3]

```ts
webServer: {
  command: "npm run build && npm run start",
  url: "http://localhost:3000",
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
},
```

`reuseExistingServer` yerelde zaten çalışan bir sunucu varsa onu kullanır; CI'da her zaman yenisini başlatır. Build birkaç dakika sürebileceği için `timeout`'u varsayılan 60 saniyeden yüksek tutun.[^7]

> [!TIP]
>
> Test yazarken her seferinde build beklemek yavaştır. Bir terminalde `npm run dev` açık tutun; `reuseExistingServer` sayesinde Playwright onu kullanır. Göndermeden önce dev sunucusunu kapatıp production build ile bir kez çalıştırın.

## Testleri Çalıştırmak

```command
npx playwright test
```

Sık kullanılan seçenekler:[^2][^8]

| Komut | Ne yapar |
| :-- | :-- |
| `npx playwright test tests/login.spec.ts` | Tek dosya |
| `npx playwright test -g "giriş"` | Başlığında "giriş" geçen testler |
| `npx playwright test --project=chromium` | Tek proje |
| `npx playwright test --headed` | Tarayıcıyı görünür açar |
| `npx playwright test --ui` | UI Mode: izleme, adım adım zaman yolculuğu |
| `npx playwright show-report` | Son HTML raporunu açar |

HTML rapor yalnızca test başarısız olunca kendiliğinden açılır.[^2]

[!vscode] kullanıyorsanız Playwright eklentisi testleri editörden çalıştırmayı, kesme noktası koymayı ve locator seçmeyi sağlar.[^9]

## Kendin Dene

- Bir [!nextjs] projesine Playwright'ı ekleyin. `tests/example.spec.ts`'i çalıştırın, sonra `npx playwright show-report` ile raporu açın.
- Firefox ve WebKit projelerine `default: false` ekleyin. `npx playwright test` ve `npx playwright test --project="*"` çıktılarındaki test sayısını karşılaştırın.
- `webServer`'ı ekleyin, `baseURL`'i ayarlayın. Örnek testteki adresi `page.goto("/")` yapın.
- `npx playwright test --ui` ile UI Mode'u açın ve bir testi adım adım izleyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Playwright, "Installation"; kurulum, oluşan dosyalar ve ilk çalıştırma.[^2]
- **Resmi doküman:** Next.js, "How to set up Playwright with Next.js"; production build'e karşı test önerisi.[^3]
- **Yazı:** [Martin Fowler](https://martinfowler.com/), "Test Pyramid"; uçtan uca testlerin neden az tutulduğu.[^1]

## Kaynaklar

1. [Martin Fowler](https://martinfowler.com/): [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html) *(article)* — 1 Mayıs 2012. Uçtan uca testlerin maliyeti ve piramidin katmanları.
2. [Playwright: Installation](https://playwright.dev/docs/intro) *(doc)* — `npm init playwright`, oluşan dosyalar, Node.js sürümleri, rapor ve UI Mode.
3. [Next.js: How to set up Playwright with Next.js](https://nextjs.org/docs/app/guides/testing/playwright) *(doc)* — `with-playwright` örneği ve production build'e karşı test önerisi.
4. [Playwright: Configuration](https://playwright.dev/docs/test-configuration) *(doc)* — `defineConfig` alanları ve `use` seçenekleri.
5. [Playwright: Timeouts](https://playwright.dev/docs/test-timeouts) *(doc)* — Test için 30 saniye, assertion için 5 saniye varsayılanı.
6. [Playwright: Release notes 1.64](https://playwright.dev/docs/release-notes#version-164) *(doc)* — `TestProject.default`, `--project="*"` ve `--shuffle`.
7. [Playwright: Web server](https://playwright.dev/docs/test-webserver) *(doc)* — `webServer`, `reuseExistingServer` ve `timeout`.
8. [Playwright: Running and debugging tests](https://playwright.dev/docs/running-tests) *(doc)* — Dosya, başlık ve proje filtreleri.
9. [Playwright: VS Code](https://playwright.dev/docs/getting-started-vscode) *(doc)* — Eklentiyle test çalıştırma ve hata ayıklama.
