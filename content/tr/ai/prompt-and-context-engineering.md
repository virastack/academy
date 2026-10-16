---
title: "Prompt ve Context Engineering"
description: "İyi istek yazma, doğru bağlam verme, CLAUDE.md/AGENTS.md ve proje kural dosyaları."
lastVerified: "2026-10-14"
translationKey: "ai/prompt-and-context-engineering"
---

Yapay zekadan aldığınız kodun kalitesi iki şeye bağlı: modele **ne dediğiniz** (prompt) ve modelin **o an neleri gördüğü** (context). Bu rehber önce ikisini, sonra projeniz için bir kez yazıp her konuşmada kullanacağınız kural dosyalarını anlatıyor.

## Prompt: tarif edin, tahmin ettirmeyin

Prompt, modele verdiğiniz istektir: talimat, ilgili bilgi ve gerekirse örnekler. *"Ürün kartını düzelt"* gibi belirsiz bir istekte hangi kartın, neyin, nasıl düzeleceğini siz söylemediğiniz için model boşlukları kendi tahminiyle doldurur ve yanlış yeri değiştirebilir.

İyi bir kodlama isteği dört soruya cevap verir:

| Soru | Örnek |
| --- | --- |
| Ne istiyorsunuz? | İndirimli üründe eski fiyatı üstü çizili göster. |
| Neyle çalışıyoruz? | `ProductCard.tsx`, Tailwind |
| Neyi yapmayalım? | Yeni paket ekleme. |
| Bittiğini nasıl anlarız? | `pnpm test` ve `pnpm lint` geçmeli. |

Zayıf prompt: *"Ürün kartını düzelt."*

Güçlü prompt: *"`ProductCard.tsx` içinde indirimli ürünlerde eski fiyat görünmüyor. Eski fiyatı üstü çizili göster, Tailwind kullan, yeni paket ekleme. Bitince `pnpm test` ve `pnpm lint` geçmeli."*

Birkaç alışkanlık büyük fark yaratır:

- **Meslektaş testi:** İsteği projeyi bilmeyen bir geliştiriciye okutun. İlk sorusu "hangi dosya?" ise isteğe dosyayı ekleyin. Meslektaşın kafası karışıyorsa modele gri alan bırakmışsınızdır; her şeyi net söyleyin[^1].
- **"Yapma" yerine "yap" deyin, nedenini ekleyin:** *"Yeni CSS dosyası açma"* yerine *"Projede Tailwind var, stilleri JSX içinde sınıflarla yaz."* Model nedenini bilince benzer durumlarda da doğru davranır[^1].
- **Örnek gösterin:** Fiyat biçimleyen bir fonksiyon istiyorsanız birbirinden farklı üç dört örnek yazın: `1299` → `₺1.299,00`, `0` → `₺0,00`, `1299.5` → `₺1.299,50`. Kural listesinden çok daha net anlatır[^1].
- **Uzun veri başa, soru sona:** Büyük bir dosya veya log yapıştırıyorsanız önce onu, sonra sorunuzu yazın. Anthropic testlerde yanıt kalitesinin %30'a kadar arttığını bildiriyor[^1].
- **Adım adım düşün demeyin:** Güncel modeller zaten kendi içinde düşünüyor. *"Adım adım düşün"* diye tarif yazmak yerine *"iyice düşün"* gibi genel bir talimat çoğu zaman daha iyi sonuç verir[^1].
- **Bölümleri ayırın:** Uzun bir prompt'ta kimlik, talimat, örnekler ve bağlamı (ilgili kod, hata mesajı) Markdown başlıklarıyla ayırın. OpenAI'nin önerdiği sıra: kimlik, talimat, örnekler, bağlam[^2].
- **Modele göre ayarlayın:** Düşünen modele hedefi ve kısıtları söylemek yeter *("sepet toplamı yanlış, kök nedeni bul")*. Küçük ve hızlı modele adımları açıkça yazın *("`CartSummary.tsx`'te `total` hesabını bul, `reduce` içindeki hatayı düzelt, testi çalıştır")*[^2].

