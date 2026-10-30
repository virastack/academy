---
title: "Deploy seçenekleri"
description: "Node.js sunucusu, Docker, statik çıktı ve platform adaptörleri."
lastVerified: "2026-10-22"
translationKey: "production/deployment-options"
---

## Dört yol

[!nextjs] dört şekilde yayınlanabilir:[^1]

| Seçenek | Özellik desteği | Ne zaman |
| :-- | :-- | :-- |
| Node.js sunucusu | Hepsi | Bir sunucunuz ya da Node.js çalıştıran bir platformunuz varsa |
| [!docker] konteyneri | Hepsi | Konteyner çalıştıran bir bulut ya da Kubernetes kullanıyorsanız |
| Statik çıktı | Sınırlı | Sunucu gerektiren özellik yoksa; HTML, CSS ve JS dosyalarını herhangi bir web sunucusu sunar |
| Adaptör | Platforma göre değişir | Platformun kendi altyapısına uyarlanmış build |

Next.js dokümanı minimum gereksinimi tek cümleyle söyler: Next.js'i çalıştırmak için platformun **bir Node.js sunucusu** sağlaması yeterlidir. Tek bir `next start` süreci Server Components, Server Actions, Cache Components, proxy ve `after()` dahil her özelliği doğru çalıştırır.[^2]

## Adaptörler ve platformlar

Platformlar Next.js'i kendi altyapısına Deployment Adapter API ile uyarlar. Açık kaynak olan ve Next.js uyumluluk test paketini çalıştıran adaptörlere **doğrulanmış** *(verified)* adaptör denir. Bu rehber yazılırken doğrulanmış adaptörler [!vercel] ve Bun'dır; Cloudflare ve Netlify kendi adaptörleri üzerinde çalışıyor.[^1][^2]

Doküman iki kavramı ayırır:[^2]

- **İşlevsel doğruluk:** Her özellik doğru çalışır mı? Test paketi bunun ölçüsüdür; geçer ya da geçmez.
- **Performans doğruluğu:** Özellikler en iyi performansla mı çalışır? Örneğin statik kabuğun CDN'den sunulması. Bu bir yelpazedir ve platformlar burada ayrışır.

Vercel'de deploy etmek için depoyu bağlamak yeterlidir; her pull request bir önizleme adresi, `main` canlı ortam olur. Kendi sunucunuzda ise bu işleri sizin kurmanız gerekir. Bu dersin geri kalanı o işleri anlatır.

## Node.js sunucusu

En sade yol, `package.json`'daki iki betiktir:[^1]

```command
npm run build
npm run start
```

`next build` uygulamayı derler, `next start` production sunucusunu başlatır. Sunucuda kaynak kodun ve tüm `node_modules`'ın bulunması gerekir.

## Standalone çıktı

`output: "standalone"` build sırasında yalnızca çalışmak için gereken dosyaları `.next/standalone` klasörüne toplar. Kullanılan paketlerin yalnızca gereken dosyaları kopyalanır; klasör `node_modules` kurulmadan tek başına deploy edilebilir:[^3]

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Klasörde `next start` yerine kullanılan küçük bir `server.js` vardır. İki şeye dikkat:[^3]

1. `public` ve `.next/static` klasörleri **kopyalanmaz**; doküman bunların ideal olarak bir CDN'den sunulmasını bekler. Sunucunun kendisi sunacaksa elle kopyalayın:

   ```command
   cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
   ```

2. Port ve adres `PORT` ve `HOSTNAME` ortam değişkenleriyle verilir:

   ```command
   PORT=8080 HOSTNAME=0.0.0.0 node .next/standalone/server.js
   ```

> [!WARNING]
>
> `output: "standalone"` ile `next start` çalıştırırsanız Next.js uyarı verir: `"next start" does not work with "output: standalone" configuration`. Bu rehberin projesinde `start` betiği bu yüzden `node .next/standalone/server.js`'dir ve statik dosyaları kopyalayan küçük bir `postbuild` betiği vardır.

## Docker imajı

Docker dokümanı **çok aşamalı** *(multi-stage)* build önerir: her `FROM` yeni bir aşama başlatır ve son imaja yalnızca çalışmak için gereken dosyalar kopyalanır. İmaj küçülür; derleme araçları ve kaynak kod son imajda kalmaz.[^4][^5] Next.js'in resmi Docker örneği bu yapıyı standalone çıktıyla kullanır:[^6]

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=24-slim

