---
title: "Çalışma Yöntemleri"
description: "Agile, Scrum ve Kanban nedir, takımlar hangisini neden seçer."
lastVerified: "2026-10-16"
translationKey: "glossary/working-methods"
---

## Agile

**Agile**; yazılımı tek seferde büyük bir teslimle değil, kısa aralıklarla küçük ve çalışan parçalar hâlinde geliştirmeyi öneren bir yaklaşımdır.[^1] Her teslimden sonra alınan geri bildirime göre plan güncellenir. Agile bir araç ya da kurallar listesi değil, bir çalışma anlayışıdır. Takımlar bu anlayışı pratikte çoğunlukla Scrum ya da Kanban ile uygular.

## Scrum

**Scrum**; işi sprint adı verilen sabit sürelere bölen bir çalışma çerçevesidir. Takımda üç sorumluluk bulunur: neyin yapılacağına ve önceliğine karar veren **Product Owner** (Ürün Sahibi), takımın Scrum'ı doğru uygulamasına yardım eden **Scrum Master** (Scrum Yöneticisi) ve işi geliştiren **Developers** (Geliştiriciler).[^2] Sprintte yapılacak işler sprint başında belirlenir ve takım sprint bitene kadar bu işlere odaklanır.

## Sprint

**Sprint**; takımın belirli bir sürede ne kadar iş bitirebileceğini öngörerek planlama ve geliştirme yaptığı sabit zaman dilimidir. Süresi genellikle **1-4 hafta** arasındadır ve en fazla bir ay olabilir.[^2][^3] Bu derste örnekleri 2 haftalık sprint üzerinden anlatıyoruz. Amaç, sürenin sonunda kullanıcının doğrudan deneyimleyebileceği çalışan ve somut bir ürün parçası teslim etmektir. Örneğin hedef bir kullanıcı profil sayfasıysa, sayfanın kodlaması ve testleri sprint bitmeden tamamlanır ve sayfa kullanıma hazır hâle getirilir.

## Kanban

**Kanban**; işlerin sabit sürelere bölünmeden, bir pano üzerinde sürekli aktığı bir çalışma yöntemidir. Panoda işin aşamalarını gösteren sütunlar bulunur, örneğin *To Do* (Yapılacak), *In Progress* (Devam Ediyor) ve *Done* (Tamamlandı).[^4] Bir iş bittiğinde *To Do* sütunundan sıradaki iş çekilir. Aynı anda devam eden iş sayısı sınırlandırılır (**WIP limiti**, yani devam eden iş limiti), böylece yarım kalan işler birikmez.[^4]

## Takımlar hangisini neden seçer?

Scrum genellikle yeni bir ürün ya da özellik geliştiren ve düzenli aralıklarla teslim yapmak isteyen takımlarda tercih edilir. Kanban ise canlıdaki hatalar ve destek talepleri gibi ne zaman geleceği önceden bilinmeyen işlerle uğraşan takımlarda daha uygundur, çünkü yeni iş sprintin bitmesini beklemeden alınabilir.[^5] Birçok takım ikisini birlikte kullanır: sprintlerle çalışır ama panoda devam eden iş sayısını da sınırlar.[^4]

## Kaynaklar

1. [Principles behind the Agile Manifesto](https://agilemanifesto.org/principles.html) *(doc)* — Çalışan yazılımı birkaç haftadan birkaç aya uzanan aralıklarla sık teslim etmek ve değişen gereksinimleri karşılamak.
2. [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html) *(doc)* — Üç sorumluluk ve sprintin en fazla bir ay sürmesi. Ken Schwaber ve Jeff Sutherland, 2020.
3. [Atlassian: Sprints](https://www.atlassian.com/agile/scrum/sprints) *(article)* — Sprintlerin sabit süreli olduğu ve genellikle 1-4 hafta sürdüğü.
4. [Online Kanban Guide for Scrum Teams](https://www.scrum.org/resources/online-kanban-guide-scrum-teams) *(doc)* — Kanban panosuyla akışı görünür kılmak, WIP'i açıkça sınırlamak ve Kanban'ın sprinti ortadan kaldırmadığı.
5. [Atlassian: Kanban vs. Scrum](https://www.atlassian.com/agile/kanban/kanban-vs-scrum) *(article)* — Kanban'ın önceliği ve boyutu değişen, çok sayıda gelen talebi olan takımlara uygun olması ve Scrumban gibi karma biçimler.
