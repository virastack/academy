# Sipariş Paneli

[Playwright rehberindeki](https://virastack.com/academy/playwright/project) proje dersinin çalışan hali. Ders bu uygulamanın testlerini adım adım yazdırır; takıldığınızda karşılaştırın.

Küçük bir Next.js uygulaması: giriş sayfası, oturum cookie'si, TanStack Query ile yüklenen ve filtrelenen bir sipariş tablosu, yöneticinin sipariş iptali. Testler Playwright ile yazılmıştır.

Gerçek bir veritabanı yok. Siparişler sunucunun belleğinde tutulur ve her oturum kendi kopyasıyla başlar. Sunucuyu yeniden başlatınca her şey sıfırlanır.

Demo hesaplar, parola `parola123`:

| E-posta | Rol |
| :-- | :-- |
| yonetici@example.com | Yönetici, hazırlanan siparişi iptal edebilir |
| izleyici@example.com | İzleyici, yalnızca görüntüler |

## Çalıştırma

```bash
npm install
npm run dev
```

http://localhost:3000 adresini açın.

## Testler

```bash
npx playwright install chromium
npm test
```

`npm test` önce production build alır, sunucuyu başlatır ve testleri çalıştırır. Rapor için `npx playwright show-report`.

| Dosya | Ne öğretir |
| :-- | :-- |
| `tests/auth.setup.ts` | Setup projesiyle bir kez giriş yapıp oturumu `playwright/.auth/` altına kaydetmek |
| `tests/pages/` | Page Object Model |
| `tests/fixtures.ts` | Page object'leri fixture olarak vermek |
| `tests/login.spec.ts` | Oturumsuz testler, yönlendirme, form hatası |
| `tests/orders.spec.ts` | Listeleme, filtreleme, `Locator.within()`, aria snapshot |
| `tests/cancel-order.spec.ts` | Veriyi değiştiren testi kendi oturumunda çalıştırmak |
| `tests/viewer.spec.ts` | İkinci rol, API isteğiyle yetki kontrolü |
| `tests/mocking.spec.ts` | `page.route` ile hata, boş liste, yanıt değiştirme ve yükleniyor durumu |
| `tests/accessibility.spec.ts` | axe ile erişilebilirlik taraması |
| `tests/orders.visual.ts` | Ekran görüntüsü karşılaştırması *(varsayılan olarak çalışmaz)* |

Görsel test `default: false` olan ayrı bir projededir. İlk çalıştırmada referans görüntüyü oluşturun, sonra karşılaştırın:

```bash
npx playwright test --project=visual --update-snapshots=missing
npx playwright test --project=visual
```

Referans görüntüler işletim sistemine göre ayrı dosyalara yazılır. Bu yüzden klasörde hazır görüntü yok.

`.github/workflows/playwright.yml` hazır bir GitHub Actions iş akışıdır. Projeyi kendi deponuza kopyaladığınızda her push'ta testleri çalıştırır.
