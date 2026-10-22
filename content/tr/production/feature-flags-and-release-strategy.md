---
title: "Feature flag ve yayın stratejisi"
description: "Deploy ile yayını ayırmak, flag türleri ve taşıma maliyeti, Flags SDK ile sunucuda değerlendirilen bir flag, kullanıcıyı sabit kovaya yerleştirerek yüzdeli açılış, canary ve blue-green yayın, geri alma ve flag'leri test etmek."
lastVerified: "2026-10-22"
translationKey: "production/feature-flags-and-release-strategy"
---

## Deploy Etmek ile Yayınlamak Farklıdır

**Deploy**, yeni kodun sunucuya gitmesidir. **Yayın** *(release)*, kullanıcının yeni özelliği görmesidir. Çoğu projede ikisi aynı andadır: kod canlıya çıktığı an herkes yeni özelliği görür ve bir sorun çıkarsa tek çare geri deploy etmektir.

Feature flag *(özellik bayrağı)* ikisini ayırır. Kod canlıdadır ama özellik kapalıdır; kimin ne zaman göreceğine bir yapılandırma karar verir. Sorun çıkarsa flag kapatılır, deploy gerekmez.

## Flag Türleri

Pete Hodgson'ın [martinfowler.com](https://martinfowler.com/)'da yayımlanan yazısı flag'leri ne kadar yaşadıklarına ve ne kadar dinamik olduklarına göre dörde ayırır:[^1]

| Tür | Amaç | Ömür |
| :-- | :-- | :-- |
| Yayın *(release)* | Yarım kalmış ya da yeni bir özelliği kapalı tutarak canlıya çıkarmak | Günler, birkaç hafta |
| Deney *(experiment)* | A/B testi; kullanıcıları gruplara ayırıp davranışı karşılaştırmak | Anlamlı sonuç alınana kadar |
| Operasyon *(ops)* | Yük altında ağır bir özelliği kapatmak; "acil durum anahtarı" | Kısa ya da kalıcı |
| İzin *(permissioning)* | Özelliği yalnızca belirli kullanıcılara açmak *(beta, premium, iç ekip)* | Uzun, çoğu zaman kalıcı |

Hodgson'ın en önemli uyarısı maliyetle ilgilidir: flag'ler bir **envanterdir** ve taşıma maliyeti vardır. Her flag kodda bir dal, test edilmesi gereken bir kombinasyon ve unutulursa kalıcı bir karmaşıklık demektir. Yayın flag'leri işini bitirince silinmelidir.[^1]

> [!DO]
>
> - Her flag'e bir sahip ve bir silinme tarihi verin.
> - Özellik yüzde 100'e ulaşıp bir süre sorunsuz çalıştıysa flag'i ve eski kodu silen pull request'i açın.

## Flags SDK

Flags SDK, [!nextjs] ekibinin açık kaynak flag kütüphanesidir; herhangi bir flag sağlayıcısıyla ya da kendi kurallarınızla çalışır.[^2]

```command
npm install flags
```

Her flag bir **fonksiyon** olarak tanımlanır:[^2][^3]

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

- `key` flag'in kimliğidir.
- `defaultValue` flag değerlendirilemezse kullanılır. Varsayılanın tanımda olması her çağrıda aynı varsayılanı garanti eder.[^3]
- `identify` **kim için** karar verildiğini bulur. Normalize edilmiş `headers` ve `cookies` alır; döndürdüğü varlıklar `decide`'a geçer.[^4]
- `decide` **ne** döneceğine karar verir.

