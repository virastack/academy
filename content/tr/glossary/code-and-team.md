---
title: "Kod ve Takım"
description: "PR ve code review kültürü, tech debt, release ve versiyonlama."
lastVerified: "2026-10-16"
translationKey: "glossary/code-and-team"
---

## Pull Request ve Code Review

**Pull request (PR)**, yazdığınız kod değişikliğini ana koda eklemeden önce takıma sunduğunuz değişiklik teklifidir. **Code review** (kod incelemesi) ise takım arkadaşlarınızın bu değişikliği okuyup yorum yaptığı ve onayladığı süreçtir. Amaç hataları erkenden yakalamak, kodun okunabilir kalmasını sağlamak ve bilgiyi takım içinde yaymaktır.

Sağlıklı bir review kültüründe PR'lar küçük tutulur, çünkü büyük bir değişikliği dikkatle incelemek zordur. Yorumlar kişiye değil koda yöneliktir ve neden önerildiğini açıklar. Review beklemek işi yavaşlattığı için takımlar genellikle review'lara hızlı dönmeyi bir alışkanlık hâline getirir.

## Tech Debt (Teknik Borç)

**Tech debt**, bugün işi hızlı bitirmek için seçilen kısa yolların ileride ek iş çıkarması durumudur. Eski bir kütüphaneyi güncellememek, testsiz kod yazmak ya da geçici bir çözümü kalıcı bırakmak buna örnektir. Finansal borca benzer: ödemezseniz faizi büyür, yani sonraki her değişiklik daha yavaş ve riskli hâle gelir.

Her teknik borç kötü değildir. Takımlar bilinçli olarak borç alabilir, önemli olan **bunu görünür kılmaktır**. Genellikle borç için ticket açılır ve sprint içinde belirli bir pay ayrılarak ödenir.

## Release (Sürüm Çıkarma)

**Release**, kodun kullanıcıya ulaşması için canlıya alınmasıdır. Bazı takımlar belirli aralıklarla toplu release yapar, bazıları değişiklikler hazır oldukça günde birkaç kez canlıya çıkar. **Sık ve küçük release'ler**, bir sorun çıktığında nedenini bulmayı ve geri almayı kolaylaştırır.

## Versiyonlama

Versiyonlama, her release'e bir numara vermektir. En yaygın yöntem **Semantic Versioning**'dir (Anlamsal Versiyonlama) ve numara `MAJOR.MINOR.PATCH` biçimindedir.

`MAJOR` sürüm, eski kullanımı bozan uyumsuz bir değişiklik yapıldığında artar. `MINOR` sürüm, geriye dönük uyumlu yeni bir özellik eklendiğinde, `PATCH` sürüm ise geriye dönük uyumlu bir hata düzeltmesi yapıldığında artar.[^1]

Örneğin `2.4.1` sürümüne bir hata düzeltmesi gelirse `2.4.2`, yeni bir özellik gelirse `2.5.0`, uyumsuz bir değişiklik gelirse `3.0.0` olur. `0.y.z` sürümleri ilk geliştirme aşamasındadır ve her şey değişebilir.[^1] [!npm] paketlerinde sürüm numarası bu yönteme göre okunur, bu yüzden bir paketin `MAJOR` sürümünü yükseltirken değişiklik notlarını okumak gerekir.

## Kaynaklar

1. [Semantic Versioning 2.0.0](https://semver.org/) *(doc)* — Anlamsal sürümleme kuralları: MAJOR, MINOR, PATCH ve 0.y.z sürümleri.
