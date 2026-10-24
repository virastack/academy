---
title: "Sipariş panelini yayına hazırla"
description: "Ortam doğrulama, log, hata ekranları, feature flag, Docker ve CI ile bir paneli canlıya hazırlamak."
lastVerified: "2026-10-22"
translationKey: "production/project"
---

## Senaryo

[Playwright rehberinin projesinde](/academy/playwright/project) bir sipariş panelinin testlerini yazdınız. Uygulama çalışıyor ama canlıya hazır değil:

- Yapılandırma doğrulanmıyor; hatalı bir değer ilk kullanıldığı ana kadar fark edilmiyor.
- Sunucu hataları yalnızca terminale düşüyor; kullanıcıya gösterilen hatayla eşleştirilemiyor.
- Kimin ne zaman giriş yapamadığı kaydedilmiyor.
- Yeni bir özelliği önce bir grup kullanıcıya açmanın yolu yok.
- Uygulamayı bir sunucuya taşımanın tekrarlanabilir bir yolu ve her push'ta çalışan bir hat yok.

Sizin işiniz bunları tek tek eklemek. Her adım bu rehberdeki bir dersin uygulamasıdır:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Zod ile doğrulanan ortam değişkenleri | `lib/env.ts`, `.env.example` | [Ortam değişkenleri](/academy/production/environment-variables) |
| Açılışta doğrulama, `onRequestError` | `instrumentation.ts`, `instrumentation-node.ts` | [Hata izleme](/academy/production/error-monitoring) |
| Hata kodu gösteren hata ekranları | `app/error.tsx`, `app/global-error.tsx` | [Hata izleme](/academy/production/error-monitoring) |
| Yapılandırılmış log, gizlenen alanlar, giriş olayları | `lib/logger.ts`, `app/actions.ts` | [Loglama](/academy/production/logging) |
| Yüzdeli açılan sipariş özeti | `lib/rollout.ts`, `lib/flags.ts` | [Feature flag ve yayın stratejisi](/academy/production/feature-flags-and-release-strategy) |
| Standalone çıktı, sağlık kontrolü, Docker | `next.config.ts`, `app/api/health/route.ts`, `Dockerfile` | [Deploy seçenekleri](/academy/production/deployment-options) |
| Lint, tip, test ve Docker işleri | `.github/workflows/ci.yml` | [CI/CD](/academy/production/cicd) |
| Güvenlik başlıkları ve son kontrol | `next.config.ts`, `tests/production.spec.ts` | [Yayın öncesi kontrol listesi](/academy/production/pre-release-checklist) |

Projenin çalışan hali GitHub'da: [examples/production/project](https://github.com/virastack/academy/tree/main/examples/production/project). Takıldığınızda karşılaştırın.

## Adım 1: Başlangıç Noktası

Playwright projesini kopyalayın ya da [examples/playwright/project](https://github.com/virastack/academy/tree/main/examples/playwright/project) klasöründen başlayın. Üç paket ekleyin:

```command
npm install zod flags pino
```

Testlerin şu an geçtiğinden emin olun; sonraki her adımdan sonra yeniden çalıştıracaksınız:

```command
npm test
```

## Adım 2: Ortam Değişkenleri

Uygulamanın okuduğu her değişkeni tek bir şemada toplayın. Değeri olmayanlar varsayılanını alır, geçersiz olanlar anlaşılır bir hata verir:[^1][^2]

```ts
// lib/env.ts
import "server-only";
import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
  APP_VERSION: z.string().min(1).default("dev"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ORDER_SUMMARY_ROLLOUT: z.coerce.number().int().min(0).max(100).default(0),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Ortam değişkenlerini bir kez doğrular ve önbelleğe alır.
 * Eksik ya da hatalı bir değer varsa hangi değişkenin neden geçersiz olduğunu söyleyerek hata fırlatır.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Geçersiz ortam değişkenleri:\n${problems}`);
  }

  cached = result.data;
  return cached;
}
```

`ORDER_SUMMARY_ROLLOUT` metin olarak gelir; `z.coerce.number()` onu sayıya çevirir ve 0-100 aralığını zorlar. Ekip arkadaşlarınız için bir şablon ekleyin:

```bash
# .env.example
# Bu dosyayı .env.local adıyla kopyalayın. Gerçek değerleri asla depoya eklemeyin.
# Tüm değişkenler lib/env.ts içinde Zod ile doğrulanır.

