---
title: "Desen seçimi"
description: "FSD, DDD, component-driven ve Atomic Design: hangisi hangi soruya cevap verir."
lastVerified: "2026-10-25"
translationKey: "architecture/choosing-a-pattern"
---

Önceki üç ders birbirinin alternatifi değil. Her biri farklı bir soruya cevap veriyor. Bu ders hangisini ne zaman ekleyeceğinize karar vermenize yardım eder.

## Hangi soruya cevap?

| Soru | Desen | Ders |
| --- | --- | --- |
| Kod nereye konur, kim kimi import eder? | Feature-Sliced Design | [Feature-Sliced Design](/academy/architecture/feature-sliced-design) |
| Ürünün dili kodda nasıl görünür, bir kavram nerede biter? | DDD'den ortak dil ve bağlam sınırı | [Domain odaklı frontend](/academy/architecture/domain-driven-frontend) |
| Arayüzü hangi sırayla ve nasıl kurarız? | Component-driven geliştirme | [Component-driven ve Atomic Design](/academy/architecture/component-driven-and-atomic-design) |
| Ortak UI parçalarını nasıl sınıflandırıp adlandırırız? | Atomic Design | Aynı ders |

## Kademeli ilerleyin

FSD dokümanı her büyüklükte projede kullanılabildiğini ve kademeli benimsenebileceğini söyler. Geçiş için işareti de verir: mimari sorun çıkarmaya başladığında, yani proje özellik eklemeyi yavaşlatacak kadar iç içe geçtiğinde ya da ekibe çok sayıda yeni kişi katıldığında.[^1]

Bu rehberin önerdiği sıra *(kaynaklardan biri değil)*:

1. **Özellik klasörleri ve tek yönlü import.** [Klasör Yapısı ve İsimlendirme](/academy/architecture/folder-structure) rehberindeki düzen çoğu proje için yeter.
2. **Ortak dil ve bağlam ayrımı.** Maliyeti yoktur: bir sözlük ve ayrı tipler.
3. **FSD'nin katman kuralı.** Ekip ve kod büyüyüp bağımlılıklar karışmaya başlayınca.
4. **Atomic Design sınıflandırması.** Ortak bir UI kitiniz varsa.
5. **Component-driven çalışma biçimi.** Tasarımcı ve geliştirici aynı component'ler üzerinde çalışıyorsa.

## Birlikte kullanım

Desenler çakışmaz, farklı katmanlarda çalışır. FSD'nin dokümanı dil, UI framework'ü ya da state yöneticisi konusunda kısıt koymaz.[^1] Örnek bir birleşim:

- **FSD** uygulamanın klasör yapısını ve import yönünü belirler.
- **Ortak dil** isimleri, **bağlam sınırı** da dilim sınırlarını belirler.
- **Atomic Design** `shared/ui` içindeki parçaları sınıflandırır. Frost aşama adlarının ekibe göre değiştirilebileceğini söyler.[^2]
- **Component-driven** çalışma biçimini belirler.

## Ne zaman gerekmez?

> [!CAUTION]
>
> Desen bir hedef değil araçtır. Üç soru sorun:
>
> - **Mevcut yapı bizi yavaşlatıyor mu?** FSD dokümanına göre mimari işe yarıyorsa değiştirmeye değmeyebilir.[^1]
> - **Kural otomatik kontrol ediliyor mu?** FSD, kuralları denetleyen bir linter *(Steiger)* sunar.[^1] [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberindeki gibi, yazılı kural ihlal edilir, lint kuralı edilmez.
> - **Dogmaya dönüştü mü?** Atomic Design katı bir kural değil, zihinsel bir modeldir.[^2] Aynısı diğer desenler için de geçerli.
>
> DDD'nin ayrıntılı desenleri ise özellikle karmaşık alanlara uygundur.[^3]

## Kaynaklar

1. [Feature-Sliced Design: Overview](https://feature-sliced.design/docs/get-started/overview) *(doc)* — Her büyüklükte kullanım, kademeli benimseme, geçiş işaretleri, framework kısıtı olmaması ve Steiger linter'ı.
2. [Brad Frost: Atomic Design, Chapter 2](https://atomicdesign.bradfrost.com/chapter-2/) *(book)* — Aşamaların zihinsel model olması ve adlarının değiştirilebilmesi.
3. [Martin Fowler: Domain Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html) *(article)* — DDD'nin karmaşık alanlara uygunluğu. 22 Nisan 2020.