> [!TIP]
>
> Kısa bir istekle başlayın, modelin yanlış yaptığı yere talimat ekleyin. Baştan uzun yazmayın[^3].

## Bittiğini model bilsin

Kodlamada en çok işe yarayan şey, modelin kendi işini kontrol edebileceği bir yol vermektir. Kontrol yoksa model "bitti gibi görünüyor" noktasında durur ve doğrulayan siz olursunuz[^4].

| Zayıf prompt | Güçlü prompt |
| --- | --- |
| *"Header bozuk."* | *"`Header.tsx` 375 px'te iki satıra taşıyor. Logo ile menü ikonu aynı satırda kalsın. Düzeltince ekran görüntüsü alıp tasarımla karşılaştır."* |
| *"Sepet toplamı yanlış."* | *"İki üründe toplam 1.299 TL yerine 1.399 TL çıkıyor. Önce hatayı gösteren bir test yaz, sonra düzelt."* |
| *"Kartı güzelleştir."* | *"Ürün kartı bu tasarım gibi olsun [ekran görüntüsü]. Mevcut `Button` bileşenini kullan, yeni paket ekleme."* |

Dosyayı, belirtiyi ve "düzeldi"nin tanımını yazın. Mevcut bir bileşeni örnek gösterin. Her istekte tek hedef olsun[^4].

Bir tuzak daha var: özel bir şey söylemezseniz model hep en olası seçimlere yaslanır ve ürettiği arayüzler birbirine benzer. Aynı yazı tipi, aynı mor gradyan. Anthropic bu görünümü "AI slop" estetiği diye anıyor ve tipografi, renk, hareket ve arka plan için ayrı talimat yazmayı öneriyor[^1]. Kendi tasarım sisteminizden 4-5 kural yazmanız yeter.

**Büyük işi tek cümleyle istemeyin.** Önce modelin size soru sormasını isteyin, cevaplardan bir `SPEC.md` çıksın, uygulamayı temiz bir konuşmada başlatın[^4]:

```text
Kupon sistemi eklemek istiyorum. Netleşene kadar bana sorular sor:
nasıl çalışacak, hangi uç durumlar var, neyi yapmayacağız.
Bariz soruları atla. Bitince SPEC.md dosyasına yaz.
```

## Context: modelin gördüğü her şey

Model yalnızca önündeki metne bakar: talimatlar, önceki konuşma, açtığı dosyalar, test çıktıları. Bunların hepsine **context (bağlam)** denir. **Context engineering** ise bu bilginin neleri içereceğini yönetmektir[^3].

| Bağlamın parçası | Örnek |
| --- | --- |
| Talimatlar | Sistem prompt'u, `AGENTS.md`, `CLAUDE.md` |
| Konuşma geçmişi | Önceki mesajlarınız ve modelin cevapları |
| Dosyalar | Modelin okuduğu veya sizin yapıştırdığınız kod |
| Araç çıktıları | Terminal çıktısı, test hataları |

Modelin tek seferde işleyebildiği metin miktarına **context window (bağlam penceresi)** denir ve **token** ile ölçülür. Bir token kabaca kelimenin dörtte üçü kadardır.

Pencere dolmasa bile bağlam uzadıkça modelin içindeki bilgiyi doğru hatırlaması zorlaşır. Buna **context rot** denir[^3]. [!claudeCode] dokümanı da aynı şeyi söylüyor: bağlam doldukça performans düşer, bu yüzden en değerli kaynak bağlamdır[^4]. Hedef: **az ama değerli bilgi.**

Pratikte:

