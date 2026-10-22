---
title: "Hata izleme"
description: "Canlıdaki hataları kullanıcı bildirmeden yakalamak; Next.js'in error.tsx, global-error ve onRequestError kancaları, digest ile log eşleştirmek, Sentry kurulumu, source map'ler, örnekleme, kişisel veri ve işe yarar uyarılar."
lastVerified: "2026-10-22"
translationKey: "production/error-monitoring"
---

## Kullanıcılar Hata Bildirmez

Canlıda bir sayfa çöktüğünde kullanıcıların çoğu size yazmaz; sekmeyi kapatır. Yazanlar da "çalışmıyor" der. Hangi sayfa, hangi tarayıcı, hangi sürüm, hangi satır? Bunları bilmeden hata ayıklanmaz.

Hata izleme bu boşluğu kapatır: her hata yığın izi *(stack trace)*, sürüm, ortam ve isteğin bilgisiyle birlikte bir yere kaydedilir, benzer hatalar gruplanır ve gerektiğinde ekip uyarılır.

Bu dersin iki katmanı var: önce [!nextjs]'in kendi kancaları, sonra bunları bir hata izleme servisine bağlamak.

## İki Tarafta Hata

| Nerede | Örnek | Kim yakalar |
| :-- | :-- | :-- |
| Sunucu | Server Component'te veritabanı hatası, Route Handler, Server Action, proxy | `instrumentation.ts`'teki `onRequestError` |
| Tarayıcı | Client Component'te render hatası, olay işleyicide hata | `error.tsx`, `global-error.tsx`, istemci tarafı SDK |

Sunucudaki hata tarayıcıya **ayrıntısız** gider. Next.js dokümanına göre Server Component'ten gelen hatalarda kullanıcı yalnızca genel bir mesaj ve bir kimlik görür; asıl mesaj hassas bilgi sızdırmasın diye gizlenir.[^1] Bu kimliğe **digest** denir ve sunucu loglarındaki hatayla eşleştirmek için vardır.

## error.tsx ve Digest

`error.tsx` bir route segmentini React hata sınırıyla sarar *(bkz. [Hata yönetimi](/academy/nextjs/error-handling))*. Production'da kullanıcıya bir hata kodu göstermek, destek ekibinin loglarda hatayı bulmasını sağlar:

```tsx
// app/error.tsx
"use client";

function getDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return typeof error.digest === "string" ? error.digest : undefined;
  }
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = getDigest(error);

  return (
    <main>
      <div role="alert">
        <h1>Bir şeyler ters gitti</h1>
        <p>Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilirsiniz.</p>
        {digest && (
          <p>
            Destek ekibine iletmek için hata kodu: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()}>
          Tekrar dene
        </button>
      </div>
    </main>
  );
}
```

Next.js 16'da `error` prop'unun tipi `unknown`'dır; okumadan önce daraltmanız gerekir.[^1]

> [!WARNING]
>
> `error instanceof Error` ile daraltmayın. Bu rehberin projesinde Suspense içinde fırlatılan bir sunucu hatası tarayıcıya `message`, `stack` ve `digest` alanları olan ama `instanceof Error` kontrolünden **geçmeyen** bir nesne olarak ulaştı. Yukarıdaki gibi alanın varlığını ve tipini kontrol edin.

`global-error.tsx` kök layout'taki hataları yakalar. Kök layout'un yerine geçtiği için kendi `<html>` ve `<body>` etiketlerini çizmek zorundadır ve global stilleriniz burada yüklü değildir.[^1]

## onRequestError: Sunucudaki Her Hata

`instrumentation.ts` dosyasındaki `onRequestError`, Next.js sunucuda bir hata yakaladığında çağrılır: Server Component render'ı, Route Handler, Server Action ve proxy.[^2]

```ts
// instrumentation.ts
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("./lib/logger");
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;

  logger.error(
    {
      event: "request_error",
      err: error,
      digest,
      method: request.method,
      path: request.path,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    "İstek işlenirken hata oluştu",
  );
};
```

Fonksiyon üç argüman alır:[^2]

| Argüman | İçerik |
| :-- | :-- |
| `error` | Fırlatılan değer; sunucu render hatalarında `digest` taşır |
| `request` | `path`, `method`, `headers` |
| `context` | `routerKind`, `routePath` *(`/orders/[id]` gibi kalıp)*, `routeType` *(`render`, `route`, `action`, `proxy`)*, `renderSource`, `revalidateReason` |

