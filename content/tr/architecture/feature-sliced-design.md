---
title: "Feature-Sliced Design"
description: "Katmanlar, dilimler ve tek yönlü import kuralıyla frontend mimarisi."
lastVerified: "2026-10-25"
translationKey: "architecture/feature-sliced-design"
---

[Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) rehberinde özelliğe göre dizilimi gördük. **Feature-Sliced Design** *(FSD)* bunun üstüne kural ekler: kodun hangi katmana ait olduğu ve neyi import edebileceği. Bu rehber FSD'nin modelini kısaca anlatıyor, Next.js'e uyarlamasını ve [!virastack] Start'taki kullanımını gösteriyor.

## Katmanlar

FSD, frontend uygulamaları için bir mimari yöntemdir: projeyi iş gereksinimleri değişirken anlaşılır ve kararlı tutmayı hedefleyen kurallar ve kurallar topluluğu.[^1] Kod **katmanlara** ayrılır. Yukarıdan aşağıya:[^1][^2]

| Katman | Ne taşır? |
| --- | --- |
| **app** | Uygulamayı çalıştıran kod: routing, giriş noktası, global stil, provider'lar |
| **pages** | Ekranlar ya da rotalar, genelde sayfa başına bir dilim |
| **widgets** | Birden fazla sayfada kullanılan büyük, bağımsız arayüz blokları |
| **features** | Kullanıcıya iş değeri veren etkileşimler |
| **entities** | Ürünün çalıştığı iş kavramları *(kullanıcı, ürün)* |
| **shared** | İş mantığı taşımayan temel kod: API client'ı, UI kiti, yardımcılar, yapılandırma |

Eski bir **processes** katmanı da vardı. Spesifikasyon artık kullanılmamasını ve içeriğinin `features` ile `app`'e taşınmasını öneriyor.[^2] Katmanların hepsi zorunlu değil: çoğu proje en az `shared`, `pages` ve `app` kullanır, `widgets` ile `entities` isteğe bağlıdır.[^2]

## Dilim ve bölüm

Her katman **dilimlere** *(slice)* ayrılır. Dilim kodu iş alanına göre gruplar, adı serbesttir. `app` ve `shared` dilimsizdir. Dilimin içi ise teknik amaca göre **bölümlere** *(segment)* ayrılır. Yaygın adlar `ui`, `api`, `model` *(şema, store, iş mantığı)*, `lib` ve `config`'dir ama standart değildir.[^1]

```text
features/
  add-to-cart/
    ui/
    api/
    model/
    index.ts
```

## Tek kural: aşağıya doğru import

Bir katmandaki modül yalnızca kendi altındaki katmanlardan import edebilir. Aynı katmandaki dilimler de birbirini import edemez.[^1][^2] Yani `features`, `entities` ve `shared`'i bilir; tersi olmaz.

Her dilim dışarıya bir **public API** açar, genelde bir `index` dosyası. Dışarıdaki kod dilime yalnızca buradan ulaşır; böylece dilimin iç yapısı değişince geri kalan kod etkilenmez.[^3] İki uyarı: `export *` dilimin neyi sunduğunu gizler ve iç ayrıntıyı sızdırabilir, ayrıca dilim içinde göreli, dilimler arasında mutlak import kullanılmalıdır.[^3]

> [!TIP]
>
> Dokümana göre `index` dosyaları `shared/ui` ve `shared/lib`'de tree shaking'i zorlaştırabilir.[^3] Bu tartışma [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) rehberindeki "Import kuralları" bölümünde.

## Next.js ile

[!nextjs] Next.js'in `app` ve `pages` adları FSD katmanlarıyla çakışır. FSD dokümanı iki katmanı `_app` ve `_pages` diye yeniden adlandırmayı, Next.js'in `app/` klasörünü ise proje kökünde tutmayı önerir. Rota dosyaları FSD kodunu yeniden dışa aktaran ince dosyalar olur:[^4]

```text
app/                     # Next.js rotaları (kök)
  example/page.tsx       # @/_pages/example'dan re-export
src/
  _app/  _pages/  widgets/  features/  entities/  shared/
```

Bir dilim hem client hem yalnızca server'da çalışan modül içeriyorsa, server'a özel dışa aktarımları `index.ts` yerine `index.server.ts`'e koymanız önerilir.[^4]

## ViraStack Start'ta

[!virastack] Start şablonları (Next.js ve TanStack Start) "Feature-Sliced" yapıyla gelir. ViraStack AI'nın mimari kuralına göre kod önce `features/<feature>/` altında başlar. Her özellik `api`, `components`, `hooks`, `schemas`, `stores`, `types` gibi bölümleri ve bir `index.ts` *(public API)* içerir. Özellikler birbirini import etmez, dışarıdan yalnızca `index.ts` üzerinden erişilir. Rota dosyaları yalnızca veri yükler ve bir feature component'i çizer.[^5]

FSD'nin tam modelinden farkı şu: `pages`, `widgets` ve `entities` katmanları yok, ortak kod `src/` altında düz klasörlerde duruyor. Yani Start, FSD'nin **dilim ve public API** fikrini sadeleştirerek kullanıyor. FSD kademeli benimsenebildiği için bu kısmi kullanım meşru; ekip ve kod büyürse katman kuralı eklenebilir.[^1] Bu karşılaştırma bu rehberin yorumudur.

## Ne zaman gerekmez?

> [!CAUTION]
>
> FSD dokümanının kendi önerisi: mevcut mimari işe yarıyorsa değiştirmeye değmeyebilir. Yöntem uygulamalar içindir, kütüphaneler için değil. Geçiş için işaret, mimarinin sorun çıkarmaya başlamasıdır: proje özellik eklemeyi yavaşlatacak kadar iç içe geçmiş ya da ekibe çok sayıda yeni kişi katılmıştır.[^1]
>
> Küçük bir projede feature klasörleri ve tek yönlü import kuralı çoğu zaman yeter. Katman kuralını ihtiyaç doğunca ekleyin.

## Kaynaklar

1. [Feature-Sliced Design: Overview](https://feature-sliced.design/docs/get-started/overview) *(doc)* — FSD'nin tanımı, katmanlar, dilim ve bölüm, import kuralı, kademeli benimseme ve ne zaman gerekmediği.
2. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(doc)* — Katmanların görevleri, `processes`'in kullanımdan kalkması, isteğe bağlı katmanlar ve import kuralı.
3. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(doc)* — Dilimin dışa açılan sözleşmesi, `export *` ve döngüsel import uyarıları, `index` dosyalarının tree shaking etkisi.
4. [Feature-Sliced Design: Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs) *(doc)* — `app` ve `pages` çakışması, `_app` ve `_pages` adları, kökte `app/` klasörü ve `index.server.ts`.
5. [ViraStack AI: architecture.mdc](https://github.com/virastack/ai/blob/main/templates/rules/architecture.mdc) *(repo)* — Start şablonlarındaki klasör ağacı, `features/<feature>/` bölümleri ve import kuralları.
