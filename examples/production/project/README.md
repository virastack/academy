# Sipariş Paneli: Yayına Hazır

[Production'a Hazırlık rehberindeki](https://virastack.com/academy/production/project) proje dersinin çalışan hali. Ders, [Playwright rehberindeki](https://virastack.com/academy/playwright/project) sipariş panelini adım adım yayına hazırlatır; takıldığınızda karşılaştırın.

Uygulamanın kendisi aynıdır: giriş sayfası, oturum cookie'si, TanStack Query ile yüklenen sipariş tablosu ve yöneticinin sipariş iptali. Bu sürüme eklenenler:

| Dosya | Ne öğretir |
| :-- | :-- |
| `lib/env.ts`, `.env.example` | Ortam değişkenlerini Zod ile doğrulamak |
| `instrumentation.ts`, `instrumentation-node.ts` | Açılışta doğrulama, `onRequestError` ile sunucu hatalarını loglamak |
| `lib/logger.ts` | pino ile yapılandırılmış JSON log ve hassas alanları gizlemek |
| `app/error.tsx`, `app/global-error.tsx` | Kullanıcıya hata kodu *(digest)* gösteren hata sınırları |
| `app/debug/page.tsx` | Hata izleme hattını denemek için bilerek hata fırlatan sayfa *(production'da 404)* |
| `app/api/health/route.ts` | Sağlık kontrolü, sürüm bilgisi |
| `lib/flags.ts`, `lib/rollout.ts` | Flags SDK ile yüzdeli açılan bir özellik *(sipariş özeti)* |
| `next.config.ts` | `output: "standalone"`, güvenlik başlıkları |
| `Dockerfile`, `.dockerignore` | Çok aşamalı, root olmayan kullanıcıyla çalışan imaj |
| `.github/workflows/ci.yml` | Lint, tip kontrolü, uçtan uca testler ve Docker smoke testi |
| `tests/production.spec.ts`, `tests/rollout.spec.ts` | Yayına hazırlık testleri |

Demo hesaplar, parola `password123`:

| E-posta | Rol |
| :-- | :-- |
| yonetici@example.com | Yönetici, hazırlanan siparişi iptal edebilir |
| izleyici@example.com | İzleyici, yalnızca görüntüler |

## Çalıştırma

```bash
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3000 adresini açın. Sipariş özetini görmek için `.env.local` içinde `ORDER_SUMMARY_ROLLOUT=100` yapın ve sunucuyu yeniden başlatın.

## Production build

```bash
npm run build
npm start
```

`npm run build` sonrası `postbuild` betiği statik dosyaları `.next/standalone` içine kopyalar. `npm start` doğrudan `node .next/standalone/server.js` çalıştırır; `next start` kullanılmaz.

## Testler

```bash
npx playwright install chromium
npm test
```

Testler production build'e karşı çalışır. `playwright.config.ts` sunucuyu `ORDER_SUMMARY_ROLLOUT=100` ile başlatır.

## Docker

```bash
docker build -t order-panel .
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
curl http://localhost:3000/api/health
```

Aynı imaj farklı ortam değişkenleriyle her ortamda çalışır. Geçersiz bir değer verirseniz konteyner açılırken hangi değişkenin hatalı olduğunu yazıp kapanır:

```bash
docker run --rm -e ORDER_SUMMARY_ROLLOUT=150 order-panel
```

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
| :-- | :-- | :-- |
| `APP_ENV` | `local` | `local`, `preview` ya da `production`. `production`'da `/debug` 404 döner |
| `APP_VERSION` | `dev` | Sağlık uç noktasında ve her log satırında görünen sürüm |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` ya da `error` |
| `ORDER_SUMMARY_ROLLOUT` | `0` | Sipariş özetini görecek kullanıcı yüzdesi |