# Stage 1: the dependencies. It runs again only when the package files change.
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Stage 2: the build.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 3: the runtime image.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
```

Satır satır gerekçeler:

- **Paket dosyalarını önce kopyalamak:** Docker her adımı önbelleğe alır. Kaynak kod değişip `package-lock.json` değişmediyse `npm ci` yeniden çalışmaz.[^5]
- **`node:24-slim`:** Etiketi sabitleyin; `node:latest` bir gün sessizce yeni bir sürüme geçer. OWASP'ın Node.js Docker rehberi de açık ve sabit imaj etiketleri önerir.[^7]
- **`USER node`:** Node.js imajları root olmayan `node` kullanıcısıyla gelir. Konteyneri root olarak çalıştırmamak, bir açık bulunduğunda saldırganın elindeki yetkiyi sınırlar.[^7]
- **`CMD ["node", "server.js"]`:** Exec biçimi süreci bir kabuk *(shell)* olmadan başlatır ve sinyaller doğrudan sürece ulaşır. `npm start` ise `SIGTERM` gibi sinyalleri Node.js sürecine iletmez.[^7]
- **`HEALTHCHECK`:** Docker uygulamanın gerçekten yanıt verip vermediğini düzenli kontrol eder. Slim imajda `curl` yoktur; Node.js'in kendi `fetch`'i yeterlidir.

`.dockerignore` build bağlamına gereksiz dosyaların girmesini önler.[^5] Yerel `node_modules`, `.next`, testler ve özellikle `.env*` dosyaları imaja girmemelidir:

```text
# .dockerignore
node_modules
.next
.git
.env*
!.env.example
tests
playwright-report
```

```command
docker build -t order-panel .
docker run --rm -p 3000:3000 -e APP_ENV=preview -e APP_VERSION=1.0.0 order-panel
```

Ortam değişkenleri `docker run -e` ile çalışma anında verilir. Aynı imaj önizlemede ve canlıda farklı değerlerle çalışır *(bkz. [Ortam değişkenleri](/academy/production/environment-variables))*.

> [!CAUTION]
>
> Secret'ı Dockerfile'da `ARG` ya da `ENV` ile vermeyin. Docker dokümanı bunların son imajda kaldığını söyler.[^8] Build sırasında bir anahtar gerekiyorsa *(özel bir npm kayıt defteri gibi)* `RUN --mount=type=secret` kullanın; secret yalnızca o komut boyunca görünür.

## Sağlık kontrolü

Bir konteyner platformu, yük dengeleyici ya da Docker'ın `HEALTHCHECK`'i uygulamanın ayakta olup olmadığını bir HTTP uç noktasıyla sorar:

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

- `connection()` yanıtın build sırasında üretilip saklanmasını önler. Sağlık kontrolü her seferinde gerçekten çalışmalıdır.
- `version` alanı canlıda hangi sürümün çalıştığını tek komutla gösterir. Bir deploy'un yayına çıkıp çıkmadığını anlamanın en kısa yoludur.
- Uç noktayı hafif tutun. Her kontrol bir veritabanı sorgusu yaparsa sağlık kontrolü yük oluşturur.

## Kendi sunucunuzda dikkat edilecekler

Next.js'in kendi sunucunuzda barındırma rehberi şunları ister:[^9]

| Konu | Ne yapmalı |
| :-- | :-- |
| Ters vekil *(reverse proxy)* | Sunucuyu doğrudan internete açmayın; önüne nginx gibi bir ters vekil koyun. Hatalı istekleri, yavaş bağlantı saldırılarını, gövde boyutu sınırlarını ve hız sınırlamayı o karşılasın |
| Streaming | nginx yanıtları tamponlar. Streaming'in çalışması için `X-Accel-Buffering: no` başlığıyla tamponlamayı kapatın; yük dengeleyicinin de parça parça yanıtı desteklediğinden emin olun |
| Birden fazla sunucu | Server Function şifreleme anahtarını `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` ile sabitleyin; yoksa bir sunucunun şifrelediğini diğeri çözemez |
| Sürüm farkı *(version skew)* | Kademeli deploy'da eski client yeni server'a gelebilir. `deploymentId` tanımlarsanız Next.js uyuşmazlığı fark eder ve tam sayfa yenilemesi yapar |
| Önbellek | Önbellek varsayılan olarak her sunucunun kendi diskindedir. Birden fazla sunucuda paylaşılan bir önbellek işleyicisi gerekir |
| Kapanış | `SIGTERM` gönderip bekleyin. Sunucu süren istekleri ve bekleyen `after()` işlerini bitirip kapanır; doküman 10-30 saniyelik bir bekleme süresi önerir |

Bu rehberin projesindeki imajda `docker stop` bir saniyeden kısa sürede temiz kapanır: Next.js sunucusu `SIGTERM`'i kendisi dinler ve süreç doğrudan `node` ile başlatıldığı için sinyal ona ulaşır.

## Hangisini seçmeli?

| Durum | Öneri |
| :-- | :-- |
| İlk proje, küçük ekip, altyapıyla uğraşmak istemiyorsunuz | Doğrulanmış adaptörü olan bir platform |
| Şirketin Kubernetes ya da konteyner altyapısı var | Docker + standalone çıktı |
| Tek bir sanal sunucu | Node.js sunucusu, önünde nginx, süreç yöneticisi olarak systemd ya da Docker |
| Blog, dokümantasyon, sunucu özelliği yok | Statik çıktı |

## Kendin dene

- Projenize `output: "standalone"` ekleyin, build alın ve `.next/standalone` klasörünün boyutunu `node_modules` ile karşılaştırın.
- Dockerfile'ı yazın ve imajı oluşturun. `docker image ls` ile boyutuna bakın; çok aşamalı yapıyı tek aşamaya indirip farkı görün.
- Konteyneri başlatıp `docker inspect -f '{{.State.Health.Status}}'` ile sağlık durumunu izleyin.
- `CMD`'yi `npm start` yapıp `docker stop`'un ne kadar sürdüğünü ölçün; sonra geri alın.

## Detaylı öğrenmek için

- **Resmi doküman:** Next.js, "Deploying" ve "Deploying to Platforms"; seçenekler, adaptörler ve özellik gereksinimleri.[^1][^2]
- **Resmi doküman:** Next.js, "Self-Hosting"; ters vekil, önbellek, sürüm farkı ve kapanış.[^9]
- **Resmi doküman:** Docker, "Building best practices"; çok aşamalı build, önbellek ve `.dockerignore`.[^5]
- **Rehber:** OWASP, "Node.js Docker Cheat Sheet"; root olmayan kullanıcı, sinyaller ve secret'lar.[^7]

## Kaynaklar

1. [Next.js: Deploying](https://nextjs.org/docs/app/getting-started/deploying) *(doc)* — Node.js sunucusu, Docker, statik çıktı, adaptörler ve doğrulanmış adaptörler.
2. [Next.js: Deploying to Platforms](https://nextjs.org/docs/app/guides/deploying-to-platforms) *(doc)* — Minimum gereksinim, işlevsel ve performans doğruluğu, özellik matrisi.
3. [Next.js: output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) *(doc)* — `output: "standalone"`, `server.js`, statik dosyaları kopyalamak, `PORT` ve `HOSTNAME`.
4. [Docker: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/) *(doc)* — Birden fazla `FROM`, aşamalar arasında dosya kopyalamak.
5. [Docker: Building best practices](https://docs.docker.com/build/building/best-practices/) *(doc)* — Çok aşamalı build, önbelleği kullanmak, `.dockerignore` ve imaj etiketlerini sabitlemek.
6. [Next.js: with-docker örneği](https://github.com/vercel/next.js/tree/canary/examples/with-docker) *(doc)* — Standalone çıktıyla üç aşamalı resmi Dockerfile.
7. [OWASP: Node.js Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html) *(doc)* — Sabit imaj etiketleri, root olmayan kullanıcı, `npm start` ve sinyaller, çok aşamalı build.
8. [Docker: Build secrets](https://docs.docker.com/build/building/secrets/) *(doc)* — `ARG` ve `ENV`'in imajda kalması, secret mount'ları.
9. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — Ters vekil, streaming, şifreleme anahtarı, `deploymentId`, önbellek ve kapanış.
