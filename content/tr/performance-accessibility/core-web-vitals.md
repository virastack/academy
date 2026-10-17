---
title: "Core Web Vitals"
description: "LCP, INP ve CLS'nin ne anlama geldiği."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/core-web-vitals"
---

## Core Web Vitals Nedir

**Core Web Vitals**, Google'ın her web sayfası için ölçülmesini önerdiği üç kullanıcı deneyimi metriğidir. Her biri deneyimin ayrı bir yönünü ölçer ve gerçek kullanıcılardan toplanabilir:[^1]

| Metrik | Neyi ölçer | İyi |
| :-- | :-- | :-- |
| **Largest Contentful Paint (LCP)** | Yükleme: ana içerik ne zaman göründü | 2,5 sn veya altı |
| **Interaction to Next Paint (INP)** | Etkileşim: sayfa tıklamaya ne kadar hızlı yanıt verdi | 200 ms veya altı |
| **Cumulative Layout Shift (CLS)** | Görsel kararlılık: içerik beklenmedik şekilde kaydı mı | 0,1 veya altı |

Kısacası üç soruya cevap ararlar: sayfa hızlı açıldı mı, dokununca hemen tepki verdi mi, okurken yerinden oynadı mı?

## Eşikler ve 75. Persentil

Her metrik için üç bant vardır: **iyi**, **iyileştirilmeli** (needs improvement) ve **kötü** (poor).[^2]

| Metrik | İyi | İyileştirilmeli | Kötü |
| :-- | :-- | :-- | :-- |
| LCP | ≤ 2500 ms | 2500-4000 ms | > 4000 ms |
| INP | ≤ 200 ms | 200-500 ms | > 500 ms |
| CLS | ≤ 0,1 | 0,1-0,25 | > 0,25 |

Değerlendirme tek bir ziyarete göre yapılmaz. Bir sayfa, ziyaretlerin **75. persentilinde** eşiği tutturuyorsa o metrikte "iyi" sayılır; yani her dört ziyaretten en az üçü hedefin altında kalmalıdır. 75. persentil, ziyaretlerin çoğunu temsil ederken birkaç aşırı ölçümün sonucu bozmasını da engeller.[^2] Mobil ve masaüstü ayrı değerlendirilir ama eşikler aynıdır; mobil cihazlar daha kısıtlı olduğu için eşikler büyük ölçüde mobilin başarabileceğine göre belirlenmiştir.[^2] Bir sayfa üç metriğin üçünde de "iyi" ise Core Web Vitals'ı geçmiş olur.[^1]

## LCP: Ana İçerik Ne Zaman Göründü

**LCP**, kullanıcı sayfaya gitmeye başladığı andan, ekranda görünen en büyük içerik parçası çizilene kadar geçen süredir.[^3] Aday olabilen öğeler şunlardır:[^3]

- `<img>` ve SVG içindeki `<image>`
- `<video>` (poster görseli ya da ilk kare)
- CSS'te `url()` ile verilmiş arka plan görseli (gradient sayılmaz)
- Metin içeren blok öğeler (başlık, paragraf)

Tarayıcı, kullanıcı tıklar, kaydırır ya da bir tuşa basarsa yeni LCP adayı bildirmeyi bırakır.[^3]

**Tipik nedenler:** Yavaş sunucu yanıtı (TTFB), render'ı bloklayan CSS ve JavaScript, geç keşfedilen ya da lazy-load edilen LCP görseli ve geç yüklenen fontlar.[^3][^4] Görsel ve font tarafını [Görsel ve font](/academy/performance-accessibility/images-and-fonts) dersinde ele alıyoruz.

## INP: Sayfa Ne Kadar Hızlı Yanıt Verdi

**INP**, ziyaret boyunca yapılan tıklama, dokunma ve tuş basma etkileşimlerinin gecikmesini izler ve neredeyse hepsinin altında kaldığı tek bir değer raporlar. Hover, kaydırma ve yakınlaştırma sayılmaz.[^5] Çoğu sayfada en yavaş etkileşim raporlanır; çok etkileşimli sayfalarda her 50 etkileşimde en kötü bir tanesi göz ardı edilir.[^5]

Bir etkileşimin süresi üç parçadan oluşur:[^5]

1. **Input delay:** Olay işleyicileri çalışmaya başlayana kadar geçen bekleme.
2. **Processing duration:** `onClick` gibi işleyicilerin çalışma süresi.
3. **Presentation delay:** İşleyiciler bittikten sonra bir sonraki karenin ekrana çizilmesi.

INP, 12 Mart 2024'te **First Input Delay (FID)**'in yerini aldı.[^6] FID yalnızca ilk etkileşimin bekleme süresine bakıyordu; INP her etkileşimi, ekrana çizim bitene kadar ölçer.[^5] Bu yüzden eski yazılarda FID görürseniz artık geçerli bir Core Web Vital olmadığını bilin.