Hodgson'ın yazısı karar noktasını *(kodda flag'in sorulduğu yer)* karar mantığından *(flag'in neye göre açıldığı)* ayırmayı önerir.[^1] Flags SDK'nın `identify` ve `decide` ayrımı tam olarak budur. Kural değişince çağıran kod değişmez.

Kullanımı:

```tsx
// app/orders/page.tsx
async function OrdersSection() {
  const user = await getCurrentUser();
  const showSummary = await orderSummaryFlag();

  return <OrdersPanel canCancel={user.role === "admin"} showSummary={showSummary} />;
}
```

Her flag aynı biçimde çağrılır: `await orderSummaryFlag()`. Editörde "Tüm referansları bul" ile flag'in nerelerde kullanıldığı görünür; silme günü geldiğinde bu çok işe yarar.[^3]

## Neden Sunucuda?

Flags SDK flag'lerin sunucuda değerlendirilmesini savunur. Tarayıcıda değerlendirilen bir flag, değeri ağdan gelene kadar ya bir yükleniyor göstergesi ya da tahmini bir sürüm göstermek zorundadır; değer farklı çıkarsa sayfa kayar.[^5] Sunucuda değerlendirilen flag'de sunucu yalnızca doğru sürümü gönderir.

Bedeli: flag cookie okuduğu için sayfanın o kısmı isteğe bağlı *(dinamik)* olur. Bu projede flag zaten oturum okuyan, `Suspense` içindeki bir bileşende çağrılır *(bkz. [Veri çekme ve streaming](/academy/nextjs/data-fetching-and-streaming))*. Statik kalması gereken pazarlama sayfaları için SDK'nın proxy ile önceden hesaplama *(precompute)* kalıpları vardır.[^5]

## Yüzdeli Açılış

"Kullanıcıların yüzde 10'una aç" demek kolaydır, doğru yapmak değil. `Math.random() < 0.1` her istekte farklı sonuç verir: kullanıcı sayfayı yenileyince özellik kaybolur.

Doğrusu kullanıcıyı **sabit bir kovaya** yerleştirmektir. Kullanıcı kimliğinin özeti *(hash)* 0-99 arasında bir sayıya çevrilir; sayı yüzdeden küçükse kullanıcı içeridedir:

```ts
// lib/rollout.ts
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

Bu yöntemin üç özelliği, projede birer testle doğrulanır:

1. **Kalıcı:** Aynı kullanıcı her istekte aynı kovaya düşer.
2. **Dengeli:** 10.000 kullanıcıda yüzde 30'luk açılış yaklaşık yüzde 30'u içerir.
3. **Büyüyen:** Yüzde 10'dan 30'a çıkınca önceden içeride olan kimse dışarıda kalmaz; çünkü kovası 10'dan küçük olan, 30'dan da küçüktür.

`salt` *(tuz)* her flag'e farklı bir dağılım verir. Tuz olmasaydı, her yeni özelliği ilk görenler hep aynı yüzde 10 olurdu.

> [!NOTE]
>
> Projede yüzde, `ORDER_SUMMARY_ROLLOUT` ortam değişkeninden gelir; değiştirmek sunucunun yeniden başlatılmasını gerektirir. Gerçek projelerde bu değer bir flag sağlayıcısında *(LaunchDarkly, Statsig, GrowthBook ya da Vercel Flags gibi)* tutulur ve anında değişir. Flags SDK'nın sağlayıcı adaptörleri bunun içindir; `decide`'ın içi değişir, çağıran kod değişmez.[^2]

## Canary ve Blue-Green

Flag'ler özellik düzeyinde çalışır. Bir de **deploy düzeyinde** stratejiler vardır:

**Canary yayın.** Danilo Sato'nun [martinfowler.com](https://martinfowler.com/)'daki tarifine göre yeni sürüm önce trafiğin küçük bir kısmına verilir. Sorun yoksa pay kademeli olarak artırılır, sorun çıkarsa trafik eski sürüme döner.[^6] Adını madencilerin zehirli gazı erken fark etmek için ocağa götürdüğü kanaryadan alır.

**Blue-green deploy.** [Martin Fowler](https://martinfowler.com/)'ın anlattığı yöntemde iki aynı canlı ortam vardır. Biri trafiği alırken yeni sürüm diğerine kurulur ve test edilir; sonra yönlendirici trafiği yeni ortama çevirir. Geri almak için yönlendiriciyi eski ortama çevirmek yeterlidir.[^7]

| Strateji | Ne kontrol edilir | Geri alma |
| :-- | :-- | :-- |
| Feature flag | Tek bir özellik, kullanıcı bazında | Flag'i kapatmak, saniyeler |
| Canary | Tüm sürüm, trafik yüzdesiyle | Trafiği eski sürüme çevirmek |
| Blue-green | Tüm sürüm, tek seferde | Yönlendiriciyi eski ortama çevirmek |

[!vercel] gibi platformlar her deploy'u ayrı tutar ve canlıyı eski bir deploy'a anında döndürmeye izin verir. Kendi altyapınızda bu, eski imajı yeniden başlatmak demektir; imajları commit SHA'sıyla etiketlemenin bir sebebi de budur *(bkz. [CI/CD](/academy/production/cicd))*.

> [!WARNING]
>
> Kademeli yayın sırasında eski ve yeni sürüm aynı anda çalışır. Veritabanı şeması değişiyorsa yeni sürüm eski şemayla, eski sürüm yeni şemayla da çalışabilmelidir. Next.js tarafındaki karşılığı sürüm farkıdır *(version skew)*; `deploymentId` bunun için vardır *(bkz. [Deploy seçenekleri](/academy/production/deployment-options))*.

## Açılışı İzlemek

Yüzdeyi artırmadan önce sorun: hata oranı arttı mı? Gecikme değişti mi? Hata izleme ve loglarda flag'in açık olduğu kullanıcıları ayırabilmek için flag değerini kayıtlara ekleyin:

```ts
logger.info({ event: "orders_viewed", userId: user.id, orderSummary: showSummary }, "Siparişler görüntülendi");
```

Tipik bir açılış takvimi: iç ekip, yüzde 1, yüzde 10, yüzde 50, yüzde 100. Her adımda metriklere bakın; bir sonraki adıma geçmek bir karardır, otomatik değildir.

## Flag'leri Test Etmek

Flag'li bir özelliğin iki hali vardır ve ikisi de test edilmelidir.

**Saf fonksiyon olarak.** `rolloutBucket` ve `isInRollout` tarayıcı gerektirmez; projede `tests/rollout.spec.ts` bunları doğrular. Gerçek bir projede bu testler [Vitest](/academy/vitest) gibi bir birim test aracında daha hızlı çalışır.

**Uçtan uca.** Projede Playwright sunucuyu `ORDER_SUMMARY_ROLLOUT=100` ile başlatır ve özetin göründüğünü doğrular *(bkz. [Playwright](/academy/playwright))*:

```ts
// playwright.config.ts
webServer: {
  command: "npm run build && npm run start",
  url: "http://localhost:3000/login",
  env: { PORT: "3000", APP_ENV: "local", APP_VERSION: "test", ORDER_SUMMARY_ROLLOUT: "100" },
},
```

Flags SDK test başına değer vermek için şifreli bir override cookie'si de destekler. Bunun için `FLAGS_SECRET` gerekir; aynı secret Vercel Toolbar'ın Flags Explorer'ı ile kendi oturumunuzda flag değiştirmeye de yarar.[^8]

## Kendin Dene

- Projenize bir yayın flag'i ekleyin. Kapalıyken eski, açıkken yeni bileşeni gösterin.
- `rolloutBucket`'ı 10.000 kimlikle çalıştırın ve yüzde 10, 30, 50 için dağılımı ölçün.
- Tuzu çıkarın ve iki farklı flag için içeride kalan kullanıcıların aynı olduğunu görün.
- Projenizdeki flag'leri listeleyin. Hangisi yüzde 100'de ve hâlâ kodda?

## Detaylı Öğrenmek İçin

- **Yazı:** Pete Hodgson, "Feature Toggles (aka Feature Flags)"; flag türleri, karar noktası ve taşıma maliyeti.[^1]
- **Resmi doküman:** Flags SDK, "Quickstart" ve "Flags as Code"; Next.js'te flag tanımlamak.[^2][^3]
- **Yazı:** Danilo Sato, "Canary Release"; kademeli trafikle yayın.[^6]

## Kaynaklar

1. [Pete Hodgson](https://martinfowler.com/): [Feature Toggles (aka Feature Flags)](https://martinfowler.com/articles/feature-toggles.html) *(article)* — 9 Ekim 2017. Yayın, deney, operasyon ve izin flag'leri, karar noktasını mantıktan ayırmak, taşıma maliyeti.
2. [Flags SDK: Quickstart](https://flags-sdk.dev/frameworks/next) *(doc)* — Next.js'te kurulum, flag tanımlamak ve App Router'da kullanmak.
3. [Flags SDK: Flags as Code](https://flags-sdk.dev/principles/flags-as-code) *(doc)* — Flag'lerin fonksiyon olması, tanımdaki varsayılan değer ve bağlamın tanımda kurulması.
4. [Flags SDK: Evaluation Context](https://flags-sdk.dev/frameworks/next/evaluation-context) *(doc)* — `identify`, tipli varlıklar, normalize edilmiş headers ve cookies.
5. [Flags SDK: Server-side vs Client-side](https://flags-sdk.dev/principles/server-side-vs-client-side) *(doc)* — Sunucuda değerlendirmenin gerekçesi ve statik sayfa kalıpları.
6. [Danilo Sato](https://martinfowler.com/): [Canary Release](https://martinfowler.com/bliki/CanaryRelease.html) *(article)* — 25 Haziran 2014. Yeni sürümü trafiğin küçük bir kısmıyla denemek.
7. [Martin Fowler](https://martinfowler.com/): [Blue Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) *(article)* — 1 Mart 2010. İki canlı ortam ve yönlendiriciyle geçiş ve geri alma.
8. [Flags SDK: End-to-End Tests](https://flags-sdk.dev/frameworks/next/guides/e2e-tests) *(doc)* — Playwright ile override cookie'si ve `FLAGS_SECRET`.
