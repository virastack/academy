---
title: "Ortam değişkenleri"
description: "Yapılandırmayı koddan ayırmak, Next.js'in .env dosyalarını yükleme sırası, NEXT_PUBLIC_ değişkenlerinin build sırasında gömülmesi, çalışma zamanında okumak, Zod ile doğrulayıp açılışta hata vermek ve secret'ları istemciden uzak tutmak."
lastVerified: "2026-10-22"
translationKey: "production/environment-variables"
---

## Yapılandırma Koddan Ayrılır

Uygulamanız yerelde, önizleme ortamında ve canlıda çalışır. Kod her yerde aynıdır; değişen şey veritabanı adresi, API anahtarı, log seviyesi gibi değerlerdir. Bunlara **yapılandırma** *(config)* denir.

Heroku'nun 2011'de yayımladığı Twelve-Factor App ilkeleri bu ayrımı net koyar: yapılandırma koda sabit olarak yazılmaz, **ortam değişkenlerinde** tutulur. İlkenin pratik testi şudur: kod tabanını bu an açık kaynak yapsanız hiçbir kimlik bilgisi sızar mı?[^1]

Ortam değişkeni her işletim sisteminde ve dilde aynı şekilde çalışır. Kodu değiştirmeden ortamdan ortama değişir ve bir yapılandırma dosyası gibi yanlışlıkla depoya girmez.[^1]

## .env Dosyaları

[!nextjs] `.env*` dosyalarını kendiliğinden `process.env`'e yükler:[^2]

```bash
# .env.local
DATABASE_URL=postgres://localhost:5432/orders
LOG_LEVEL=debug
```

Aynı değişken birden fazla yerde tanımlıysa ilk bulunan kazanır:[^2]

| Sıra | Kaynak | Not |
| :-- | :-- | :-- |
| 1 | `process.env` | Sunucuyu başlatırken verilen gerçek ortam değişkenleri |
| 2 | `.env.$(NODE_ENV).local` | Örneğin `.env.production.local` |
| 3 | `.env.local` | `NODE_ENV=test` iken okunmaz |
| 4 | `.env.$(NODE_ENV)` | Örneğin `.env.development` |
| 5 | `.env` | Ortak varsayılanlar |

`next dev` `NODE_ENV`'i `development`, diğer komutlar `production` yapar.[^2] Yani canlı sunucuda platformun verdiği gerçek ortam değişkenleri, depodaki her dosyanın önündedir.

> [!CAUTION]
>
> `create-next-app` bütün `.env*` dosyalarını `.gitignore`'a ekler. Next.js dokümanı bu dosyaları depoya neredeyse hiç eklememenizi söyler.[^2] Gerçek anahtar taşıyan bir dosya bir kez commit'lenirse geçmişten silmek yetmez; anahtarı iptal edip yenisini üretin.

Hangi değişkenlerin gerektiğini ekip arkadaşlarınıza göstermek için değersiz bir şablon ekleyin ve yalnızca onu `.gitignore`'dan çıkarın:

```bash
# .env.example
APP_ENV=local
LOG_LEVEL=info
DATABASE_URL=
```

```bash
# .gitignore
.env*
!.env.example
```

## Tarayıcıya Giden Değişkenler: NEXT_PUBLIC_

Varsayılan olarak ortam değişkenleri **yalnızca sunucuda** okunur. Bir değişkeni tarayıcıda kullanmak için adına `NEXT_PUBLIC_` ön eki koyarsınız.[^2]

Bu ön ek bir izin değil, bir **kopyalama** talimatıdır. Next.js `next build` sırasında `process.env.NEXT_PUBLIC_ANALYTICS_ID` geçen her yeri o anki değerle değiştirir ve değer JavaScript paketine gömülür:[^2]

```ts
// Build sırasında "abc123" ile değiştirilir
const analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;

// Değiştirilmez: değişken adı dinamik
const name = "NEXT_PUBLIC_ANALYTICS_ID";
const value = process.env[name];
```

İki sonucu var:

