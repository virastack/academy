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
- **Erişilebilirlik ipucu.** Testler elemanları role ve label ile bulur. Testin bulamadığı eleman, erişilebilirlik sorununun işareti olabilir. Bu bir erişilebilirlik testinin yerini tutmaz.

## Test türleri

| Tür | Ne test eder | Hız | Araç |
| --- | --- | --- | --- |
| Unit test | Tek bir fonksiyon veya hook | Çok hızlı | [!vitest] |
| Component test | Bir component veya küçük bir component grubu | Hızlı | [!vitest] + React Testing Library |
| E2E test | Gerçek tarayıcıda tüm uygulama | Yavaş | [!playwright] |

Bu rehber **component test** konusunu anlatır. Testing Trophy yaklaşımı, yatırımın büyük bölümünü birden fazla parçanın birlikte çalıştığı entegrasyon testlerine yapmayı önerir. Component test bu yaklaşıma uygundur.[^1][^2]

> [!TIP]
>
> Component test gerçek bir tarayıcıda çalışmaz. Layout, CSS ve tarayıcıya özel davranışlar için E2E test kullanın.

## Hangi araçlar kullanılır?

Bu rehberde [!react] component'lerini [!vitest] ve React Testing Library ile test edeceksiniz. Her araç tek bir iş yapar.[^3]

| Araç | Rol | Ne yapar |
| --- | --- | --- |
| [!vitest] | Test runner | Test dosyalarını bulur ve çalıştırır. `describe`, `it`, `expect` ve mock araçlarını sağlar. |
| **jsdom** | Test ortamı | Node.js içinde tarayıcı DOM'unu simüle eder. |
| **React Testing Library** | Render ve sorgu | Component'i render eder (`render`). Ekrandaki elemanları kullanıcı gibi bulur (`screen`). |
| **user-event** | Etkileşim | Tıklama ve yazma gibi kullanıcı hareketlerini simüle eder. |
| **jest-dom** | Matcher | `toBeInTheDocument` ve `toBeDisabled` gibi DOM matcher'ları ekler. |

<details>
<summary>jsdom, happy-dom ve Vitest Browser Mode</summary>

- jsdom gerçek bir tarayıcı değildir. Node.js içinde çalışan bir DOM simülasyonudur. `happy-dom` aynı işi yapan alternatif bir ortamdır. Bu rehber jsdom kullanır.[^4]
- Vitest Browser Mode testleri gerçek bir tarayıcıda çalıştırır.[^5] React için `vitest-browser-react` paketini kullanırsınız. Sorguları `page.getByRole` ile, doğrulamaları `expect.element` ile yazarsınız.[^6][^7] Layout ve CSS davranışı test etmeniz gerekiyorsa bu modu değerlendirin.

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

Testler yazılımın kullanılış biçimine ne kadar benzerse o kadar güven verir.[^8]

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

[^1]: [Kent C. Dodds: The Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) *(article)* — Statik, unit, entegrasyon ve E2E katmanları; yatırımın entegrasyona kayması.
[^2]: [Kent C. Dodds: Write tests. Not too many. Mostly integration.](https://www.youtube.com/watch?v=Fha2bVoC8SE) *(video)* — Strateji bu dersle aynıdır. Örnek araçlar Jest ve Cypress dönemine aittir.
[^3]: [Vitest: Başlangıç](https://vitest.dev/guide/) *(doc)* — Vite tabanlı test framework'ü, watch modu ve tek seferlik çalıştırma.
[^4]: [Vitest: environment](https://vitest.dev/config/environment) *(doc)* — Varsayılan `node` ortamı; jsdom ve happy-dom tarayıcı benzeri alternatifler.
[^5]: [Vitest: Browser Mode](https://vitest.dev/guide/browser/) *(doc)* — Testleri gerçek tarayıcıda çalıştırma ve sağlayıcılar.
[^6]: [Vitest: Locators](https://vitest.dev/api/browser/locators) *(doc)* — `page.getByRole` ve `vitest/browser` import'u.
[^7]: [Vitest: Component Testing](https://vitest.dev/guide/browser/component-testing) *(doc)* — `vitest-browser-react`, `render` ve `expect.element`.
[^8]: [Testing Library: Temel ilkeler](https://testing-library.com/docs/guiding-principles) *(doc)* — Testler yazılımın kullanımına ne kadar benzerse o kadar güven verir.
