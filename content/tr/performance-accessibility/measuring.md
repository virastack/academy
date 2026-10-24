---
title: "Ölçüm (Lighthouse, DevTools)"
description: "Lighthouse skorunu okumak ve DevTools'ta nelere bakılacağı."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/measuring"
---

## Ölçüm nedir

Core Web Vitals dersinde LCP, INP ve CLS'nin ne anlama geldiğini gördünüz. Bu derste bu sayıları nereden okuyacağınıza bakıyoruz. İki tür veri vardır: **lab verisi** tek bir cihaz, tek bir ağ ve genellikle boş bir önbellekle kontrollü ortamda üretilir; **field verisi** ise gerçek kullanıcıların farklı cihaz ve ağlardaki deneyimlerinin dağılımıdır ve 75. persentilden raporlanır.[^1]

İkisi aynı sayıyı vermez ve vermesi de beklenmez. Neyi düzelteceğinize field verisiyle karar verin, nedenini lab verisiyle bulun.[^1] Pek çok kişi işe Lighthouse ile başlayıp düşük değerli düzeltmelerle zaman kaybeder; önce gerçek kullanıcı verisinde hangi metriğin hangi sayfada kötü olduğuna bakmak daha verimlidir.[^2]

| Araç | Veri türü | Ne için |
| :-- | :-- | :-- |
| Lighthouse | Lab | Sayfa yüklemesini simüle edip skor ve öneri almak |
| PageSpeed Insights | Field (CrUX) + lab | Gerçek kullanıcı verisi ve uzaktan Lighthouse raporu |
| DevTools Performance paneli | Lab (+ CrUX karşılaştırması) | Sorunun nedenini zaman çizelgesinde bulmak |
| `web-vitals` / `useReportWebVitals` | Field (kendi verin) | Kendi kullanıcılarınızdan sürekli ölçüm |

## Lighthouse

**Lighthouse**, sayfayı denetleyip Performance, Accessibility, Best Practices ve SEO kategorilerinde skor veren bir araçtır ve Chrome DevTools içinde kendi paneliyle gelir.[^3] 2026 itibarıyla güncel ana sürüm **Lighthouse 13**'tür; Ekim 2025'te çıkan bu sürüm eski performans denetimlerinin birçoğunu DevTools Performance panelindeki **Insights** ile ortak denetimlerle değiştirdi.[^4] Bu dersteki bilgiler Haziran 2026'da çıkan v13.4.0 sürümüne göre yazıldı.[^5]

DevTools'ta çalıştırmak için:[^3]

1. Sayfayı gizli pencerede (incognito) açın, DevTools'ta **Lighthouse** paneline geçin.
2. Modu seçin: **Navigation** sayfayı baştan yükler, **Timespan** siz sayfayla etkileşirken kayıt alır, **Snapshot** sayfanın o anki halini denetler.
3. Cihazı (mobil ya da masaüstü) ve kategorileri seçip denetimi başlatın.

> [!TIP]
>
> Gizli pencere bile tarayıcı eklentilerinin ve kayıtlı verinin etkisini tamamen kaldırmaz. Farklı bilgisayarlarda alınan sonuçlar da birbiriyle doğrudan karşılaştırılamaz.[^3]

### Skor nasıl hesaplanır

Performans skoru denetimlerden değil beş metrikten hesaplanır. Lighthouse 13 skorlamayı değiştirmedi; ağırlıklar Lighthouse 10'dan beri aynıdır:[^6][^4]

| Metrik | Ağırlık |
| :-- | :-- |
| **Total Blocking Time (TBT)** | %30 |
| Largest Contentful Paint (LCP) | %25 |
| Cumulative Layout Shift (CLS) | %25 |
| First Contentful Paint (FCP) | %10 |
| Speed Index | %10 |