1. **Secret'a asla `NEXT_PUBLIC_` vermeyin.** Değer, siteyi açan herkesin indirdiği dosyadadır.
2. **Build'den sonra değişmez.** Aynı build'i önizlemeden canlıya taşırsanız ya da tek bir [!docker] imajını birden fazla ortamda çalıştırırsanız, `NEXT_PUBLIC_` değerleri build anındaki halinde donar.[^2]

## Çalışma Zamanında Okumak

`NEXT_PUBLIC_` olmayan bir değişken sunucuda okunur ama **ne zaman** okunduğu önemlidir. Build sırasında önceden çizilen *(prerender)* bir sayfa değişkeni build anında okur ve sonucu saklar.

Değerin istek anında okunması için önce `connection()`'ı bekleyin. Bu, Next.js'e o kısmın isteğe bağlı olduğunu söyler:[^2]

```ts
// app/api/health/route.ts
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json({ version: process.env.APP_VERSION });
}
```

`cookies()`, `headers()` gibi istek anı API'leri de aynı etkiyi yapar. Next.js dokümanı bu yolun faydasını şöyle söyler: tek bir Docker imajı farklı değerlerle ortamdan ortama taşınabilir.[^2][^3] Twelve-Factor'ın "build, release, run" ayrımı da budur: bir kez build alınır, her ortamın yapılandırmasıyla birleşip çalıştırılır.[^4]

| Değişken | Ne zaman okunur | Nerede kullanılır |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_X` | `next build` sırasında, pakete gömülür | Sunucu ve tarayıcı |
| `X`, statik sayfada | `next build` sırasında | Yalnızca sunucu |
| `X`, `connection()` sonrası | Her istekte | Yalnızca sunucu |

## Doğrulamak: Açılışta Hata Ver

`process.env.LOG_LEVEL` her zaman `string | undefined` tipindedir. Yazım hatası, eksik değer ya da `"150"` gibi geçersiz bir sayı ilk kullanıldığı ana kadar fark edilmez; o an da genellikle gece yarısı bir kullanıcının isteğidir.

Değişkenleri tek bir yerde [!zod] ile doğrulayın *(bkz. [Zod şeması ve doğrulama](/academy/forms/zod-schema-and-validation))*:

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

- `z.coerce.number()` metni sayıya çevirir. Ortam değişkenleri her zaman metindir.[^5]
- `default` isteğe bağlı değerleri tanımlar. Zorunlu bir secret için varsayılan vermeyin; eksikse hata versin.
- `"server-only"` bu dosya bir Client Component'e import edilirse build'i durdurur *(bkz. [Server ve Client Components](/academy/nextjs/server-and-client-components))*.

Doğrulamayı ilk istekte değil, **sunucu açılırken** çalıştırın. Next.js'in `register` fonksiyonu sunucu başlarken bir kez çalışır:[^6]

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
```

```ts
// instrumentation-node.ts
import { getEnv } from "./lib/env";

try {
  getEnv();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
```

`process.exit` Edge çalışma ortamında yoktur. Node.js'e özgü kodu ayrı bir dosyaya koyup `NEXT_RUNTIME` kontrolüyle import etmek, dokümanın önerdiği yoldur ve build uyarısını önler.[^6] Sonuç:

```command
ORDER_SUMMARY_ROLLOUT=150 npm start
```

```text
Geçersiz ortam değişkenleri:
- ORDER_SUMMARY_ROLLOUT: Too big: expected number to be <=100
```

Sunucu hiç trafik almadan kapanır. Bir konteyner platformu yeni sürümü sağlıksız sayar ve eski sürümü çalıştırmaya devam eder.

> [!NOTE]
>
> `process.exit` olmadan da Next.js `register`'daki hatayı yakalar ama sunucu açık kalır ve her isteğe 500 döner. Açıkça kapatmak, hatanın sessizce trafik almasını önler.

## Ortam Başına Değerler

`NODE_ENV` yalnızca `development`, `production` ya da `test` olabilir.[^2] Önizleme ortamı da `production` build'idir. "Hangi ortamdayım?" sorusu için `APP_ENV` gibi kendi değişkeninizi tanımlayın.