Bu rehberin projesinde `/debug` sayfası bilerek hata fırlatır. Tarayıcıda görünen hata kodu ile sunucu logundaki `digest` aynıdır:

```json
{"level":50,"env":"local","version":"abc123","event":"request_error","digest":"403643587","method":"GET","path":"/debug","routePath":"/debug","routeType":"render","msg":"İstek işlenirken hata oluştu"}
```

> [!CAUTION]
>
> `request.headers` cookie ve yetkilendirme başlıkları taşır. Hata kaydına başlıkların tamamını eklemeyin *(bkz. [Loglama](/academy/production/logging))*.

## Bir Servise Göndermek: Sentry

Log, hatayı kaydeder ama gruplamaz, yeni bir hata türü çıkınca haber vermez, tarayıcı hatalarını görmez. Sentry gibi bir hata izleme servisi bunları yapar. Next.js entegrasyonu için Sentry'nin sihirbazı gerekli dosyaları oluşturur:[^3]

```command
npx @sentry/wizard@latest -i nextjs
```

Elle kurulumda dosyalar:[^3]

| Dosya | Görevi |
| :-- | :-- |
| `instrumentation-client.ts` | Tarayıcı tarafı SDK'yı başlatır |
| `sentry.server.config.ts` | Node.js tarafı SDK |
| `sentry.edge.config.ts` | Edge çalışma ortamı SDK'sı |
| `instrumentation.ts` | Sunucu yapılandırmasını yükler, `onRequestError`'ı Sentry'ye bağlar |
| `next.config.ts` | `withSentryConfig` ile build sırasında source map yükler |

```ts
// instrumentation.ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

```ts
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

`instrumentation-client.ts`, Next.js'in tarayıcıda uygulama etkileşimli hale gelmeden önce çalıştırdığı dosyadır; `onRouterTransitionStart` sayfa geçişlerini izlemeye yarar.[^4] DSN bir secret değildir; Sentry de onu `NEXT_PUBLIC_` ile vermenizi önerir.[^3]

Kendi logunuzu da tutmak istiyorsanız iki işi tek fonksiyonda birleştirin:

```ts
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  Sentry.captureRequestError(...args);
  // ...kendi log satırınız
};
```

İstemcideki render hatalarını yakalamak için `global-error.tsx` ve `error.tsx`'te hatayı Sentry'ye bildirin:[^3]

```tsx
useEffect(() => {
  Sentry.captureException(error);
}, [error]);
```

## Okunabilir Yığın İzi: Source Map'ler

Production'daki JavaScript küçültülmüştür *(minified)*. Source map olmadan yığın izi `at g (chunk.js:1:209)` gibi görünür. `withSentryConfig` build sırasında source map'leri Sentry'ye yükler; bunun için bir yetki token'ı gerekir:[^3]

```ts
// next.config.ts
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // ...
};

export default withSentryConfig(nextConfig, {
  org: "sirketim",
  project: "siparis-paneli",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
```

`SENTRY_AUTH_TOKEN` gerçek bir secret'tır: yerelde `.env.local`'da, CI'da GitHub secret olarak durur *(bkz. [CI/CD](/academy/production/cicd))*. Sentry'nin uyarısı açıktır: bu token'ı sürüm kontrolüne eklemeyin.[^3]

Eklenti build sırasında Sentry'de bir **release** *(sürüm)* de oluşturur ve sürümü ortamdan kendisi bulmaya çalışır; isterseniz `SENTRY_RELEASE` ile belirtirsiniz.[^5] Sürüm bilgisi, "bu hata hangi deploy'la başladı?" sorusunu cevaplar.

## Ne Kadar Veri?

**Örnekleme.** Hatalar varsayılan olarak tamamen gönderilir. Performans izleri *(trace)* ise çok olduğu için örneklenir: Sentry'nin örneği geliştirmede yüzde 100, production'da yüzde 10 kullanır ve trafiğe göre ayarlamanızı söyler.[^3]

**Kişisel veri.** Sentry'nin güncel SDK'sı varsayılan olarak kullanıcı kimlik bilgilerini *(IP adresi, kimlik)*, HTTP gövdelerini ve sorgu parametrelerini gönderir. `password`, `auth` gibi bilinen anahtarlar `[Filtered]` ile değiştirilir. Daha az veri göndermek için `dataCollection` seçeneğiyle kategorileri kapatırsınız.[^6] Uygulamanız KVKK ya da GDPR kapsamındaysa varsayılanı bilinçli olarak gözden geçirin.