# local | preview | production
APP_ENV=local
# Sağlık uç noktasında ve loglarda görünen sürüm. CI'da commit SHA'sı verilir.
APP_VERSION=dev
# debug | info | warn | error
LOG_LEVEL=info
# Sipariş özetini görecek kullanıcı yüzdesi (0-100)
ORDER_SUMMARY_ROLLOUT=0
```

`create-next-app` bütün `.env*` dosyalarını yok sayar. Şablonu bu kuralın dışında tutun:

```bash
# .gitignore
.env*
!.env.example
```

## Adım 3: Logger ve Açılışta Doğrulama

Logger her satıra servis, ortam ve sürüm bilgisini ekler; parola ve cookie alanlarını yazmadan önce gizler:[^3]

```ts
// lib/logger.ts
import "server-only";
import pino from "pino";
import { getEnv } from "./env";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  base: { service: "order-panel", env: getEnv().APP_ENV, version: getEnv().APP_VERSION },
  redact: {
    paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
    censor: "[gizlendi]",
  },
});
```

Ortam doğrulamasını ilk istekte değil, sunucu açılırken çalıştırın. `process.exit` Edge çalışma ortamında olmadığı için Node.js'e özgü kodu ayrı bir dosyaya koyun:[^4]

```ts
// instrumentation-node.ts
import { getEnv } from "./lib/env";

