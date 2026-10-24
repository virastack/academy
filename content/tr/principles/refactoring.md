---
title: "Refactoring"
description: "Davranışı koruyarak kodu küçük adımlarla iyileştirme."
lastVerified: "2026-10-24"
translationKey: "principles/refactoring"
---

Çalışan bir component'e yeni bir özellik eklemek istiyorsunuz ama kod buna uygun değil. Ya kodu olduğu gibi zorlarsınız ya da önce düzenlersiniz. Bu rehber ikincisini anlatıyor: refactoring. Örnekler frontend koduyla, ama fikirler her dilde geçerli.

## Refactoring nedir?

[Martin Fowler](https://martinfowler.com)'a göre refactoring, mevcut kodu dışarıdan görünen davranışını değiştirmeden iç yapısını düzenlemektir. Küçük ve düşük riskli adımlardan oluşur, sistem her adımdan sonra çalışır durumda kalır. Bu adımları zincirlemek büyük bir yeniden yapılanmayı da getirebilir.[^1]

İki sonuç çıkar:

- Refactoring **yeniden yazmak değil**. Kodu bir kerede sökmezsiniz, adım adım değiştirirsiniz.
- Davranışı değiştiren bir adım refactoring sayılmaz.[^1]

Tanım ve testle güvence altına alma [Proje Yapısını Düzenleme](/academy/architecture/restructure-project) rehberinde uygulamalı anlatılıyor. Burada tekrar etmiyoruz.

## Üç temel adım

Fowler'ın refactoring kataloğu adımları tek tek adlandırıp listeliyor.[^2] Frontend'de en sık işinize yarayacak üçü:

| Adım | Ne yapar? |
| --- | --- |
| **Rename Variable** | Değişkenin amacını daha iyi anlatan bir isim verir[^2] |
| **Extract Function** | Kod parçasını kendi adı olan bir fonksiyona taşır. Tersi **Inline Function**[^2] |
| **Decompose Conditional** | Karmaşık bir koşulu ve dallarını ayrı, iyi adlandırılmış fonksiyonlara böler[^2] |

```ts
// Önce
let a = height * width

// Sonra: Rename Variable
let area = height * width
```

```ts
// Önce
const charge = isBetween(date, plan.summerStart, plan.summerEnd)
  ? quantity * plan.summerRate
  : quantity * plan.regularRate + plan.regularServiceCharge

// Sonra: Decompose Conditional
const charge = isSummer(date, plan)
  ? summerCharge(quantity, plan)
  : regularCharge(quantity, plan)
```

İkinci örnekte kod artık *nasıl* hesapladığını değil, *neyi* kontrol edip *ne* yaptığını söylüyor. Her adımdan sonra uygulamayı çalıştırın ya da testleri koşun, davranış aynı kalmalı.

## Ne zaman refactor etmeli?

**Koku gördüğünüzde.** Fowler'a göre *code smell*, kodun yüzeyindeki bir işaret: genellikle daha derindeki bir soruna karşılık gelir. Ama koku tek başına kötü değildir. Bazı uzun metotlar sorunsuzdur.[^3] Yani "bu component uzun" demek tek başına refactor için yeterli sebep değil. Neden sorun olduğuna bakın.

**Yeni özellikten önce.** Kent Beck'in sözüyle: önce değişikliği kolaylaştırın, sonra kolay değişikliği yapın. Fowler bunu *preparatory refactoring* diye anlatıyor: mevcut yapı yeni özelliği eklemeyi zorlaştırıyorsa önce yapıyı hazırlarsınız.[^4]

```tsx
// Hedef: ProductCard'a indirim rozeti eklemek.
// Fiyat hesabı JSX'in içinde dağınık duruyor.

// 1. Önce refactor: hesabı fonksiyona taşıyın, testler yine geçmeli
function getPrice(product: Product) {
  return product.price * (1 - product.discountPercent / 100)
}

// 2. Sonra özellik: rozet artık kolay eklenir
{product.discountPercent > 0 && <Badge>%{product.discountPercent} indirim</Badge>}
```

## Testlerle birlikte

Refactoring sırasında davranışın aynı kaldığını testten anlarsınız. [Kent C. Dodds](https://kentcdodds.com)'a göre kodu refactor ettiğinizde testi değiştirmeniz çok nadir olmalı. Component'in iç ayrıntılarını test eden testler, kod sağlıklı olsa bile refactoring'de kırılır ve işi zorlaştırır.[^5] Kullanıcının gördüğüne bakan testler yazın. Bunun nasıl yapıldığı [Vitest](/academy/vitest/introduction) rehberinde.

## Ne zaman gerekmez?

> [!CAUTION]
>
> Refactoring her zaman yapılacak iş değil.
>
> - **Her koku sorun değil.** Uzun ama anlaşılır bir yapı olduğu gibi kalabilir.[^3]
> - **Yeni özellik ile refactoring'i karıştırmayın.** Davranışı değiştiren adım refactoring değildir.[^1] Bu rehberin önerisi: ikisini ayrı adımlarda, mümkünse ayrı commit'lerde yapın.
> - **Dokunmanıza gerek olmayan koda dokunmayın.** Çalışan, değişmeyecek bir dosyayı yalnızca beğenmediğiniz için düzenlemek risk ekler. Bu da rehberin önerisi.

## Kaynaklar

1. [refactoring.com](https://refactoring.com/) *(doc)* — Fowler'ın sitesi: refactoring'in tanımı (davranışı koruyarak iç yapıyı düzenleme), küçük adımlar ve kataloğa giriş.
2. [Refactoring Catalog](https://refactoring.com/catalog/) *(doc)* — Rename Variable, Extract Function, Inline Function ve Decompose Conditional adımlarının tanımları.
3. [Martin Fowler: Code Smell](https://martinfowler.com/bliki/CodeSmell.html) *(article)* — Kokun daha derindeki sorunun yüzey işareti olduğu ve tek başına kötü olmadığı. 9 Şubat 2006.
4. [Martin Fowler: Preparatory Refactoring](https://martinfowler.com/articles/preparatory-refactoring-example.html) *(article)* — Yeni özellikten önce yapıyı hazırlama ve Kent Beck'in "önce değişikliği kolaylaştır" sözü. 5 Ocak 2015.
5. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) *(article)* — İç ayrıntıları test etmenin refactoring'i zorlaştırması ve refactor'da testi nadiren değiştirme ilkesi. 13 Temmuz 2019.