Twelve-Factor ise değerleri `staging`, `qa` gibi adlandırılmış gruplara toplamaya karşı uyarır: ortam sayısı arttıkça gruplar çoğalır ve yönetmek zorlaşır. Her değişken bağımsız bir ayardır ve her deploy için ayrı yönetilir.[^1] `APP_ENV`'i davranışı açıp kapamak için değil, loglarda ve hata kayıtlarında ortamı ayırmak için kullanın.

Değerleri nereden verirsiniz?

| Ortam | Değerler nerede |
| :-- | :-- |
| Yerel | `.env.local` |
| CI | [!github] Actions secrets ve değişkenleri *(bkz. [CI/CD](/academy/production/cicd))* |
| [!vercel] | Proje ayarlarında Development, Preview ve Production için ayrı ayrı |
| Docker ya da sunucu | `docker run -e`, orkestrasyon aracının secret yöneticisi |

## Secret'ları Korumak

OWASP'ın secret yönetimi rehberi secret'ları merkezi bir yerde tutmayı ve her birini bir yaşam döngüsüyle yönetmeyi önerir: oluşturma, düzenli döndürme *(rotation)*, iptal ve süre dolumu. Elle yapılan döndürme hataya açık olduğu için mümkünse otomatikleştirilmelidir.[^7]

> [!DO]
>
> - Secret'ı yalnızca sunucuda okuyun; okuyan modüle `import "server-only"` ekleyin.
> - Her ortama ayrı anahtar verin. Önizleme ortamı canlı veritabanı anahtarını taşımasın.
> - Sızdığından şüphelendiğiniz anahtarı hemen iptal edin.

> [!DONT]
>
> - Secret'a `NEXT_PUBLIC_` ön eki vermeyin.
> - Secret'ı Dockerfile'da `ENV` ya da `ARG` ile imaja gömmeyin *(bkz. [Deploy seçenekleri](/academy/production/deployment-options))*.
> - `process.env`'in tamamını loglamayın.

## Kendin Dene

- Projenize `lib/env.ts` ekleyin. Bir değişkene geçersiz değer verip sunucunun açılışta kapandığını görün.
- `NEXT_PUBLIC_` ile bir değer tanımlayın, `next build` alın ve `.next/static` içinde değeri arayın.
- Statik bir sayfada `process.env` okuyun, build sonrası değeri değiştirip sunucuyu yeniden başlatın. Değer değişti mi? `connection()` ekleyip tekrar deneyin.
- Bir `.env.example` yazın ve `.gitignore`'u yalnızca onu izleyecek şekilde düzenleyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Next.js, "Environment Variables"; yükleme sırası, `NEXT_PUBLIC_` ve test ortamı.[^2]
- **Yazı:** Heroku, "The Twelve-Factor App: Config"; yapılandırmayı koddan ayırmanın gerekçesi.[^1]
- **Rehber:** OWASP, "Secrets Management Cheat Sheet"; secret'ların yaşam döngüsü.[^7]

## Kaynaklar

1. [Heroku](https://12factor.net/): [The Twelve-Factor App: III. Config](https://12factor.net/config) *(article)* — 2011, Adam Wiggins. Yapılandırmayı ortam değişkenlerinde tutmak, açık kaynak testi ve adlandırılmış ortam gruplarının sorunu.
2. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — `.env` yükleme sırası, `NEXT_PUBLIC_` ile build sırasında gömme, `connection()` ile çalışma zamanında okuma.
3. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — Çalışma zamanı ortam değişkenleri ve tek imajı birden fazla ortamda kullanmak.
4. [Heroku](https://12factor.net/): [The Twelve-Factor App: V. Build, release, run](https://12factor.net/build-release-run) *(article)* — 2011, Adam Wiggins. Build, release ve run aşamalarını ayırmak.
5. [Zod: Coercion](https://zod.dev/api#coercion) *(doc)* — `z.coerce` ile metni sayıya çevirmek.
6. [Next.js: Instrumentation](https://nextjs.org/docs/app/guides/instrumentation) *(doc)* — `register` fonksiyonu ve çalışma ortamına özgü kodu import etmek.
7. [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) *(doc)* — Secret'ların saklanması, döndürülmesi ve sızıntıya müdahale.