// Yalnızca Node.js çalışma ortamında, sunucu açılırken bir kez çalışır.
try {
  getEnv();
} catch (error) {
  // Ortam değişkenleri hatalıysa sunucu hiç trafik almadan kapanır.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { logger } = await import("./lib/logger");
logger.info({ event: "server_started" }, "Sunucu başladı");
```

Aynı dosyada `onRequestError`, sunucudaki her hatayı `digest` ile birlikte loglar:[^5]

```ts
// instrumentation.ts
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("./lib/logger");
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;

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

Deneyin: `npm run build` sonrası `ORDER_SUMMARY_ROLLOUT=150 npm start` çalıştırın. Sunucu hangi değişkenin neden geçersiz olduğunu yazıp kapanmalı.

## Adım 4: Hata Ekranları

Kök seviyedeki `error.tsx` bütün sayfaları sarar. Sunucu hatalarında Next.js mesajı gizler ve yalnızca bir `digest` gönderir; onu kullanıcıya hata kodu olarak gösterin:[^6]

```tsx
// app/error.tsx
"use client";

/** Sunucu hatalarında Next.js'in eklediği `digest` değerini güvenle okur. */
function getDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    return typeof error.digest === "string" ? error.digest : undefined;
  }
}

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = getDigest(error);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div role="alert" className="space-y-3 rounded border border-red-300 bg-red-50 p-4">
        <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
        <p>Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilirsiniz.</p>
        {digest && (
          <p className="text-sm">
            Destek ekibine iletmek için hata kodu: <code>{digest}</code>
          </p>
        )}
        <button type="button" onClick={() => retry()} className="underline">
          Tekrar dene
        </button>
      </div>
    </main>
  );
}
```

`error` prop'u `unknown`'dır. `instanceof Error` yerine alanın kendisini kontrol edin; Suspense içinden gelen sunucu hatası bu kontrolden geçmeyebilir.

Kök layout'taki hatalar için `global-error.tsx` kendi `<html>` ve `<body>` etiketlerini çizer. Global stiller burada yüklü değildir:[^6]

```tsx
// app/global-error.tsx
"use client";

// Kök layout'taki hataları yakalar. Kendi <html> ve <body> etiketlerini çizer;
// globals.css burada yüklü değildir, bu yüzden stiller satır içidir.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem 1rem" }}>
        <title>Hata | Sipariş paneli</title>
        <main role="alert" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h1>Uygulama yüklenemedi</h1>
          <p>Beklenmeyen bir hata oluştu. Sayfayı yeniden yüklemeyi deneyin.</p>
          <button type="button" onClick={() => retry()}>
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
```

Hattı uçtan uca denemek için bilerek hata fırlatan bir sayfa ekleyin. `connection()` hatanın build sırasında değil istek anında fırlamasını sağlar; production'da sayfa 404 döner:

```tsx
// app/debug/page.tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getEnv } from "@/lib/env";

// Hata izleme hattını uçtan uca denemek için bilerek hata fırlatan sayfa.
// Production'da 404 döner.
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

`/debug`'ı açın. Ekrandaki hata kodu ile sunucu logundaki `digest` aynı olmalı.

## Adım 5: Giriş Olaylarını Loglamak

Başarısız girişler, kimlik bilgisi saldırılarının ilk işaretidir. OWASP bunların her zaman kaydedilmesini ister; parolanın ise asla:[^7]

```ts
// app/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE } from "@/lib/session";
import { createSession, deleteSession, findUser } from "@/lib/store";

export type LoginState = {
  error?: string;
  email?: string;
};

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = findUser(email, password);
  if (!user) {
    // Parolayı asla loglamayın. E-posta, tekrar eden denemeleri fark etmek için yeterlidir.
    logger.warn({ event: "login_failed", email }, "Giriş başarısız");
    return { error: "E-posta veya parola hatalı.", email };
  }

  logger.info({ event: "login_succeeded", userId: user.id }, "Giriş başarılı");
  (await cookies()).set(SESSION_COOKIE, createSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/orders");
}

export async function logout() {
  const cookieStore = await cookies();
  deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
```

## Adım 6: Sağlık Kontrolü

Konteyner platformu, yük dengeleyici ve CI'daki smoke test bu uç noktayı sorar. `connection()` yanıtın build sırasında üretilip saklanmasını önler; değişkenler her istekte okunur:[^1]

```ts
// app/api/health/route.ts
import { connection } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  await connection();
  const { APP_ENV, APP_VERSION } = getEnv();

  return Response.json(
    { status: "ok", env: APP_ENV, version: APP_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

## Adım 7: Yüzdeli Açılan Özellik

Yeni özellik: sipariş listesinin üstünde adet ve toplam tutar. Önce bir grup kullanıcıya açılacak.

Kullanıcıyı sabit bir kovaya yerleştiren fonksiyon. Aynı kullanıcı her istekte aynı sonucu alır ve yüzde artınca içerideki kimse dışarıda kalmaz:

```ts
// lib/rollout.ts
/**
 * Bir kimliği 0 ile 99 arasında sabit bir kovaya yerleştirir (FNV-1a).
 * Aynı kullanıcı her istekte aynı kovaya düşer; yüzde 10'luk açılışta hep aynı yüzde 10 görür.
 */
export function rolloutBucket(id: string, salt: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${salt}:${id}`) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 100;
}

export function isInRollout(id: string, salt: string, percentage: number): boolean {
  return rolloutBucket(id, salt) < percentage;
}
```

Flag, kim için karar verildiğini `identify` ile oturum cookie'sinden bulur; `decide` yüzdeyi uygular:[^8]

```ts
// lib/flags.ts
import "server-only";
import { flag } from "flags/next";
import { getEnv } from "./env";
import { isInRollout } from "./rollout";
import { SESSION_COOKIE } from "./session";
import { readSession } from "./store";

type Entities = { user?: { id: string } };

export const orderSummaryFlag = flag<boolean, Entities>({
  key: "order-summary",
  description: "Sipariş listesinin üstünde adet ve toplam tutar özeti",
  defaultValue: false,
  options: [
    { value: false, label: "Kapalı" },
    { value: true, label: "Açık" },
  ],
  identify({ cookies }) {
    const session = readSession(cookies.get(SESSION_COOKIE)?.value);
    return session ? { user: { id: session.user.id } } : undefined;
  },
  decide({ entities }) {
    if (!entities?.user) return false;
    return isInRollout(entities.user.id, "order-summary", getEnv().ORDER_SUMMARY_ROLLOUT);
  },
});
```

Flag'i sunucuda, oturumu okuyan bileşende değerlendirin ve sonucu Client Component'e prop olarak verin:

```tsx
// app/orders/page.tsx
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { OrdersPanel } from "@/components/orders-panel";
import { orderSummaryFlag } from "@/lib/flags";
import { getCurrentUser } from "@/lib/session";

const roleLabels = { admin: "Yönetici", viewer: "İzleyici" } as const;

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Siparişler</h1>
      <Suspense fallback={<p>Oturum kontrol ediliyor...</p>}>
        <OrdersSection />
      </Suspense>
    </main>
  );
}