Her metrik HTTP Archive'daki gerçek site verisinden türetilen log-normal bir eğriyle 0-100 arası puana çevrilir. Renkler: 0-49 kırmızı (kötü), 50-89 turuncu (iyileştirilmeli), 90-100 yeşil (iyi).[^6] Listede INP yok: lab testi kullanıcının sayfayla ne zaman etkileşeceğini bilemez, bu yüzden yanıt verme hızı için TBT'ye bakılır. TBT iyi olup INP kötü olabilir.[^1]

> [!WARNING]
>
> Lighthouse skoru sitenizin Core Web Vitals değerlendirmesi değildir. Google Search'ün page experience sinyalinde kullandığı veri gerçek kullanıcılardan gelen CrUX verisidir.[^7]

### Skor neden her seferinde değişiyor

Aynı sayfayı iki kez denetlediğinizde farklı skor görmeniz normaldir. Değişkenliğin çoğu Lighthouse'tan değil ortamdan gelir: sayfadaki A/B testleri ve reklamlar, yerel ağ, bilgisayarın donanımı ve aynı anda çalışan uygulamalar ya da eklentiler.[^8] Lighthouse ekibinin önerisi tek sonuca değil birden fazla çalıştırmanın **medyanına** bakmaktır; 5 çalıştırmanın medyanı tek çalıştırmadan yaklaşık iki kat daha kararlıdır. Aynı makinede aynı anda birden fazla Lighthouse çalıştırmayın.[^8]

Lighthouse her testte bir CPU ölçümü de yapar, bu yüzden hızlı bir bilgisayarda skor daha yüksek çıkar. PageSpeed Insights ise sayfayı hızlı bağlantıda yükleyip yavaş ağı simüle eder ve sizin bilgisayarınızda değil Google sunucularında çalışır; DevTools'taki skorla farklı çıkmasının ana nedenleri bunlardır.[^9]

### Mobil ve masaüstü

Mobil test, orta seviye bir mobil cihazı mobil ağda simüle eder; masaüstü testi kablolu bağlantıda bir masaüstü emüle eder.[^10] Masaüstünün Lighthouse v6'dan beri kendi skor eğrisi vardır, bu yüzden iki skoru birbiriyle kıyaslamayın.[^6]

## PageSpeed insights ve CrUX

**Chrome User Experience Report (CrUX)**, Chrome kullanıcılarının popüler sitelerdeki gerçek deneyimini toplayan, Google'ın herkese açık veri setidir. Bir sayfanın ya da origin'in listede yer alması için herkese açık olması ve istatistiksel olarak anlamlı sayıda ziyaretçisi olması gerekir. Veriye PageSpeed Insights, CrUX API, BigQuery ve CrUX Vis ile ulaşılır.[^7]

**PageSpeed Insights (PSI)** (`pagespeed.web.dev`) bir URL için iki şeyi birlikte gösterir: üstte CrUX'tan gelen son 28 günlük field verisi, altta uzaktan çalıştırılan Lighthouse raporu.[^10]

- Değerler 75. persentildir; yani kullanıcıların çoğunun deneyimini temsil eder.[^10]
- Sayfa için yeterli veri yoksa PSI tüm site (**origin**) verisine düşer; origin için de yoksa field verisi hiç görünmez.[^10]

Ölçek için bir fikir: 2025'te sitelerin mobilde %48'i, masaüstünde %56'sı iyi Core Web Vitals değerlerine sahipti.[^11]

## DevTools performance paneli

Performance paneli açıldığı anda, kayıt bile almadan sayfanın yerel **LCP** ve **CLS** değerlerini canlı gösterir; sayfayla etkileştikçe **INP** de eklenir. Değerin üstüne gelince metriğin parçalara ayrılmış hali görünür.[^12] Ayrıntılı performans incelemesi için Lighthouse yerine bu panel önerilir.[^3]