- **Yeni iş, yeni konuşma.** İlgisiz işleri aynı konuşmada biriktirmeyin[^4].
- **İki düzeltmeden sonra sıfırlayın.** Başarısız denemeler bağlamı kirletir. Öğrendiklerinizle daha iyi bir ilk istek yazıp yeni konuşma açın[^4].
- **Önemli kararı dosyaya yazın.** Araçlar uzayan konuşmayı özetler, özet küçük ayrıntıları kaybedebilir[^3]. Yalnızca konuşmada söylediğiniz talimat özetten sonra kaybolabilir[^5].
- **Ne yüklendiğine bakın.** [!claudeCode]'da `/context` hangi talimat dosyalarının yüklendiğini gösterir[^4].

> [!TIP]
>
> Yeni çıkmış bir kütüphane veya API kullanıyorsanız dokümanın linkini ya da ilgili kısmını verin. Model tahmin etmek zorunda kalmaz[^4].

## Kural dosyası: AGENTS.md ve CLAUDE.md

Model her oturuma projeniz hakkında hiçbir şey bilmeden başlar: hangi paket yöneticisini kullandığınızı, testi nasıl çalıştıracağınızı bilmez. Bunları bir dosyaya yazarsanız araç dosyayı her oturumun başında bağlama ekler[^5]. `AGENTS.md`, ajanlar için bir README gibidir. Düz Markdown'dır, zorunlu alanı yoktur[^6].

| Araç | Dosya | Not |
| --- | --- | --- |
| [!codex] [!cursor] [!vscode] [!windsurf] [!zed] ve diğerleri | `AGENTS.md` | Monorepo'da her pakete ayrı dosya koyabilirsiniz, en yakın olan geçerli olur. [!geminiCli] ve Aider için dosya adını ayardan göstermek gerekir[^6]. |
| [!claudeCode] | `CLAUDE.md` | Dizinde `CLAUDE.md` yoksa `AGENTS.md`'yi de okur *(v2.1.277+)*. İkisi varsa yalnızca `CLAUDE.md` okunur. İkisini birleştirmek için `CLAUDE.md` içine `@AGENTS.md` yazın[^5]. |
| [!cursor] | `.cursor/rules/*.mdc` veya `AGENTS.md` | `.mdc` dosyası ne zaman yükleneceğini belirler. Düz `.md` dosyası yok sayılır[^7]. |

> [!WARNING]
>
> Kural dosyası zorunlu değildir. Modele bağlam olarak gider, uyum garantisi yoktur[^5]. Mutlaka olması gereken şey için hook, linter veya CI kullanın[^4].

### İyi bir kural dosyası nasıl yazılır?

- **Kısa tutun.** [!claudeCode] 200, [!cursor] 500 satırın altını öneriyor[^5], [^7]. Her satır için sorun: "Bunu silersem model hata yapar mı?" Yapmazsa silin[^4].
- **Yalnızca koddan anlaşılmayanı yazın.** Klasör yapısını ve teknoloji listesini model ilk taramada kendi buluyor. ETH Zürih'in çalışmasında repo özetleri başarıyı artırmadı[^8]. Ama "paket yöneticisi `uv`" gibi bir bilgiyi kendi bulamaz. `uv`, Python için bir paket yöneticisi. Çalışma Python projeleriyle yapıldı. Frontend'deki karşılığı `pnpm`, `npm`, `yarn` ya da `bun`. Aynı çalışmada kural dosyasında `uv` geçince ajan onu görev başına ortalama 1,6 kez kullandı, geçmeyince neredeyse hiç[^9].
- **Ajanın tahmin edemeyeceği komutları yazın.** `git` ve `npm` gibi bildiği araçları anlatmayın[^7].
- **Stil kurallarını linter'a bırakın.** Style guide'ı kopyalamak yerine linter kullanın[^7].
- **Uzun anlatma, işaret et.** Kodu kopyalamak yerine dosyayı gösterin, böylece dosya şişmez ve eskimez[^7].
- **Her satıra bir ipucu gibi bakın.** Ajan sürekli yanlış klasöre dosya koyuyorsa kural eklemek yerine yapıyı düzeltmek daha kalıcı[^9].
- **Şu altı alanı kapsayın:** komutlar, test, proje yapısı, kod stili, git akışı ve sınırlar. Sınırları üçe bölün: her zaman yap, önce sor, asla yapma[^10].