**Tipik nedenler:** Ana thread'i uzun süre meşgul eden görevler (50 ms üstü), gereğinden fazla JavaScript, büyük DOM ve React'te gereksiz yeniden render'lar.[^4][^7] Bunları [React'te render performansı](/academy/performance-accessibility/render-performance) ve [Bundle boyutu](/academy/performance-accessibility/bundle-size) derslerinde görüyoruz.

## CLS: Sayfa Yerinden Oynadı mı

**CLS**, görünen içeriğin beklenmedik şekilde kaymasını ölçer. Okurken metnin aşağı kayması ya da tam tıklarken butonun yer değiştirmesi bunun örneğidir.[^8]

Her kaymaya, ekranın ne kadarının etkilendiğine ve öğenin ne kadar uzağa gittiğine göre bir puan verilir. Birbirine yakın kaymalar (aralarında 1 saniyeden az, toplamda en fazla 5 saniye) bir grup oluşturur; CLS en kötü grubun puanıdır, sayfa boyunca biriken toplam değil.[^8] Kullanıcının tıklamasından sonraki 500 ms içindeki kaymalar beklenen kabul edilir ve sayılmaz; bir menüyü açınca içeriğin aşağı itilmesi sorun değildir.[^8]

**Tipik nedenler:** `width`/`height` verilmemiş görsel ve videolar, sonradan boyut değiştiren reklam ve embed'ler, mevcut içeriğin üstüne eklenen banner'lar ve yedek fonttan farklı boyutta çizilen web fontları.[^8][^4] Çözümlerin çoğu [Görsel ve font](/academy/performance-accessibility/images-and-fonts) dersinde.

```tsx
// Boyutu belli olmayan görsel yüklenince altındaki her şeyi iter
<img src="/kapak.jpg" alt="Kapak" />

// Tarayıcı yeri önceden ayırır, kayma olmaz
<img src="/kapak.jpg" alt="Kapak" width={1200} height={630} />
```

## Yardımcı Metrikler

**Time to First Byte (TTFB)** ve **First Contentful Paint (FCP)** Core Web Vitals değildir; yavaş sunucu ya da render'ı bloklayan kaynaklar gibi LCP sorunlarının teşhisinde kullanılır. **Total Blocking Time (TBT)** ise kullanıcı etkileşimi olmayan test ortamında INP'nin yerine bakılan bir laboratuvar metriğidir.[^1]

## Field ve Lab Verisi

**Field verisi** gerçek kullanıcıların kendi cihaz, ağ ve konumlarından toplanır; Google'ın kamuya açık veri seti **Chrome User Experience Report (CrUX)** buna örnektir. **Lab verisi** ise sayfayı sabit cihaz ve ağ ayarlarıyla, kontrollü bir ortamda yükleyerek elde edilir ve hata ayıklamak için tekrarlanabilir sonuç verir. İkisi sık sık farklı çıkar: testte önbellek boştur, kullanıcı tıklamaz ve kaydırmaz, ekran boyutuna göre LCP öğesi değişebilir. Bu yüzden ikisi de varsa öncelik field verisindedir; lab verisi geliştirme sırasında sorunu bulmaya yarar.[^9] Bu ölçümleri nereden okuyacağınızı [Ölçüm](/academy/performance-accessibility/measuring) dersinde anlatıyoruz.

> [!WARNING]
>
> INP gerçek bir kullanıcı etkileşimi ister, bu yüzden otomatik bir laboratuvar testi INP ölçemez.[^1] Lab sonucunuz iyi diye sahadaki INP'nin de iyi olduğunu varsaymayın.

Aralık 2025 itibarıyla LCP ve INP tüm büyük tarayıcılarda destekleniyor; CLS ise hâlâ yalnızca Chromium tabanlı tarayıcılarda ölçülebiliyor. CrUX da yalnızca Chrome kullanıcılarından veri topluyor.[^10]

## Neden Önemli

Asıl neden kullanıcıdır: yavaş ya da kararsız bir sayfadan sıkılan kullanıcı başka bir siteye geçebilir.[^11] Örneğin Farfetch, LCP'nin 2,5 saniyeyi aştığı her 100 ms için dönüşüm oranının yaklaşık %1,3 düştüğünü raporladı.[^12]

Arama tarafında Google, Core Web Vitals'ın sıralama sistemlerinde kullanıldığını söylüyor. Ama aynı sayfada iyi skorun en üst sırayı garanti etmediği ve Google'ın sayfa deneyimi zayıf olsa bile en alakalı içeriği göstermeye çalıştığı da yazıyor.[^13] Yani Core Web Vitals bir SEO kısayolu değil; içerik alakası her zaman önce gelir.