- **LCP öğesi:** Canlı metrikler ekranı LCP öğesine bağlantı verir; üstüne gelince sayfada vurgulanır, tıklayınca Elements panelinde açılır.[^13]
- **Etkileşim kaydı:** DevTools açıkken yaptığınız tıklama ve tuş basışları türü, hedefi ve gecikmesiyle listelenir.[^13]
- **Field verisi:** **Field data > Set up** ile CrUX verisini çekip yerel sonucunuzla karşılaştırabilirsiniz; `localhost`'u canlı alan adınızla eşleyebilirsiniz.[^12]
- **Throttling:** Bilgisayarınız kullanıcılarınızınkinden çok daha hızlıdır. CPU yavaşlatma (ör. 20x) ve ağ ön ayarları (ör. Slow 4G) ile ölçün; field verisi bağlıysa panel kullanıcılarınızın en yaygın cihaz ve ağ koşulunu öneriyor.[^12][^13]

Bir sorunun nedenini bulmak için **Record load performance** ile sayfa yüklemesini kaydedin.[^12] Kaydın yanındaki **Insights** kenar çubuğu Lighthouse tarzı öneriler verir. Örneğin **LCP by phase** LCP süresini dört alt parçaya böler, **LCP request discovery** ise LCP görselinin ne kadar erken yüklenebileceğini gösterir.[^14] Bu bulguların nasıl düzeltileceği Görsel ve Font ile Bundle Boyutu derslerinin konusudur.

## Gerçek kullanıcıdan ölçüm

CrUX yalnızca Chrome kullanıcılarını ve yeterli trafiği olan siteleri kapsar, ayrıntılı kırılım da vermez. Kendi kullanıcılarınızdan veri toplamaya **Real User Monitoring (RUM)** denir.[^2]

### web-vitals kütüphanesi

GoogleChrome'un `web-vitals` kütüphanesi LCP, INP ve CLS gibi metrikleri gerçek kullanıcının tarayıcısında ölçüp bir callback'e verir.[^15]

```command
npm install web-vitals
```

```tsx
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, id: metric.id });
  navigator.sendBeacon('/analytics', body);
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

`sendBeacon` sayfa kapanırken bile veri gönderebildiği için tercih edilir. Kullanıcı sayfayla hiç etkileşmezse INP raporlanmaz. Hangi öğenin soruna yol açtığını görmek için `web-vitals/attribution` girişini kullanın; metriğe bir `attribution` alanı eklenir ama paket biraz büyür.[^15]

### Next.js: `useReportWebVitals`

Next.js aynı metrikleri (TTFB, FCP, LCP, CLS, INP) `next/web-vitals` içindeki `useReportWebVitals` hook'uyla verir. Hook bir Client Component'te çalışmalıdır; bu yüzden ayrı bir dosyada tutup root layout'a eklemek client sınırını o modülle sınırlar.[^16]

```tsx
// app/_components/web-vitals.tsx
'use client';

import { useReportWebVitals } from 'next/web-vitals';

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const report: ReportWebVitalsCallback = (metric) => {
  navigator.sendBeacon('/analytics', JSON.stringify(metric));
};

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
```

```tsx
// app/layout.tsx
import { WebVitals } from './_components/web-vitals';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

> [!WARNING]
>
> Callback'i component dışında tanımlayın. Her render'da değişen bir fonksiyon geçerseniz aynı metrik birden fazla kez raporlanabilir.[^16]

Metrik nesnesinde `name`, `value`, `rating` (`good`, `needs-improvement`, `poor`), `id` ve `navigationType` gibi alanlar gelir. Google Analytics gibi bir araca gönderirken `id` alanı, dağılımı ve persentilleri kendiniz hesaplamanızı sağlar.[^16]

## Detaylı öğrenmek için

- **Konuşma:** Barry Pollard ve Ewa Gasperowicz'in JSNation 2025'te yeni Performance panelini, canlı metrikleri, throttling ayarını ve Insights'ı anlattığı konuşma (29 dk).[^17]
- **Lab ve field farkı:** Philip Walton'ın LCP, CLS ve INP için iki verinin neden ayrıştığını tek tek anlattığı yazı.[^1]
- **Skor oynaklığı:** Lighthouse ekibinin değişkenlik kaynaklarını ve önerilen test ortamını listelediği doküman.[^8]
- **PSI ve Lighthouse farkı:** Matt Zeunert'in simüle ve gerçek throttling farkını açıkladığı yazı.[^9]

