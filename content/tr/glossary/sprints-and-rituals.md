---
title: "Sprint ve ritüeller"
description: "Sprint, daily, planning ve retro toplantıları ne işe yarar."
lastVerified: "2026-10-16"
translationKey: "glossary/sprints-and-rituals"
---

Scrum'da sprint boyunca tekrar eden dört toplantı vardır. Scrum Guide bunları olay (event) olarak adlandırır ve sprintin kendisiyle birlikte toplam beş olay tanımlar.[^1] Sprintin ne olduğunu [Çalışma Yöntemleri](/academy/glossary/working-methods) dersinde anlattık.

## Sprint Planning (Sprint Planlama)

**Sprint Planning**, sprintin başında yapılır ve o sprintte hangi işlerin yapılacağını belirler. Takım üç soruya cevap arar: *Bu sprint neden değerli, bu sprintte neler tamamlanabilir ve seçilen işler nasıl yapılacak*.[^1] Sprint başına bir hedef (**Sprint Goal**) belirlenir. Scrum Guide bir aylık sprint için en fazla 8 saat der ve kısa sprintlerde bunun daha kısa olmasını bekler.[^1] Bunu orantılı hesaplarsak, 2 haftalık bir sprint için Sprint Planlama toplantısı en fazla **yaklaşık 4 saat** sürer.

## Daily Scrum (Günlük Toplantı)

**Daily**, geliştirme ekibinin her gün aynı saatte yaptığı **15 dakikalık** toplantıdır.[^1] Amacı sprint hedefine doğru ilerlemeyi gözden geçirmek ve gerekirse günün planını güncellemektir. Pratikte herkes *dünden bu yana ne yaptığını, bugün ne yapacağını ve önünde bir engel olup olmadığını* söyler. Teknik tartışmalar daily bitince ilgili kişilerle ayrıca yapılır.[^2]

## Sprint Review (Sprint Gözden Geçirme)

**Sprint Review**, sprintin sonunda yapılır. Takım bu sprintte ortaya çıkan çalışan ürün parçasını paydaşlara gösterir, geri bildirim alır ve sonraki adımları birlikte konuşur.[^1][^3] Scrum Guide bir aylık sprint için en fazla 4 saat der ve kısa sprintlerde bunun daha kısa olmasını bekler.[^1] Bunu orantılı hesaplarsak, 2 haftalık bir sprint için Sprint Review toplantısı en fazla **yaklaşık 2 saat** sürer. Burada konuşulan şey kodun nasıl yazıldığı değil, ortaya çıkan ürünün ne olduğudur.

## Sprint Retrospective (Retro)

**Retro**, sprintin en son olayıdır ve Review'dan sonra yapılır. Amacı ürünü değil, takımın çalışma şeklini iyileştirmektir.[^1] Takım sprintte neyin iyi gittiğini, neyin aksadığını ve bir sonraki sprintte neyi değiştireceğini konuşur. Scrum Guide bir aylık sprint için en fazla 3 saat der ve kısa sprintlerde bunun daha kısa olmasını bekler.[^1] Bunu orantılı hesaplarsak, 2 haftalık bir sprint için Retro en fazla **yaklaşık 1,5 saat** sürer. İyi bir retro sonunda bir sonraki sprintte uygulanacak en etkili iyileştirmeler belirlenir.[^4]

### Örnek: Retro senaryosu

Aşağıdaki senaryo örnek amaçlıdır. Retronun nasıl işlediğini göstermek için kurgulanmıştır.

**Sorun:** Bir sprintte Frontend geliştirici profil sayfasını bitirmeyi planlamıştır. Ancak sayfanın kullanacağı Backend API'leri sprintin son günlerinde teslim edilmiştir. Frontend geliştirici gerçek veriyle çalışamadığı için işi sprint sonuna yetiştirememiştir.

**Dile getirme:** Retroda Frontend geliştirici bunu açıkça söyler: Backend API'leri geç geldiği için işini zamanında bitiremedi. Bu bir kişiyi suçlama değil, süreçte aksayan bir noktanın tespitidir. Retro tam olarak bu tür aksaklıkları görünür kılmak için yapılır.

**Seçenekler:** Takım sorunu çözmek için iki yol değerlendirir. Birincisi, Backend'in bir sprint önden gitmesidir: Backend bir sprintte API'leri hazırlar, Frontend bir sonraki sprintte bunları kullanır. İkincisi, Frontend ve Backend'in sprint başında API sözleşmesi (API contract) üzerinde anlaşıp paralel çalışmasıdır: Frontend, Backend hazır olana kadar sözleşmeye uygun sahte veriyle (mock) geliştirme yapar.

**Karar:** Takım ikinci yolu seçer, çünkü bu yol Frontend'i beklemeden çalıştırır ve işlerin aynı sprintte bitmesini sağlar. Karar somut bir eyleme dönüştürülür: sonraki sprintlerde her API için sprint planlamasında sözleşme yazılacaktır.[^4] Bir sonraki retroda bu kararın işe yarayıp yaramadığı kontrol edilir.

## Backlog Refinement (Backlog Düzenleme)

**Refinement**, resmi bir Scrum olayı değildir ama çoğu takım düzenli olarak yapar. Product Backlog'daki işler, sprint planlamasına gelmeden önce netleştirilir, bölünür ve büyüklükleri tahmin edilir.[^1] Backlog'u [İş Takibi](/academy/glossary/work-tracking) dersinde anlatıyoruz.

## Kaynaklar

1. [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html) *(doc)* — Resmi Scrum tanımı: sorumluluklar, sprint, olaylar, süreler ve backlog. Ken Schwaber ve Jeff Sutherland, 2020.
2. [Scrum.org: What is a Daily Scrum?](https://www.scrum.org/resources/what-is-a-daily-scrum) *(article)* — Daily'nin amacı sprint hedefine doğru ilerlemeyi gözden geçirmek, ayrıntılı konuşmaların daily'den hemen sonra yapılması.
3. [Scrum.org: What is a Sprint Review?](https://www.scrum.org/resources/what-is-a-sprint-review) *(article)* — Sonuçların paydaşlara sunulması, toplantının sunuma indirgenmemesi ve çalışma oturumu olarak yapılması.
4. [Scrum.org: What is a Sprint Retrospective?](https://www.scrum.org/resources/what-is-a-sprint-retrospective) *(article)* — Kaliteyi ve etkinliği artırmanın yollarını planlamak, bir sonraki sprintte uygulanacak iyileştirmeleri belirlemek.
