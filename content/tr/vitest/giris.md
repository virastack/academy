---
title: "Giriş"
description: "Frontend test nedir? Hangi araçlar kullanılır?"
lastVerified: "2026-10-14"
translationKey: "vitest/giris"
---

## Frontend test nedir?

Frontend test, kodunuzun kullanıcı arayüzünde doğru çalıştığını **otomatik olarak** kontrol eder. Test, kodu çalıştırır ve sonucu beklenen sonuçla karşılaştırır. Sonuç farklıysa test *başarısız olur*.

Test şunları doğrular:

- Component doğru render edilir.
- Kullanıcı etkileşimleri doğru sonuç verir.
- Hata, boş ve yükleniyor durumları doğru görünür.

## Neden test yazılır?

- **Güvenli refactoring.** Kodu değiştirdiğinizde mevcut özellikler çalışmaya devam eder.
- **Hızlı geri bildirim.** Hatayı production'a çıkmadan önce bulursunuz.
- **Kritik akışların güvencesi.** Sepete ekleme veya giriş yapma gibi akışlar her zaman çalışır.
- **Erişilebilirlik kontrolü.** Testler elemanları role ve label ile bulur. Testin bulamadığı eleman, ekran okuyucu kullanıcıları için de bulunamaz.

## Test türleri

| Tür | Ne test eder | Hız | Araç |
| --- | --- | --- | --- |
| Unit test | Tek bir fonksiyon veya hook | Çok hızlı | [!vitest] |
| Component test | Bir component veya küçük bir component grubu | Hızlı | [!vitest] + React Testing Library |
| E2E test | Gerçek tarayıcıda tüm uygulama | Yavaş | [!playwright] |

Bu rehber **component test** konusunu anlatır. Component test, frontend testlerinin büyük bölümünü oluşturur.

> [!TIP]
>
> Component test gerçek bir tarayıcıda çalışmaz. Layout, CSS ve tarayıcıya özel davranışlar için E2E test kullanın.

## Hangi araçlar kullanılır?

Bu rehberde [!react] component'lerini [!vitest] ve React Testing Library ile test edeceksiniz. Her araç tek bir iş yapar.

| Araç | Rol | Ne yapar |
| --- | --- | --- |
| [!vitest] | Test runner | Test dosyalarını bulur ve çalıştırır. `describe`, `it`, `expect` ve mock araçlarını sağlar. |
| **jsdom** | Test ortamı | Node.js içinde tarayıcı DOM'unu simüle eder. |
| **React Testing Library** | Render ve sorgu | Component'i render eder (`render`). Ekrandaki elemanları kullanıcı gibi bulur (`screen`). |
| **user-event** | Etkileşim | Tıklama ve yazma gibi kullanıcı hareketlerini simüle eder. |
| **jest-dom** | Matcher | `toBeInTheDocument` ve `toBeDisabled` gibi DOM matcher'ları ekler. |

<details>
<summary>jsdom, happy-dom ve Vitest Browser Mode</summary>

<ul>
<li>jsdom gerçek bir tarayıcı değildir. Node.js içinde çalışan bir DOM simülasyonudur. `happy-dom` daha hızlı bir alternatiftir. Bu rehber jsdom kullanır.</li>
<li>Vitest Browser Mode testleri gerçek bir tarayıcıda çalıştırır. React için `vitest-browser-react` paketini kullanırsınız. Sorguları `page.getByRole` ile, doğrulamaları `expect.element` ile yazarsınız. Layout ve CSS davranışı test etmeniz gerekiyorsa bu modu değerlendirin.</li>
</ul>

</details>

## Neyi test etmeli?

### Test edin

> [!DO]
>
> - Kullanıcının ekranda gördüğü şeyler.
> - Kullanıcının yaptığı işlemler (tıklama, yazma, gönderme).
> - Hata, boş ve yükleniyor durumları.

### Test etmeyin

> [!DONT]
>
> - Component'in iç state adları ve iç fonksiyonları.
> - Üçüncü taraf kütüphanelerin kendi davranışı.
> - CSS görünümü.

## Bu rehberde ne yapacaksınız?

Tüm örnekler bir e-ticaret sayfasından gelir. Küçük bir component ile başlarsınız. Her grupta sayfa büyür.

| Grup | Test edilen parça |
| --- | --- |
| Başlangıç | Ürün kartı |
| Component Testi | Ürün listesi: yükleme, arama, kupon formu |
| İleri Seviye | Sepet: API, Provider ve hook |

Her grup bir **Proje** ile biter. Proje, o gruptaki konuları gerçek bir senaryoda tekrar eder.

## Kendin dene

Projenizden bir ürün kartı veya benzeri bir component seçin. Kağıda şunları yazın:

- Kullanıcının bu component'te gördüğü 2 şey.
- Kullanıcının yapabildiği 1 işlem ve beklenen sonucu.
- Test **etmeyeceğiniz** 1 şey.

- [Vitest: Başlangıç](https://vitest.dev/guide/)
- [Testing Library: Temel ilkeler](https://testing-library.com/docs/guiding-principles)

## Ek kaynaklar

1. [Kent C. Dodds: The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) *(article)*
2. [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://www.youtube.com/watch?v=Fha2bVoC8SE) *(video)* — Strateji bu dersle aynıdır. Örnek araçlar Jest ve Cypress dönemine aittir.