## Kaynaklar

1. [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences) *(doc)* — Philip Walton; lab ve field verisinin LCP, CLS ve INP için neden farklı çıktığı ve hangisine göre öncelik verileceği.
2. [Sia Karamalegos: 14 web performance tips for 2025](https://sia.codes/posts/web-perf-tips-2025/) *(article)* — Önce field verisiyle başlamak, CrUX'un sınırları ve RUM'a geçiş.
3. [Chrome DevTools: Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse) *(doc)* — Lighthouse panelini çalıştırma, Navigation/Timespan/Snapshot modları ve ayarlar.
4. [Chrome for Developers: Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0?hl=es) *(doc)* — Barry Pollard ve Connor Clark; Insights denetimlerine geçiş ve skorlamanın değişmediği.
5. [GitHub: Lighthouse v13.4.0](https://github.com/GoogleChrome/lighthouse/releases/tag/v13.4.0) *(repo)* — Haziran 2026 sürüm notları ve Chrome 151 ile DevTools'a geliş.
6. [Chrome for Developers: How Lighthouse calculates your overall Performance score](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) *(doc)* — Metrik ağırlıkları, log-normal skor eğrisi, renk aralıkları ve masaüstü skorlaması.
7. [Chrome for Developers: Overview of CrUX](https://developer.chrome.com/docs/crux) *(doc)* — CrUX'un ne olduğu, uygunluk koşulları, erişim yolları ve Search'te kullanımı.
8. [Lighthouse: Score Variability](https://github.com/GoogleChrome/lighthouse/blob/master/docs/variability.md) *(repo)* — Skor değişkenliğinin kaynakları, medyan kullanımı ve test ortamı önerileri.
9. [DebugBear (Matt Zeunert): PageSpeed Insights vs. Lighthouse](https://www.debugbear.com/blog/why-is-my-lighthouse-score-different-from-pagespeed-insights) *(article)* — DevTools ve PSI skorlarının throttling, CPU ve konum yüzünden neden farklı çıktığı.
10. [Google: About PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about) *(doc)* — Lab ve field verisi, 28 günlük CrUX dönemi, 75. persentil ve origin düzeyine düşme.
11. [HTTP Archive Web Almanac 2025: Performance](https://almanac.httparchive.org/de/2025/performance) *(research)* — 2025'te mobil ve masaüstünde iyi Core Web Vitals'a sahip site oranları.
12. [Chrome DevTools: Performance panel overview](https://developer.chrome.com/docs/devtools/performance/overview) *(doc)* — Canlı metrikler, throttling ayarları, kayıt alma ve field verisini bağlama.
13. [Chrome for Developers: Monitor your local and real-user Core Web Vitals performance in DevTools](https://developer.chrome.com/blog/devtools-realtime-cwv) *(doc)* — Rick Viscomi; canlı metrikler, LCP öğesi, etkileşim kaydı ve throttling önerileri.
14. [Chrome for Developers: Insights sidebar in the Performance panel](https://developer.chrome.com/blog/devtools-insights-sidebar?hl=nl) *(doc)* — Brendan Kenny; Insights kenar çubuğu, LCP by phase ve LCP request discovery.
15. [GitHub: GoogleChrome/web-vitals](https://github.com/GoogleChrome/web-vitals) *(repo)* — Kurulum, `onLCP`/`onINP`/`onCLS`, `sendBeacon` ile gönderme ve attribution build.
16. [Next.js: useReportWebVitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals) *(doc)* — App Router'da hook kullanımı, metrik alanları ve sonuçları dış sisteme gönderme.
17. [Barry Pollard ve Ewa Gasperowicz: Supercharge Your Debugging With the New Features in Chrome DevTools (JSNation 2025)](https://gitnation.com/contents/supercharge-your-debugging-with-the-new-features-in-chrome-devtools) *(video)* — 29 dakika; yeni Performance paneli, canlı metrikler, CrUX karşılaştırması ve Insights.
