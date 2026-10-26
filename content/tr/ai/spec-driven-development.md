---
title: "Spec-driven geliştirme"
description: "Ajana önce spec ve görev listesi yazdırma, sonra görev görev uygulatma ve spec'i güncel tutma."
lastVerified: "2026-10-26"
translationKey: "ai/spec-driven-development"
---

Ajana *"sepete kupon kodu ekle"* deyip beklemek hızlı başlar ama çoğu zaman yanlış yerde biter. Model söylemediğiniz her kararı kendi tahminiyle verir. [!github] ekibi sorunu şöyle özetliyor: ajanlara arama motoru gibi davranıyoruz, oysa onlar her şeyi harfi harfine alan bir eş programcı gibidir.[^1]

**Spec-driven geliştirme**, kodu yazdırmadan önce **ne yapılacağını bir dosyaya yazmak** ve ajanı o dosyaya göre çalıştırmaktır.[^1][^2] Spec hem sizin hem ajanın başvurduğu ortak kaynak olur.

## Plan ile spec'in farkı

[Agentic kodlama](/academy/ai/agentic-coding) dersindeki plan modu da kodlamadan önce düşündürür. Fark, planın konuşmanın içinde kalmasıdır. Spec ise repoda duran bir dosyadır: commit edilir, incelenir ve yeni bir oturumda tekrar okunur.

| | Plan modu | Spec |
| :-- | :-- | :-- |
| **Nerede durur** | Konuşmada | Repoda, `SPEC.md` gibi bir dosyada |
| **Ömrü** | Oturum kapanınca biter | Özellik yaşadıkça kalır |
| **Kim inceler** | Siz, o an | Siz ve takım, PR'da |
| **Ne zaman** | Birkaç dosyalık iş | Birden çok oturuma yayılan özellik |

Spec'in ne kadar yaşayacağı da bir tercihtir. Yalnızca o iş için yazılıp unutulan spec'e **spec-first**, özellikle birlikte güncellenen spec'e **spec-anchored** denir. Bugünkü araçların çoğu ilkini destekliyor.[^2]

## Akış: spec, plan, görevler, uygulama

Araçlar farklı isimler kullansa da akış aynıdır:[^1][^2]

1. **Spec:** Ne yapılacak ve neden. Kullanıcı ne görür, ne zaman "bitti" deriz. Teknoloji yok.
2. **Plan:** Nasıl yapılacak. Hangi dosyalar, hangi bileşenler, hangi kısıtlar.
3. **Görevler:** Planı tek tek test edilebilen küçük parçalara bölmek.
4. **Uygulama:** Ajan görevleri sırayla yapar, siz her adımda küçük bir diff incelersiniz.

Her adımın sonunda durup dosyayı okursunuz. Yanlışı spec'te düzeltmek, koddan düzeltmekten ucuzdur.

