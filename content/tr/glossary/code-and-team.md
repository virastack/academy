---
title: "Kod ve takım"
description: "PR ve code review kültürü, tech debt, release ve versiyonlama."
lastVerified: "2026-10-16"
translationKey: "glossary/code-and-team"
---

## Pull Request ve Code Review

**Pull request (PR)**, yazdığınız kod değişikliğini ana koda eklemeden önce takıma sunduğunuz değişiklik teklifidir.[^1] **Code review** (kod incelemesi) ise takım arkadaşlarınızın bu değişikliği okuyup yorum yaptığı ve onayladığı süreçtir. Amaç hataları erkenden yakalamak, kodun okunabilir kalmasını sağlamak ve bilgiyi takım içinde yaymaktır.

Sağlıklı bir review kültüründe PR'lar küçük tutulur, çünkü büyük bir değişikliği dikkatle incelemek zordur.[^2] Yorumlar kişiye değil koda yöneliktir ve neden önerildiğini açıklar.[^3] Review beklemek işi yavaşlattığı için takımlar genellikle review'lara hızlı dönmeyi bir alışkanlık hâline getirir.[^4]

## Tech Debt (Teknik Borç)

**Tech debt**, bugün işi hızlı bitirmek için seçilen kısa yolların ileride ek iş çıkarması durumudur. Eski bir kütüphaneyi güncellememek, testsiz kod yazmak ya da geçici bir çözümü kalıcı bırakmak buna örnektir. Finansal borca benzer: ödemezseniz faizi büyür, yani sonraki her değişiklik daha yavaş ve riskli hâle gelir.[^5]

Her teknik borç kötü değildir. Takımlar bilinçli olarak borç alabilir, önemli olan **bunu görünür kılmaktır**.[^5] Genellikle borç için ticket açılır ve sprint içinde belirli bir pay ayrılarak ödenir.

## Release (Sürüm Çıkarma)

**Release**, kodun kullanıcıya ulaşması için canlıya alınmasıdır. Bazı takımlar belirli aralıklarla toplu release yapar, bazıları değişiklikler hazır oldukça günde birkaç kez canlıya çıkar. **Sık ve küçük release'ler**, bir sorun çıktığında nedenini bulmayı ve düzeltmeyi kolaylaştırır.[^6]

## Versiyonlama

Versiyonlama, her release'e bir numara vermektir. En yaygın yöntem **Semantic Versioning**'dir (Anlamsal Versiyonlama) ve numara `MAJOR.MINOR.PATCH` biçimindedir.

`MAJOR` sürüm, eski kullanımı bozan uyumsuz bir değişiklik yapıldığında artar. `MINOR` sürüm, geriye dönük uyumlu yeni bir özellik eklendiğinde, `PATCH` sürüm ise geriye dönük uyumlu bir hata düzeltmesi yapıldığında artar.[^7]

Örneğin `2.4.1` sürümüne bir hata düzeltmesi gelirse `2.4.2`, yeni bir özellik gelirse `2.5.0`, uyumsuz bir değişiklik gelirse `3.0.0` olur. `0.y.z` sürümleri ilk geliştirme aşamasındadır ve her şey değişebilir.[^7] [!npm] paketlerinde sürüm numarası bu yönteme göre okunur, bu yüzden bir paketin `MAJOR` sürümünü yükseltirken değişiklik notlarını okumak gerekir.[^8]

## Kaynaklar

1. [GitHub Docs: About pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) *(doc)* — PR'ın kod değişikliklerini bir projeye birleştirme önerisi olması ve inceleyicilerin yorum yapması.
2. [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html) *(doc)* — Küçük değişikliklerin daha hızlı ve daha dikkatli incelendiği.
3. [Google Engineering Practices: How to write code review comments](https://google.github.io/eng-practices/review/reviewer/comments.html) *(doc)* — Yorumların kişiye değil koda yapılması ve gerekçenin açıklanması.
4. [Google Engineering Practices: Speed of Code Reviews](https://google.github.io/eng-practices/review/reviewer/speed.html) *(doc)* — Yavaş review'ların takım hızını düşürdüğü.
5. [Martin Fowler: Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) *(article)* — Borcun faizi, anaparanın kademeli ödenmesi ve bilinçli borç.
6. [DORA: Working in small batches](https://dora.dev/capabilities/working-in-small-batches/) *(research)* — Küçük partilerin geri bildirimi kısaltması, sorunları ayıklamayı ve gidermeyi kolaylaştırması.
7. [Semantic Versioning 2.0.0](https://semver.org/) *(doc)* — Anlamsal sürümleme kuralları: MAJOR, MINOR, PATCH ve 0.y.z sürümleri.
8. [npm Docs: About semantic versioning](https://docs.npmjs.com/about-semantic-versioning) *(doc)* — npm paketlerinde MAJOR, MINOR, PATCH ve `^`, `~` davranışı.