Örnek bir frontend `AGENTS.md`:

```markdown
# AGENTS.md

## Komutlar
- Test: `pnpm test:run` (tek dosya: `pnpm vitest run <dosya>`)
- Kontrol: `pnpm lint && pnpm tsc --noEmit`

## Dikkat
- Stil için Tailwind kullan, yeni CSS dosyası açma.
- `legacy/` eski ama üç modül hâlâ import ediyor; içinden dosya silme.

## Sınırlar
- Önce sor: yeni paket eklemek, route yapısını değiştirmek.
- Asla: `.env` dosyalarını okuma veya commit etme.
```

> [!TIP]
>
> Bir kuralı yalnızca ilgili dosyalarda yükleyebilirsiniz: [!cursor]'da `globs: src/components/**/*.tsx`, [!claudeCode]'da `.claude/rules/` içinde `paths:`.[^5], [^7]

<details>
<summary>Kural dosyası gerçekten işe yarıyor mu?</summary>

<ul>
<li>İki çalışma farklı şeyleri ölçüyor. Birinde *(10 repo, 124 PR)* `AGENTS.md` varken çalışma süresi medyanda %28,64, çıktı token'ı %16,58 azaldı, ama doğruluk ölçülmedi. ETH Zürih'in çalışması ise bağlam dosyalarının başarı oranını genelde artırmadığını, maliyeti ortalama %20'den fazla artırdığını buldu. Talimatlar iyi izleniyor, repo özetleri işe yaramıyor. Dosyalar standart dışı pratikleri anlatmak için faydalı[^8], [^9]. Sonuç: dosyayı küçük tutun ve etkisini kendiniz deneyin.</li>
</ul>

</details>

<details>
<summary>`/init` ile üretilen dosya</summary>

<ul>
<li>[!claudeCode] dokümanı `/init`'i başlangıç noktası olarak öneriyor ve üretileni zamanla sadeleştirmenizi söylüyor[^5]. [Addy Osmani](https://addyosmani.com) ise üretilen dosyayı olduğu gibi bırakmamayı öneriyor, çünkü içeriği çoğunlukla modelin zaten bulabileceği şeylerden oluşuyor[^9]. İkisinin ortak noktası: her satırı sorgulayın.</li>
</ul>

</details>

## Kaynaklar

1. [Anthropic: Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) *(doc)* — Netlik, örnek, uzun veride sıra ve frontend talimatı için güncel referans.
2. [OpenAI: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) *(doc)* — Mesaj bölümleri ve düşünen modelle küçük modelin farklı yönlendirilmesi.
3. [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) *(article)* — Context'in tanımı, context rot ve kısa başlayıp hata gördükçe talimat ekleme.
4. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Doğrulama yolu, kapsam, bağlam yönetimi ve kural dosyası yazımı.
5. [Claude Code: How Claude remembers your project](https://code.claude.com/docs/en/memory) *(doc)* — CLAUDE.md konumları, AGENTS.md okuma kuralları ve `.claude/rules/`.
6. [AGENTS.md](https://agents.md) *(doc)* — Açık format, desteklenen araçlar ve iç içe dosyalar.
7. [Cursor: Rules](https://cursor.com/docs/rules) *(doc)* — `.mdc` kural türleri, `globs` ve yazım önerileri.
8. [ETH Zürih: Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) *(research)* — Bağlam dosyalarının başarı ve maliyete etkisi.
9. [Addy Osmani: Stop Using /init for AGENTS.md](https://addyosmani.com/blog/agents-md/) *(article)* — Üretilen dosyaların neden zarar verebileceği ve iki çalışmanın özeti.
10. [GitHub: How to write a great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) *(article)* — 2.500+ repodan çıkan altı alan ve üç kademeli sınırlar.
