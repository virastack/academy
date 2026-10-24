---
title: "TDD ve Test Yaklaşımları"
description: "Red-Green-Refactor döngüsü ve Testing Trophy."
lastVerified: "2026-10-24"
translationKey: "principles/tdd-and-testing"
---

**TDD** (*Test-Driven Development*, test güdümlü geliştirme), kodu yazmadan önce testi yazma yöntemidir. Örnekler saf bir fonksiyon üzerinden, ama döngü her kodda aynı. Bu rehber döngüyü, küçük bir örneği ve hangi testi yazacağınıza nasıl karar vereceğinizi anlatıyor.

## Red-Green-Refactor

Martin Fowler'ın anlatımıyla TDD üç adımdan oluşur:[^1]

1. **Red:** Henüz var olmayan işlev için başarısız bir test yazın.
2. **Green:** Testi geçirecek kadar kod yazın.
3. **Refactor:** Yeni ve eski kodu düzenleyin, yapı temiz kalsın.

Fowler refactor adımını atlamayı TDD'nin en yaygın hatası olarak anıyor. Sonuç, dağınık kod parçalarından oluşan bir yığın oluyor.[^1] Testi önce yazmanın bir faydası daha var: kodun uygulamasından önce arayüzünü düşünmek zorunda kalırsınız.[^1]

Refactoring'in kendisi [Refactoring](/academy/principles/refactoring) rehberinde.

## Canon TDD

Kent Beck, TDD'nin adımlarını *Canon TDD* yazısında beş adımda topladı:[^2]

| Adım | Ne yapılır? |
| --- | --- |
| 1 | Kapsamak istediğiniz senaryoların listesini yazın |
| 2 | Listeden **yalnızca birini** çalışan bir teste çevirin |
| 3 | Bu testi ve önceki tüm testleri geçirin. Aklınıza yeni senaryo gelirse listeye ekleyin |
| 4 | İsterseniz uygulamanın tasarımını iyileştirin (refactor) |
| 5 | Liste bitene kadar 2. adımdan tekrarlayın |

## Küçük bir örnek

Senaryo listesi: indirimsiz fiyat değişmez, %50 indirim fiyatı yarıya indirir.

```ts
// discount.test.ts
import { expect, test } from 'vitest'
import { applyDiscount } from './discount'

test('keeps the price without a discount', () => {
  expect(applyDiscount(100, 0)).toBe(100)
})
```

**Red:** `applyDiscount` henüz yok, test başarısız olur. **Green:** testi geçirecek en küçük kod:

```ts
// discount.ts
export const applyDiscount = (price: number, percent: number) => price
```

İkinci senaryoyu teste çevirin:

```ts
test('halves the price with a 50% discount', () => {
  expect(applyDiscount(100, 50)).toBe(50)
})
```

Test yine kırmızı. Şimdi gerçek mantığı yazın:

```ts
export const applyDiscount = (price: number, percent: number) =>
  price * (1 - percent / 100)
```

İki test de geçti. Refactor edilecek bir şey yok, bu adım isteğe bağlı.[^2] Testleri çalıştırmak için:

```command
npx vitest run
```

[!vitest] `vitest run` testleri izleme moduna girmeden bir kez çalıştırır. Test dosyalarının adında `.test.` ya da `.spec.` geçmesi gerekir.[^6] Kurulum için [Vitest Kurulum](/academy/vitest/setup) rehberine bakın.

## Hangi testi yazmalı?

TDD'nin "nasıl" sorusunu cevapladık. "Hangi test" sorusu için Kent C. Dodds'ın **Testing Trophy** modeli var: statik, unit, entegrasyon ve uçtan uca (E2E) katmanları. Testlerden beklenen *güven*, harcanan zamana karşılık getirdiği değerdir.[^3] Dodds'a göre yatırımın büyük bölümü entegrasyon testlerine gitmeli, çünkü güven, hız ve maliyet dengesi orada en iyi.[^4]

İlkesi şu: testleriniz yazılımın kullanılma biçimine ne kadar benzerse o kadar güven verir.[^3] Testing Library de aynı fikre dayanıyor: DOM düğümleriyle çalışır, component örneklerinin iç yapısına girmez.[^5] Testing Trophy'nin ayrıntısı [Vitest](/academy/vitest/introduction) rehberinde.

## Sık yapılan hatalar

Beck'in uyardığı hatalardan seçmeler:[^2]

- **Assertion'sız test yazmak.** Yalnızca kapsama yüzdesini artırır, hiçbir şeyi doğrulamaz.
- **Tüm senaryoları baştan teste çevirmek.** Hiçbiri geçmeden hepsini yazmak yerine birini yazıp geçirin.
- **Testi geçirmek için assertion silmek.** Testi gerçekten geçirin.
- **Beklenen değeri kodun ürettiği değerden kopyalamak.** Test, kodun ikinci bir kontrolü olmaktan çıkar.
- **Testi geçirirken refactoring yapmak.** İkisi ayrı adım.
- **Erken soyutlamak.** Tekrar bir ipucu, emir değil.

## Ne zaman gerekmez?

> [!CAUTION]
>
> TDD ve test sayısı hedef değil, araç.
>
> - **%100 kapsama kovalamayın.** Dodds'a göre belli bir noktadan sonra getirisi azalıyor ve mantığı olmayan kodu test etmeye başlıyorsunuz.[^4]
> - **İç ayrıntıları test etmeyin.** Yalnızca zor ulaşılan bir satırı kapsamak için yazılan testler güven vermiyor, refactoring'i de zorlaştırıyor.[^4]
> - **Her kod parçasında TDD'yi şart koşmayın.** Bu rehberin önerisi: iş kuralı içeren saf fonksiyonlarla başlayın. Girdisi ve çıktısı net olduğu için ilk testi yazmak kolaydır.

## Kaynaklar

1. [Martin Fowler: Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html) *(article)* — Red-Green-Refactor döngüsü, test listesi, arayüzü önce düşünmek ve refactor adımını atlamanın yaygın hata olduğu. 11 Aralık 2023.
2. [Kent Beck: Canon TDD](https://newsletter.kentbeck.com/p/canon-tdd) *(article)* — TDD'nin beş adımı ve yaygın hatalar. 11 Aralık 2023.
3. [Kent C. Dodds: The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) *(article)* — Statik, unit, entegrasyon ve E2E katmanları, güven ve maliyet dengesi, "kullanıma ne kadar benzerse o kadar güven". 3 Haziran 2021.
4. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) *(article)* — Entegrasyon testlerine ağırlık, %100 kapsamanın azalan getirisi ve iç ayrıntıları test etmenin sakıncası. 13 Temmuz 2019.
5. [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/) *(doc)* — Kullanıma benzeyen testler ve DOM düğümleriyle çalışma ilkesi.
6. [Vitest: Getting Started](https://vitest.dev/guide/) *(doc)* — `test` ve `expect`, `.test.` dosya adı, `vitest run`.
