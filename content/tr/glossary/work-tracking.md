---
title: "İş Takibi"
description: "Jira, ticket yazma, backlog, önceliklendirme ve estimation."
lastVerified: "2026-10-16"
translationKey: "glossary/work-tracking"
---

## Jira ve ticket

[!jira], takımların işlerini planlayıp takip ettiği bir proje yönetim aracıdır.[^1] Aracın içindeki her iş kaydına ticket (ya da issue, iş kaydı) denir. Bir ticket bir hata düzeltmesi, yeni bir özellik ya da küçük bir görev olabilir. Aynı işi yapan başka araçlar da vardır, örneğin [!linear] ve [!azuredevops], ama kavramlar büyük ölçüde aynıdır.

Ticket'lar genellikle şu türlere ayrılır: büyük bir hedefi temsil eden **epic**, kullanıcıya görünen bir özelliği anlatan **story**, teknik bir iş olan **task** ve yanlış çalışan bir şeyi bildiren **bug**.

## Ticket yazma

İyi bir ticket, onu hiç görmemiş biri açtığında ne yapılacağını anlayabilmesini sağlar. Genellikle şunları içerir: kısa ve net bir başlık, işin neden gerekli olduğu, kabul kriterleri (işin ne zaman bitmiş sayılacağı) ve bir hataysa nasıl yeniden üretileceği. Kabul kriterleri belirsiz bir ticket, geliştirici ile istek sahibi arasında "bitti mi, bitmedi mi" tartışmasına yol açar.

## Backlog

Backlog (iş listesi), yapılması planlanan tüm işlerin sıralı listesidir. Scrum Guide Product Backlog'u ürünü geliştirmek için gerekenlerin sıralı listesi olarak tanımlar.[^2] Backlog sabit bir liste değildir, ürün ve ihtiyaçlar değiştikçe sürekli güncellenir. Scrum'da sprint başında backlog'un en üstündeki işlerden bir kısmı o sprintin işi olarak seçilir.[^2]

## Önceliklendirme

Önceliklendirme, backlog'daki işlerin hangisinin önce yapılacağına karar vermektir. Scrum'da bu karar Product Owner'a (Ürün Sahibi) aittir.[^2] Genel ölçüt, bir işin kullanıcıya ya da işe sağlayacağı değer ile onu yapmanın maliyetini birlikte değerlendirmektir. Canlıdaki bir hata genellikle yeni bir özellikten önce gelir.

Bir iş de önceliğe göre aşamalara (faz) bölünebilir. Örneğin bir ödeme özelliğinde kredi kartıyla ödeme ilk fazda yapılır, Masterpass ile ödeme ise 2. faza bırakılır. Böylece kullanıcıya değer katan kısım daha erken teslim edilir. Faz bölümüne karar verirken Product Owner gerekirse müşteriyle ya da paydaşlarla görüşür, ama kararı önceliklere göre kendisi verir.[^2] Faz, Scrum'a ait bir terim değil, planlamada yaygın kullanılan bir yöntemdir.

## Estimation (Tahmin)

Estimation, bir işin ne kadar büyük, karmaşık ve riskli olduğunu önceden tahmin etmektir. Amaç tam süre vermek değil, sprinte ne kadar işin sığacağını öngörmektir. İşin büyüklüğünü, işi yapacak geliştiriciler belirler. Product Owner onlara öncelikleri ve ödünleşimleri (trade-off) anlatarak etkileyebilir ama puanı kendisi vermez.[^2]

Takımlar çoğunlukla saat yerine **story point** kullanır. Puanlar genellikle Fibonacci dizisine dayanır: 1, 2, 3, 5, 8, 13, 21. Sayılar büyüdükçe aralarındaki fark açılır. Bu, iş büyüdükçe belirsizliğin de arttığını gösterir ve büyük işler için "13 mü 14 mü" diye tartışmanın anlamsız olduğunu hatırlatır. Story point ve Fibonacci Scrum Guide'da geçmez, ama Agile takımlarda çok yaygın bir pratiktir.

Takımlar genellikle kendi eşik değerini belirler, örneğin 13 ya da 21 puan. Bu puanın üzerinde çıkan işin tek sprintte bitmesi riskli görüldüğü için daha küçük parçalara bölünür ve sprinte bu şekilde alınır. Eşik bir kural değil, takımın kendi kararıdır. Scrum Guide ise bir sprintte bitirilebilecek işlerin sprint planlamasında seçilmeye hazır sayıldığını söyler.[^2]

## Kaynaklar

1. [Atlassian: Jira Basics](https://www.atlassian.com/software/jira/guides/getting-started/basics) *(doc)* — Jira'nın ne olduğu ve iş kayıtlarının takipte nasıl kullanıldığı.
2. [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html) *(doc)* — Resmi Scrum tanımı: sorumluluklar, sprint, olaylar, süreler ve backlog. Ken Schwaber ve Jeff Sutherland, 2020.