> [!TIP]
>
> 2025 verisine göre mobilde sitelerin yalnızca %48'i, masaüstünde %56'sı üç metriği birden geçiyor. Mobilde en zayıf halka LCP: sitelerin %62'si iyi bantta.[^14] "İyi" olmak hâlâ ortalamanın üstünde olmak demek.

## Detaylı Öğrenmek İçin

- **Resmi giriş:** web.dev'in Web Vitals sayfası; metriklerin yaşam döngüsü, yardımcı metrikler ve araç listesiyle.[^1]
- **Neden 75. persentil:** Eşiklerin nasıl ve neden belirlendiğini anlatan yazı.[^2]
- **Konuşma:** Barry Pollard'ın her metrik için en etkili üç öneriyi anlattığı 29 dakikalık konuşma (JSNation 2023).[^15]
- **Konuşma:** Andrea Verlicchi'nin gerçek sitelerdeki INP hatalarını ve çözümlerini anlattığı konuşma (We Love Speed 2024).[^16]
- **Veri:** Web Almanac 2025 Performance bölümü; metriklerin web genelinde ne durumda olduğu.[^14]

## Kaynaklar

1. [web.dev: Web Vitals](https://web.dev/articles/vitals) *(doc)* — Core Web Vitals tanımı, üç metrik, yaşam döngüsü, TTFB/FCP/TBT ve field ile lab araçları.
2. [web.dev: How the Core Web Vitals metrics thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds) *(doc)* — İyi ve kötü eşikleri, 75. persentilin gerekçesi ve mobil/masaüstü için aynı eşik.
3. [web.dev: Largest Contentful Paint (LCP)](https://web.dev/articles/lcp) *(doc)* — LCP'nin tanımı, aday öğeler ve ölçümün ne zaman durduğu.
4. [web.dev: The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv) *(doc)* — Her metrik için en etkili üç öneri ve yaygın nedenler.
5. [web.dev: Interaction to Next Paint (INP)](https://web.dev/articles/inp) *(doc)* — Sayılan etkileşimler, değerin nasıl seçildiği ve etkileşimin üç aşaması.
6. [web.dev: Advancing Interaction to Next Paint](https://web.dev/blog/inp-cwv) *(doc)* — INP'nin 12 Mart 2024'te FID'in yerine Core Web Vital olduğu duyuru.
7. [Geoff Graham: Preparing For Interaction To Next Paint, A New Web Core Vital (Smashing Magazine)](https://smashingmagazine.com/2023/12/preparing-interaction-next-paint-web-core-vital) *(article)* — INP ile FID farkı ve kötü INP'nin yaygın nedenleri.
8. [web.dev: Cumulative Layout Shift (CLS)](https://web.dev/articles/cls) *(doc)* — Kayma puanı, oturum pencereleri, beklenen kaymalar ve yaygın nedenler.
9. [web.dev: Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences) *(doc)* — Lab ve field verisinin tanımı, neden farklı çıktıkları ve hangisine öncelik verileceği.
10. [web.dev: LCP and INP are now Baseline Newly available](https://web.dev/blog/lcp-and-inp-are-now-baseline-newly-available) *(doc)* — Aralık 2025'te LCP ve INP'nin tüm büyük tarayıcılara gelmesi, CLS ve CrUX'un durumu.
11. [web.dev: Optimize Core Web Vitals for business decision makers](https://web.dev/articles/optimize-cwv-business) *(doc)* — Kullanıcı deneyiminin etkileşim, dönüşüm ve müşteri kaybına etkisi.
12. [web.dev: Farfetch case study](https://web.dev/case-studies/farfetch) *(research)* — LCP ve CLS iyileşmesinin dönüşüm ve çıkış oranıyla ilişkisi.
13. [Google Search Central: Understanding page experience in Google Search results](https://developers.google.com/search/docs/appearance/page-experience) *(doc)* — Core Web Vitals'ın sıralamadaki yeri ve iyi skorun sıralama garantisi olmadığı.
14. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — Temmuz 2025 CrUX verisiyle mobil ve masaüstünde Core Web Vitals geçme oranları.
15. [Barry Pollard: Top Core Web Vitals Recommendations for 2023 (JSNation 2023)](https://gitnation.com/contents/top-core-web-vitals-recommendations-for-2023) *(video)* — 29 dakika. LCP, CLS ve INP için üçer öneri.
16. [Andrea Verlicchi: How I made the web more responsive (We Love Speed 2024)](https://andreaverlicchi.eu/en/blog/how-i-made-web-more-responsive-inp-video-we-love-speed-2024-nantes/) *(video)* — INP'ye giriş, yavaş etkileşimleri bulma ve sahada görülen üç yaygın hata.