Spec'i boş sayfadan yazmanıza gerek yok. [Prompt ve context engineering](/academy/ai/prompt-and-context-engineering) dersindeki gibi ajandan size soru sormasını isteyin, cevaplardan spec'i o yazsın.[^3] [Addy Osmani](https://addyosmani.com) da kısa bir hedefle başlayıp ayrıntıyı ajana genişletmeyi, kod yazılmadan önce taslağı okumayı öneriyor.[^4]

## İyi bir spec'te ne olur

[!claudeCode] dokümanına göre en işe yarayan spec kendi başına yeterlidir: ilgili dosyaları ve arayüzleri adıyla yazar, **kapsam dışını** açıkça söyler ve özelliğin çalıştığını kanıtlayan uçtan uca bir kontrolle biter.[^3] Kupon özelliği için kısa bir örnek:

```md
# Cart coupon

## Goal
Kullanıcı sepette kupon kodu girip indirim alabilsin.

## Acceptance criteria
- `SALE10` girildiğinde ara toplamdan %10 düşülür.
- Geçersiz kodda input altında "Kupon geçersiz" yazar, toplam değişmez.
- Aynı anda tek kupon uygulanır; yenisi eskisinin yerine geçer.

## Files
- `src/features/cart/components/CouponForm.tsx` (new)
- `src/features/cart/lib/applyCoupon.ts` (new)
- `src/features/cart/components/CartSummary.tsx`

## Out of scope
- Kupon yönetim paneli, kullanıcı başına kupon limiti.

## Boundaries
- Always: mevcut `Button` ve `Input` bileşenlerini kullan.
- Ask first: yeni paket eklemeden önce sor.
- Never: `CartSummary` dışındaki fiyat hesaplarına dokunma.

## Verification
`pnpm test applyCoupon` geçer. Playwright: `SALE10` ile toplam 1.000 TL'den 900 TL'ye düşer.
```

Son iki bölüm Addy Osmani'nin önerisinden geliyor: ajanın sınırlarını *her zaman*, *önce sor* ve *asla* diye üç katmanda yazmak.[^4] Komutlar, klasör yapısı ve kod stili gibi her özellikte aynı kalan bilgiler ise spec'e değil `AGENTS.md`'ye gider.

> [!TIP]
>
> Kabul kriterlerini test edilebilir yazın. *"Kupon düzgün çalışsın"* ajana bir şey söylemez. *"`SALE10` ile toplam 900 TL olur"* ise hem ajana hedef hem size test olur.

## Görevlere bölmek ve uygulamak

Spec onaylanınca ajandan bir görev listesi isteyin. Her görev tek başına test edilebilmeli:[^1]

```md
- [ ] 1. `applyCoupon` fonksiyonu ve birim testleri
- [ ] 2. `CouponForm` bileşeni, hata mesajı dahil
- [ ] 3. `CartSummary`'ye indirim satırı
- [ ] 4. Playwright ile uçtan uca senaryo
```

Uygulamayı **yeni bir oturumda** başlatın. Temiz bağlam yalnızca spec'e ve göreve odaklanır.[^3] Uzun bir talimat listesinde model her maddeye daha az uyar. Bu yüzden her göreve spec'in yalnızca ilgili bölümünü verin.[^4]

Görev bitince ajandan çıktıyı spec'le karşılaştırmasını ve **karşılanmayan kriterleri listelemesini** isteyin.[^4] Testler geçiyor ve liste boşsa görevi işaretleyip commit edin.

## Spec'i güncel tutmak

İş sırasında bir karar değişirse *(örneğin kupon artık kargo ücretine de uygulanıyorsa)* önce spec'i güncelleyin, sonra kodu. Spec'i kodla birlikte versiyon kontrolünde tutun.[^4] Böylece altı ay sonra bu özelliğe dokunan biri *(ya da bir ajan)* neden böyle çalıştığını dosyadan okur.

## Ne zaman gerekmez?

Spec bir araçtır, tören değil. martinfowler.com'daki bir incelemede yazar, küçük bir hata düzeltmesi için aracın 4 kullanıcı hikâyesi ve 16 kabul kriteri ürettiğini anlatıyor. Ayrıca ajanın spec'teki notları yer yer görmezden geldiğini ve tekrarlı Markdown dosyalarını incelemenin koddan daha yorucu olduğunu yazıyor.[^2]

| Spec yazın | Doğrudan isteyin |
| :-- | :-- |
| Birden çok oturuma yayılan özellik | Tek cümleyle anlatılabilen değişiklik[^3] |
| Takımla paylaşılacak, incelenecek kararlar | Metin, stil veya küçük hata düzeltmesi |
| Tanımadığınız bir kod tabanında yeni özellik | Daha önce defalarca yaptığınız iş |

> [!WARNING]
>
> Ayrıntılı bir spec, ajanın her maddeye uyacağı anlamına gelmez.[^2] Kontrolü spec değil, testler ve sizin incelemeniz sağlar.

<details>
<summary>Hazır araçlar</summary>

<ul>
<li><strong>Spec Kit</strong> <em>(GitHub)</em>: Açık kaynak bir CLI. Projeye her değişiklikte geçerli ilkeleri yazdığınız bir "constitution" ekler ve ajanı specify, plan, tasks ve implement adımlarından geçirir. [!copilot], [!claudeCode] ve başka ajanlarla çalışır.[^1][^5]</li>
<li><strong>Kiro</strong>: Spec'i <code>requirements.md</code>, <code>design.md</code> ve <code>tasks.md</code> olarak üç dosyaya ayıran bir editör. Hata düzeltmeleri için ayrı bir <code>bugfix.md</code> akışı var.[^6]</li>
</ul>

</details>

Araç şart değil. Bir `SPEC.md`, bir görev listesi ve plan modu aynı akışı kurar.

## Kendin dene

- Sepete kupon özelliği için ajandan sizi sorgulamasını isteyin ve cevaplardan `SPEC.md` yazdırın. Kapsam dışı bölümü var mı?
- Spec'teki bir kabul kriterini belirsiz yazın *("kupon düzgün çalışsın")*. Ajanın yazdığı testler neyi kontrol ediyor?
- Görev listesini çıkarıp yalnızca ilk görevi yeni bir oturumda uygulatın. Diff kaç dosyaya dokunuyor?
- Görev bitince ajandan *"spec'te karşılanmayan kriterleri listele"* isteyin. Liste boş mu?

## Detaylı öğrenmek için

- **Yazı:** [Addy Osmani](https://addyosmani.com), "How to write a good spec for AI agents"; spec'in altı bölümü, modüler prompt'lar ve kendi kendini doğrulama.[^4]
- **Yazı:** martinfowler.com, "Understanding Spec-Driven-Development"; Kiro, Spec Kit ve Tessl'in eleştirel karşılaştırması.[^2]
- **Resmi doküman:** [!claudeCode] "Best practices"; ajanın sizi sorgulaması ve spec'i yeni oturumda uygulatmak.[^3]

## Kaynaklar

1. [GitHub Blog: Spec-driven development with AI: Get started with a new open source toolkit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) *(article)* — Den Delimarsky, 2 Eylül 2025. Spec, plan, görevler ve uygulama adımları, spec'in neden ortak kaynak olduğu.
2. [martinfowler.com: Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) *(article)* — Birgitta Böckeler, 15 Ekim 2025. Spec-first ve spec-anchored ayrımı, küçük işte aşırı süreç ve ajanın spec'i görmezden gelmesi.
3. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Ajanın sizi sorgulayıp `SPEC.md` yazması, iyi spec'in özellikleri ve yeni oturumda uygulama.
4. [Addy Osmani](https://addyosmani.com): [How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/) *(article)* — 13 Ocak 2026. Spec bölümleri, üç katmanlı sınırlar, modüler görevler ve spec'e karşı kontrol.
5. [GitHub: Spec Kit](https://github.com/github/spec-kit) *(repo)* — Kurulum, constitution ve spec adımlarının güncel komutları.
6. [Kiro: Specs](https://kiro.dev/docs/specs/) *(doc)* — `requirements.md`, `design.md`, `tasks.md` ve hata düzeltme spec'i.