**Reklam engelleyiciler.** Bazı engelleyiciler Sentry'ye giden istekleri keser. `tunnelRoute: "/sentry-tunnel"` olayları kendi sunucunuz üzerinden yönlendirir; karşılığında sunucu yükü artar.[^3]

## İşe Yarar Uyarılar

Her hata için bildirim gönderen bir sistem birkaç gün içinde susturulur. Google'ın SRE kitabı izleme üzerine şu ilkeyi koyar: sizi uyaran her bildirim **eyleme dönüştürülebilir** olmalı ve bir insanın zekâsını gerektirmelidir; otomatik bir tepkiyle çözülebilen şey bildirim olmamalıdır.[^7]

Pratikte:

- **Yeni hata türü** için bildirim gönderin: bir deploy yeni bir sorun getirmiş olabilir.
- **Bilinen hatanın sayısı** ani yükselirse bildirim gönderin, her tekrarında değil.
- **Kullanıcıyı etkileyen belirtilere** öncelik verin. SRE kitabı belirtiyi *(ne bozuk?)* nedenden *(neden bozuk?)* ayırır: "ödeme sayfası yüzde 5 hata veriyor" bir belirtidir ve uyarıya değer; "bir sunucunun belleği yüksek" ise belki değildir.[^7]
- Beklenen hataları *(geçersiz form, bulunamayan kayıt)* hata olarak raporlamayın; onlar uygulamanın normal akışıdır *(bkz. [Hata yönetimi](/academy/nextjs/error-handling))*.

## Hattı Denemek

Kurulumdan sonra bir hata fırlatıp gerçekten servise ulaştığını görmeden işi bitmiş saymayın. Bu rehberin projesindeki `/debug` sayfası bunun içindir:

```tsx
// app/debug/page.tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

export default function DebugPage() {
  return (
    <Suspense fallback={<p>Yükleniyor...</p>}>
      <FailingSection />
    </Suspense>
  );
}

async function FailingSection(): Promise<never> {
  await connection();
  if (getEnv().APP_ENV === "production") notFound();
  throw new Error("Test hatası: hata izleme hattını denemek için bilerek fırlatıldı.");
}
```

`connection()` hatanın build sırasında değil istek anında fırlamasını sağlar; aksi halde build düşer. Sayfa production'da 404 döner. Sentry'nin sihirbazı da benzer bir örnek sayfa oluşturur.[^3]

## Kendin Dene

- Projenize `onRequestError` ekleyin. Bir Server Component'te hata fırlatın, tarayıcıdaki hata kodunu sunucu logunda bulun.
- `error.tsx`'te hata kodunu gösterin. Geliştirme ve production build'inde mesajın nasıl değiştiğini karşılaştırın.
- Ücretsiz bir Sentry hesabıyla sihirbazı çalıştırın. Bir istemci ve bir sunucu hatası üretip ikisinin de geldiğini görün.
- Source map yüklemeden ve yükledikten sonra aynı hatanın yığın izini karşılaştırın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Next.js, "error.js"; `error`, `digest`, `retry` ve `global-error`.[^1]
- **Resmi doküman:** Sentry, "Manual Setup for Next.js"; dosyalar, source map, tünel ve doğrulama.[^3]
- **Kitap bölümü:** Google, "Monitoring Distributed Systems"; belirtiler ve nedenler, işe yarar uyarılar.[^7]

## Kaynaklar

1. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — `error` prop'unun tipi, production'da gizlenen mesaj, `digest`, `retry` ve `global-error`.
2. [Next.js: instrumentation.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) *(doc)* — `register` ve `onRequestError` imzası, `request` ve `context` alanları.
3. [Sentry: Manual Setup for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) *(doc)* — Sihirbaz, yapılandırma dosyaları, `captureRequestError`, source map, örnekleme ve tünel.
4. [Next.js: instrumentation-client.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client) *(doc)* — Tarayıcıda erken çalışan kod ve `onRouterTransitionStart`.
5. [Sentry: Build Options for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/build/) *(doc)* — Release oluşturma, `SENTRY_RELEASE` ve source map seçenekleri.
6. [Sentry: Data Collected](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection) *(doc)* — Varsayılan olarak gönderilen kullanıcı verisi ve `dataCollection`.
7. [Google](https://sre.google/): [Site Reliability Engineering: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) *(article)* — 2016, Rob Ewaschuk. Belirtiler ve nedenler, dört altın sinyal, eyleme dönüştürülebilir uyarılar.
