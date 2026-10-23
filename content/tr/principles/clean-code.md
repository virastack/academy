---
title: "Clean Code ve Temel Prensipler"
description: "DRY, KISS ve YAGNI: ne zaman işe yarar, ne zaman abartılır."
lastVerified: "2026-10-23"
translationKey: "principles/clean-code"
---

Bu rehber frontend geliştiriciler için yazıldı. Örnekler [!react] ve [!typescript] ile, ama fikirler her dilde geçerli. Üç kısa prensip öğreneceksiniz: DRY, KISS ve YAGNI. Her biri bir soruya cevap veriyor.

## Clean Code neyi hedefler?

Çalışan kod yetmez. [Robert C. Martin](https://blog.cleancoder.com)'in *Clean Code* kitabının çıkış noktası şu: temiz olmayan kod çalışsa bile bir geliştirme ekibini çökertebilir.[^1] Kitap iyi ile kötü kodu ayırmayı, anlaşılır isim ve fonksiyon yazmayı öğretiyor.[^1]

Bu derste anlatılan üç prensip bu hedefin parçaları. Hepsi aynı soruya çıkıyor: bu kod yarın değiştirilmesi gerektiğinde kolay mı olacak?

## DRY: Aynı bilgiyi bir yerde tutun

*The Pragmatic Programmer* kitabındaki tanım: her bilgi parçasının sistemde tek, net ve yetkili bir temsili olmalı.[^2] Buradaki anahtar kelime **bilgi**. DRY, benzer görünen satırları birleştirmek demek değil.

```ts
// ❌ Aynı kural üç dosyada
const free = total >= 500 // CartPage.tsx
const isFree = price > 499 // CartSummary.tsx
const shippingFree = sum >= 500 // Checkout.tsx

// ✅ Kural tek yerde
export const FREE_SHIPPING_THRESHOLD = 500
export const hasFreeShipping = (total: number) => total >= FREE_SHIPPING_THRESHOLD
```

Eşik değişince tek dosyayı değiştirirsiniz. Üç dosya ise biri unutulduğunda tutarsız davranır.

Tersi de var: iki kod parçası bugün aynı görünüyor ama farklı sebeplerle değişecekse, birleştirmek sorun çıkarır. [Kent C. Dodds](https://kentcdodds.com)'ın AHA ilkesi bunu söylüyor: tekrar gerçekten görülene ve neyin değiştiği anlaşılana kadar soyutlamayı bekletin.[^5] Yanlış soyutlamanın nasıl oluştuğunu [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) rehberinde anlatmıştık.

## KISS: Sade tutun

İşi gören en basit çözümü seçin. [Martin Fowler](https://martinfowler.com)'ın aktardığı Kent Beck'in basit tasarım kurallarının sonuncusu bunu söylüyor: ilk üç kurala hizmet etmeyen her şeyi çıkarın.[^4] *The Pragmatic Programmer* da aynı yönde: sade kodda hata saklanacak yer azalır.[^2]

Frontend'de en sık görülen karmaşıklık, gereksiz state ve Effect:

```tsx
// ❌ Fazladan state ve Effect
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✅ Render sırasında hesaplayın
const fullName = firstName + ' ' + lastName
```

React dokümanına göre gereksiz Effect'leri kaldırmak kodu daha hızlı, takibi kolay ve daha az hata yapan hâle getirir.[^6] Sade, kısa demek değil: bir satırlık zekice kod, üç satırlık açık koddan daha zor okunur. Beck'in ikinci kuralı da niyeti açık göstermek.[^4]

## YAGNI: İhtiyaç olmadan yapmayın

*You Aren't Gonna Need It*: henüz gerekmeyen bir yeteneği, ileride lazım olur diye şimdi eklemeyin. Fowler dört maliyet sayıyor: yazma maliyeti, ertelenen gerçek işin maliyeti, kodu taşımanın maliyeti ve yanlış yazıldıysa onarım maliyeti.[^3]

```tsx
// ❌ Tek bir tablo için 15 proptan oluşan genel DataTable
<DataTable columns={columns} sortable filterable paginated groupBy="status" />

// ✅ Bugün gereken
<ProductTable products={products} />
```

Genel bileşeni ikinci tablo gerçekten gelince çıkarırsınız. O zaman neyin ortak olduğunu bilirsiniz.

YAGNI "kodu değiştirmeyi kolaylaştırma" demek değil. Fowler açıkça belirtiyor: bu prensip yalnızca henüz gerekmeyen özellik için eklenen yetenekleri kapsıyor, refactoring buna aykırı değil.[^3]

## Ne zaman uygulamayın?

> [!CAUTION]
>
> Bu prensipler kural değil, karar yardımcısı. Abartılırsa zarar verir.
>
> - **DRY'ı zorlamayın.** Birleştirdiğiniz kod her yeni kullanımda parametre ve koşul eklemeye başlıyorsa tekrar etmek daha ucuzdur.[^5]
> - **KISS'i "az satır" sanmayın.** Sade olan, okuyanın kolay anlayandır.[^4]
> - **YAGNI her hazırlığı yasaklamaz.** Gelecek ihtiyaca hazırlık karmaşıklık eklemiyorsa YAGNI devreye girmez.[^3]
> - **Beck'in kuralları öncelik sırasıyla çalışır.** "Testler geçsin" kuralı "tekrar olmasın" kuralından önce gelir.[^4]

## Kaynaklar

1. [Clean Code: A Handbook of Agile Software Craftsmanship](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship/P200000009044/9780132350884) *(book)* — Robert C. Martin, 2008. Temiz olmayan kodun ekibi yavaşlatması, anlaşılır isim ve fonksiyon yazma.
2. [The Pragmatic Programmer: Tips](https://pragprog.com/tips/) *(doc)* — DRY tanımı (bilginin tek ve yetkili temsili) ve sade kodun hata alanını daraltması.
3. [Martin Fowler: Yagni](https://martinfowler.com/bliki/Yagni.html) *(article)* — Henüz gerekmeyen yetenek için dört maliyet. Refactoring ve kodu değiştirilebilir tutma Yagni'ye aykırı değil. 26 Mayıs 2015.
4. [Martin Fowler: Beck Design Rules](https://martinfowler.com/bliki/BeckDesignRules.html) *(article)* — Kent Beck'in dört basit tasarım kuralı, öncelik sırası ve "Once and Only Once". 2 Mart 2015.
5. [Kent C. Dodds: AHA Programming](https://kentcdodds.com/blog/aha-programming) *(article)* — Aceleci soyutlamadan kaçınma: tekrar anlaşılana kadar bekleme. 22 Haziran 2020.
6. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — Türetilmiş değeri render sırasında hesaplama, gereksiz Effect'in maliyeti.