async function OrdersSection() {
  const user = await getCurrentUser();
  const showSummary = await orderSummaryFlag();

  return (
    <>
      <div className="flex items-center justify-between gap-4 text-sm">
        <p>
          {user.name} <span className="text-gray-700">({roleLabels[user.role]})</span>
        </p>
        <form action={logout}>
          <button type="submit" className="underline">
            Çıkış yap
          </button>
        </form>
      </div>
      <OrdersPanel canCancel={user.role === "admin"} showSummary={showSummary} />
    </>
  );
}
```

`OrdersPanel` yeni bir `showSummary` prop'u alır ve tablonun üstünde özeti gösterir:

```tsx
// components/orders-panel.tsx
type OrdersPanelProps = {
  canCancel: boolean;
  showSummary: boolean;
};

// tablo çizilirken:
<>
  {showSummary && <OrdersSummary orders={orders.data} />}
  <table className="w-full text-left text-sm">{/* ... */}</table>
</>

function OrdersSummary({ orders }: { orders: Order[] }) {
  const total = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <p className="text-sm text-gray-700">
      {orders.length} sipariş, toplam {currency.format(total)}
    </p>
  );
}
```

`.env.local` içinde `ORDER_SUMMARY_ROLLOUT=100` yapıp sunucuyu yeniden başlatın; özet görünmeli. `0` yapınca kaybolmalı.

## Adım 8: Production Build ve Güvenlik Başlıkları

`output: "standalone"` çalışmak için gereken dosyaları `.next/standalone`'a toplar. Aynı dosyada güvenlik başlıklarını ekleyin ve `X-Powered-By`'ı kapatın:[^9][^10]

```ts
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

Standalone sunucu `public` ve `.next/static` klasörlerini kendiliğinden sunmaz. Build sonrası kopyalayan küçük bir betik yazın:[^9]

```js
// scripts/prepare-standalone.mjs
// `output: "standalone"` derlemesi .next/static ve public klasörlerini kopyalamaz.
// `node .next/standalone/server.js` bu dosyaları da sunabilsin diye build sonrası kopyalar.
import { cpSync, existsSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
```

`package.json` betikleri. `start` artık `next start` değil, standalone sunucudur; `postbuild` her `npm run build`'den sonra kendiliğinden çalışır:

```json
{
  "dev": "next dev",
  "build": "next build",
  "postbuild": "node scripts/prepare-standalone.mjs",
  "start": "node .next/standalone/server.js",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "playwright test"
}
```

## Adım 9: Testler

Testler artık production build'e, standalone sunucuya karşı çalışır. `webServer.env` sunucuyu bilinen değerlerle başlatır; özet testinin geçmesi için açılış yüzde 100'dür:

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const adminState = "playwright/.auth/admin.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
    },
    {
      name: "visual",
      testMatch: /.*\.visual\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: adminState },
      dependencies: ["setup"],
      default: false,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: "3000",
      APP_ENV: "local",
      APP_VERSION: "test",
      ORDER_SUMMARY_ROLLOUT: "100",
    },
  },
});
```

Yayına hazırlığı doğrulayan testler: sağlık uç noktası, güvenlik başlıkları, flag ve hata ekranı:

```ts
// tests/production.spec.ts
import { expect, test } from "./fixtures";

test("sağlık uç noktası ortamı ve sürümü döner", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok", env: "local", version: "test" });
});

