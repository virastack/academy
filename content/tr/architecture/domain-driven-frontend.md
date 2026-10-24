---
title: "Domain odaklı frontend"
description: "DDD'den frontend'e ne alınır: ortak dil ve bağlam sınırları."
lastVerified: "2026-10-25"
translationKey: "architecture/domain-driven-frontend"
---

**Domain-Driven Design** *(DDD)* adını Eric Evans'ın 2003 tarihli kitabından aldı. [Martin Fowler](https://martinfowler.com) onu şöyle özetler: geliştirme, alanın süreçlerini ve kurallarını yakalayan bir modeli programlamak etrafında döner.[^1] Çoğu frontend projesi için kitabın tamamı gerekmez. İki fikir işe yarar: **ortak dil** ve **bağlam sınırları**.

## Ortak dil

DDD, alanın terimlerini yazılımın içine gömmeyi vurgular. Bu dile *ubiquitous language* denir.[^1] Frontend'de karşılığı basit: ürün ekibinin "sipariş" dediği şeye tasarımda, API'de ve kodda aynı ad verilir.

Aynı kavramın üç adı olması yaygın bir sorundur: tasarımda "sipariş", API'de `purchase`, kodda `Txn`. Her yeni gelen çeviri yapmak zorunda kalır. Önerilen alışkanlık, ürün sözlüğünü tek yerde tutmak ve tip, component ve klasör adlarını oradan almaktır. Bu öneri bu rehbere aittir.

## Bağlam sınırları

Fowler'ın örneğinde bir elektrik şirketinde "meter" kelimesi şebekeyle bir konum arasındaki bağlantıyı, şebekeyle bir müşteri arasındaki bağlantıyı ya da fiziksel cihazı anlatabilir. "Customer" ve "Product" gibi kelimelerde de aynısı olur.[^2] Evans'a göre büyük bir sistemin alan modelini tamamen birleştirmek mümkün ya da uygun maliyetli değildir. DDD sistemi **bağlamlara** *(bounded context)* böler ve her bağlamın kendi tutarlı modeli olur.[^2]

Frontend'de bu şuna dönüşür: ödeme ekranında "müşteri" teslimat adresi ve ödeme yöntemidir, destek ekranında açık taleplerdir. İkisini tek bir global `Customer` tipine toplarsanız her ekran gereksiz alanlarla dolar.

```ts
// features/checkout/types.ts
export type Customer = {
  id: string
  shippingAddress: Address
  paymentMethodId: string
}

// features/support/types.ts
export type Customer = {
  id: string
  openTickets: number
  lastContactAt: string
}
```

İki dosyada aynı adın olması bilerek. Bağlamlar çakışan modeller arasında eşleme yapar.[^2] Pratikte API cevabını her bağlamın kendi tipine çevirirsiniz. Bu rehberin eşlemesi: bağlam sınırı, [Feature-Sliced Design](/academy/architecture/feature-sliced-design) dilimi ya da özellik klasörü sınırıdır.

## FSD ile ilişkisi

FSD'nin `entities` katmanı uygulamanın çalıştığı iş kavramlarını *(kullanıcı, ürün)* taşır. Projede böyle kavramlar yoksa bu katman isteğe bağlıdır.[^3] Ortak dil bu katmanın adlandırmasını besler. Bağlam sınırları ise dilim sınırlarını belirler.

## Ne zaman gerekmez?

> [!CAUTION]
>
> Fowler DDD'yi özellikle karmaşık alanlara uygun bulur.[^1] DDD'nin ayrıntılı desenleri *(nesneleri Entity, Value Object ve Service olarak sınıflandırmak, Aggregate)* de bu kitaptan gelir.[^1] Çoğu arayüz kodunda bu desenler gereksiz ağırlıktır. Bu rehberin önerisi: basit bir CRUD panelinde yalnızca ortak dil ve ayrı tipler yeter, kalanını karmaşıklık gerçekten ortaya çıkınca düşünün.

## Kaynaklar

1. [Martin Fowler: Domain Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) *(article)* — Alan modeli, ortak dil, Entity ve Aggregate sınıflaması ve karmaşık alanlara uygunluk. 22 Nisan 2020.
2. [Martin Fowler: Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) *(article)* — Aynı kelimenin farklı bağlamlarda farklı anlam taşıması, tek birleşik modelin neden uygulanamadığı ve bağlamlar arası eşleme. 15 Ocak 2014.
3. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(doc)* — `entities` katmanı iş kavramlarını taşır, isteğe bağlıdır.
