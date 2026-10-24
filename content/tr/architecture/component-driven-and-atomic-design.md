---
title: "Component-driven ve Atomic Design"
description: "Arayüzü alttan yukarı kurmak ve ortak UI parçalarını sınıflandırmak."
lastVerified: "2026-10-25"
translationKey: "architecture/component-driven-and-atomic-design"
---

İkisi de arayüzü küçük parçalardan kurar ama farklı sorulara cevap verir. **Component-driven geliştirme** nasıl çalışacağınızı, **Atomic Design** parçaları nasıl sınıflandırıp adlandıracağınızı anlatır.

## Component-driven geliştirme

Component-driven geliştirme, arayüzü modüler component'lerden alttan yukarı kurma pratiğidir. Önce temel component'ler yapılır, sonra ekranlarda birleştirilir.[^1] Süreç dört adımdır:[^1]

1. **Component'leri izole kurun.** Her birinin durumlarını tek tek tanımlayın.
2. **Birleştirin.** Küçük parçalardan form, başlık, liste ve tablo gibi büyük parçalar kurun.
3. **Sayfaları kurun.** Ulaşması zor durumları taklit etmek için sahte veri kullanın.
4. **Bağlayın.** Sayfaları veri, iş mantığı ve backend API'lerine bağlayın.

Sitenin kendi iddiasına göre bu yaklaşım kaliteyi artırır *(component'ler izole test edilir)*, hataları daha kolay bulur *(hata ekran yerine component düzeyinde aranır)*, hızlandırır *(kütüphaneden yeniden kullanım)* ve ekibin işi paralel yürütmesini sağlar.[^1] Site Chromatic ve bir açık kaynak topluluğu tarafından yürütülüyor, yani bu faydalar yöntemin savunucularının anlatımıdır.[^1]

Component'leri izole doğrulamak için [Vitest](/academy/vitest/introduction) rehberindeki component testleri kullanılabilir.

## Atomic Design

[Brad Frost](https://bradfrost.com) arayüz tasarım sistemi için beş aşama önerir:[^2]

| Aşama | Ne? | Örnek |
| --- | --- | --- |
| **Atom** | Daha fazla bölününce işlevini yitiren temel öğe | Etiket, input, buton |
| **Molekül** | Birlikte çalışan basit atom grubu | Etiket, input ve butondan arama formu |
| **Organizma** | Moleküllerden ve atomlardan kurulan karmaşık bölüm | Site başlığı, ürün grid'i |
| **Şablon** | İçeriksiz sayfa düzeni | Sayfanın içerik yapısı |
| **Sayfa** | Gerçekçi içerikle doldurulmuş şablon | Sepette 1 ve 10 ürünle sayfa |

Frost bunun bir zihinsel model olduğunu, doğrusal bir süreç olmadığını söyler: tasarımcı parçalarla bütün arasında gidip gelir. Katı bir dogma da değildir, ekipler aşamaların adlarını kendi organizasyonuna göre değiştirebilir.[^2]

## Klasör yapısına dönüştürürken

`atoms/`, `molecules/` ve `organisms/` klasörleri **türe göre** dizilimdir. Bir özelliğin kodunu tek yerde bulma avantajını götürür. Bu tartışma [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) rehberindeki "Tür mü, özellik mi?" bölümünde.

Bu rehberin önerisi: Atomic Design'ın sözcüklerini ortak UI kitini *(`shared/ui`)* sınıflandırmak için kullanın, özellik koduna uygulamayın. Frost aşama adlarını değiştirmeye izin verdiği için bu kullanım yöntemin ruhuna aykırı değil.[^2]

## Ne zaman gerekmez?

> [!CAUTION]
>
> Atomic Design katı bir dogma değildir.[^2] Ortak component kitiniz ya da tasarım sisteminiz yoksa beş aşamaya bölmek yalnızca yük getirir. Aynı şekilde, tek kullanımlık küçük bir component için izole geliştirme adımları gereksiz olabilir. Bu da bu rehberin önerisidir.

## Kaynaklar

1. [Component Driven: Component-Driven Development](https://www.componentdriven.org/) *(doc)* — Alttan yukarı geliştirme, dört adımlı süreç ve savunulan faydalar. Site Chromatic ve topluluk tarafından yürütülüyor.
2. [Brad Frost: Atomic Design, Chapter 2](https://atomicdesign.bradfrost.com/chapter-2/) *(book)* — Atom, molekül, organizma, şablon ve sayfa aşamaları, zihinsel model olduğu ve aşama adlarının değiştirilebileceği.