test("güvenlik başlıkları gönderilir, X-Powered-By gönderilmez", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("flag açık olan kullanıcı sipariş özetini görür", async ({ page, ordersPage }) => {
  await ordersPage.goto();

  await expect(page.getByText("6 sipariş, toplam ₺5.422,40")).toBeVisible();
});

test("sunucu hatasında hata sınırı digest gösterir", async ({ page }) => {
  await page.goto("/debug");

  // Next.js'in sayfa geçişi duyurucusu da role="alert" taşır; metinle daraltıyoruz.
  const alert = page.getByRole("alert").filter({ hasText: "Bir şeyler ters gitti" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/hata kodu: \S+/);
  await expect(alert).not.toContainText("bilerek fırlatıldı");
});
```

Next.js'in sayfa geçişi duyurucusu da `role="alert"` taşır. Hata kutusunu metinle daraltmazsanız locator iki elemente çözülür ve strict mod hatası alırsınız.

Açılış fonksiyonunun üç özelliğini doğrulayan saf fonksiyon testleri:

```ts
// tests/rollout.spec.ts
// Tarayıcı gerektirmeyen saf fonksiyon testleri. Gerçek bir projede bunları
// Vitest gibi bir birim test aracına taşıyın; burada tek araçla kalmak için Playwright'ta.
import { expect, test } from "@playwright/test";
import { isInRollout, rolloutBucket } from "../lib/rollout";

const ids = Array.from({ length: 10_000 }, (_, index) => `user-${index}`);

test("aynı kullanıcı her zaman aynı kovaya düşer", () => {
  expect(rolloutBucket("u1", "order-summary")).toBe(rolloutBucket("u1", "order-summary"));
});

test("yüzde 0 kimseyi, yüzde 100 herkesi içerir", () => {
  expect(ids.some((id) => isInRollout(id, "order-summary", 0))).toBe(false);
  expect(ids.every((id) => isInRollout(id, "order-summary", 100))).toBe(true);
});

test("yüzde 30 kullanıcıların yaklaşık yüzde 30'unu içerir", () => {
  const share = ids.filter((id) => isInRollout(id, "order-summary", 30)).length / ids.length;

  expect(share).toBeGreaterThan(0.27);
  expect(share).toBeLessThan(0.33);
});

test("yüzde artınca önceden dahil olan kimse dışarıda kalmaz", () => {
  const at10 = ids.filter((id) => isInRollout(id, "order-summary", 10));

  expect(at10.every((id) => isInRollout(id, "order-summary", 30))).toBe(true);
});
```

## Adım 10: Docker İmajı

Üç aşamalı imaj: bağımlılıklar, build, çalışma. Son imajda kaynak kod ve `node_modules`'ın tamamı yoktur ve süreç root olmayan `node` kullanıcısıyla çalışır:[^11][^12]

```dockerfile
# Dockerfile
# syntax=docker/dockerfile:1

# Node.js sürümünü güncel LTS ile birlikte düzenli olarak yükseltin.
ARG NODE_VERSION=24-slim

# 1. aşama: bağımlılıklar. Yalnızca paket dosyaları değişince yeniden çalışır.
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# 2. aşama: build. output: "standalone" yalnızca çalışmak için gereken dosyaları toplar.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. aşama: çalışma imajı. Kaynak kod ve node_modules'ın tamamı burada yok.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Root olmayan kullanıcıyla çalış.
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
```

`.dockerignore` yerel dosyaların, testlerin ve özellikle `.env*` dosyalarının imaja girmesini önler:

```text
# .dockerignore
node_modules
.next
.git
.github
.env*
!.env.example
Dockerfile
.dockerignore
npm-debug.log*

# testler imaja girmez
tests
playwright
playwright.config.ts
playwright-report
test-results
blob-report
```

```command
docker build -t order-panel .
```

```command
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
```

```command
curl http://localhost:3000/api/health
```

Yanıt `{"status":"ok","env":"preview","version":"1.0.0"}` olmalı. Aynı imajı geçersiz bir değerle başlatın; konteyner hatayı yazıp çıkmalı:

```command
docker run --rm -e ORDER_SUMMARY_ROLLOUT=150 order-panel
```

## Adım 11: CI Hattı

Üç iş: `quality` ve `e2e` paralel, ikisi geçerse `docker` imajı build alıp smoke test yapar:[^13][^14]

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Aynı dal için yeni bir push geldiğinde pull request'teki eski çalıştırmayı iptal et.
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

# GITHUB_TOKEN yalnızca depoyu okuyabilsin.
permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - name: Restore Next.js build cache
        uses: actions/cache@v6
        with:
          path: .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-${{ hashFiles('app/**', 'components/**', 'lib/**') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('package-lock.json') }}-
      - run: npx playwright install --with-deps chromium
      - run: npm test
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

  docker:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [quality, e2e]
    steps:
      - uses: actions/checkout@v7
      - name: Build image
        run: docker build -t order-panel:${{ github.sha }} .
      - name: Smoke test
        run: |
          docker run -d --name app -p 3000:3000 \
            -e APP_ENV=preview -e APP_VERSION=${{ github.sha }} \
            order-panel:${{ github.sha }}
          for i in $(seq 1 30); do
            curl -fsS http://localhost:3000/api/health && exit 0
            sleep 1
          done
          docker logs app
          exit 1
```

## Adım 12: Doğrulayın

```command
npm run lint
```

```command
npm run typecheck
```

```command
npm test
```

Beklenen sonuç `27 passed` *(iki oturum açma adımı ve 25 test)*. Son olarak [yayın öncesi kontrol listesini](/academy/production/pre-release-checklist) projenin üzerinden geçirin; hangi maddeler hâlâ açık?

## Kendin Dene

- Sentry'nin ücretsiz planıyla `onRequestError`'ı Sentry'ye de bağlayın ve `/debug`'daki hatanın panelde göründüğünü doğrulayın.
- Sipariş iptalini `order_cancelled` olayıyla loglayın; izleyicinin reddedilen isteğini `authorization_failed` olarak yazın.
- `ORDER_SUMMARY_ROLLOUT=50` ile iki demo kullanıcının özeti görüp görmediğine bakın. Tuzu değiştirince sonuç değişiyor mu?
- CI'a `main`'de çalışan ve `production` ortamına bağlı bir `deploy` işi ekleyin; ortama onaylayıcı tanımlayıp işin onay beklediğini görün.

## Kaynaklar

1. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — Çalışma zamanında okumak, `connection()` ve `NEXT_PUBLIC_`.
2. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — `z.coerce` ile metni sayıya çevirmek.
3. [pino: Redaction](https://getpino.io/#/docs/redaction) *(doc)* — `redact` yolları ve `censor`.
4. [Next.js: Instrumentation](https://nextjs.org/docs/app/guides/instrumentation) *(doc)* — `register` ve çalışma ortamına özgü kodu import etmek.
5. [Next.js: instrumentation.js](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation) *(doc)* — `onRequestError` imzası.
6. [Next.js: error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) *(doc)* — `error`, `digest`, `retry` ve `global-error`.
7. [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) *(doc)* — Kaydedilecek olaylar ve loglanmayacak veriler.
8. [Flags SDK: Evaluation Context](https://flags-sdk.dev/frameworks/next/evaluation-context) *(doc)* — `identify` ve `decide`.
9. [Next.js: output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) *(doc)* — Standalone çıktı ve statik dosyaları kopyalamak.
10. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — Güvenlik başlıkları.
11. [Next.js: with-docker örneği](https://github.com/vercel/next.js/tree/canary/examples/with-docker) *(doc)* — Standalone çıktıyla resmi Dockerfile.
12. [OWASP: Node.js Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html) *(doc)* — Root olmayan kullanıcı ve sinyaller.
13. [Next.js: CI Build Caching](https://nextjs.org/docs/app/guides/ci-build-caching) *(doc)* — `.next/cache`'i CI'da korumak.
14. [GitHub: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) *(doc)* — Token izinleri ve eylem güvenliği.
