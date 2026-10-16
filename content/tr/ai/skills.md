---
title: "Skills"
description: "Tekrar eden işleri skill'e dönüştürme ve hazır frontend skill'lerini kullanma."
lastVerified: "2026-10-14"
translationKey: "ai/skills"
---

Aynı talimatı üçüncü kez sohbete yapıştırıyorsanız, o iş skill olmak istiyordur. [!claudeCode] dokümanı skill'i tam bu durumlar için öneriyor: aynı talimatı, kontrol listesini ya da çok adımlı prosedürü tekrar tekrar yapıştırıyorsanız veya `CLAUDE.md`'nizdeki bir bölüm olgu olmaktan çıkıp prosedüre dönüştüyse.[^1]

## Skill nedir?

Skill, içinde `SKILL.md` dosyası olan bir klasördür. Dosyanın başında `name` ve `description`, altında ajanın izleyeceği talimatlar bulunur. İsterseniz yanına script ve referans dosyaları koyarsınız. Biçim açık bir standarttır (Agent Skills) ve birden fazla araçta çalışır.[^1]

Kural dosyasından farkı yüklenme zamanı: `AGENTS.md` her oturumda bağlamdadır, skill'in ise yalnızca açıklaması bağlamda durur, gövdesi skill kullanıldığında yüklenir.[^1] Uzun referans malzeme, kullanılana kadar neredeyse maliyetsizdir.

|  | Kural dosyası (`AGENTS.md`) | Skill |
| --- | --- | --- |
| Ne içerir? | Her işte geçerli olgular | Belli bir işte izlenecek prosedür |
| Ne zaman yüklenir? | Her oturumda | Gerektiğinde |
| Frontend örneği | *"Paket yöneticisi `pnpm`, test komutu `pnpm test:run`"* | *"Yeni bileşen ekleme adımları"*, *"PR öncesi kontrol listesi"* |

## Tekrar eden işi skill'e dönüştürün

Sıfırdan yazmak yerine önce işi bir kez normal şekilde yaptırın. Anthropic'in önerdiği yöntem bu: görevi ajanla normal istekle bitirin, bu sırada verdiğiniz bağlama (tercihleriniz, kurallarınız, izlediğiniz adımlar) dikkat edin, sonra aynı ajana *"bu işte verdiğim bağlamı bir skill'e dönüştür"* deyin. Çıkan skill'i yeni bir konuşmada gerçek bir işte deneyin, ajanın takıldığı yeri not edip skill'i düzeltin.[^2]

Örnek bir frontend skill'i (`.claude/skills/new-component/SKILL.md`):

```markdown
---
name: new-component
description: Projeye yeni React bileşeni ekler. Kullanıcı "yeni bileşen" veya "component ekle" dediğinde ya da src/components altına yeni dosya gerektiğinde kullan.
---

1. `src/components/<Ad>/` klasörü aç: `<Ad>.tsx`, `<Ad>.test.tsx`, `index.ts`.
2. `src/components/Button/` bileşenini örnek al, aynı yapıyı izle.
3. Props'u `interface` ile yaz, named export kullan.
4. Test dosyasına en az bir render ve bir etkileşim testi ekle.
5. `pnpm lint && pnpm tsc --noEmit && pnpm test:run` çalıştır. Hepsi geçmeden işi bitmiş sayma.
```

İyi bir skill için beş kural:

- **Yalnızca ajanın bilmediğini yazın.** Yapay zeka React'i zaten biliyor, projenize özgü olanı yazın. Her paragraf için *"bu, token maliyetini hak ediyor mu?"* diye sorun. `SKILL.md` 500 satırın altında kalsın, fazlasını ayrı dosyalara bölüp `SKILL.md`'den doğrudan bağlayın.[^2]
- **description'a hem "ne yapar" hem "ne zaman" yazın.** Ajan skill'i yalnızca `description`'a bakarak seçer. *"Belgelerle ilgilenir"* gibi muğlak bir ifade işe yaramaz. Metni üçüncü şahıs yazın (*"ekler"*), *"ekleyebilirim"* yazmayın.[^2] [!claudeCode] listede `description` metnini en fazla 1.536 karakter gösterir, önemli kullanım durumunu başa koyun.[^1]
- **Katılığı işe göre seçin.** Kod incelemesi gibi bağlama bağlı işlerde genel yönerge yeter. Veritabanı migration'ı gibi kırılgan işlerde tam komutu yazın ve *"değiştirme"* deyin. Seçenek sıralamayın, tek bir varsayılan verin (*"Vitest kullan; E2E gerekiyorsa Playwright"*).[^2]
- **Kontrol döngüsü ekleyin.** *"Doğrula, hata varsa düzelt, tekrar doğrula"* kalıbı çıktı kalitesini artırır. Frontend'de bu lint, tip kontrolü ve testtir.[^2]
- **Tarihe bağlı bilgi yazmayın.** *"Şu tarihten önce eski yöntemi kullan"* yerine güncel yöntemi yazın, eskisini ayrı bir "eski kalıplar" bölümüne koyun.[^2]

> [!TIP]
>
> **Kimin tetikleyeceğini seçin.** Varsayılan olarak hem siz `/skill-adı` yazarak hem ajan uygun görünce skill'i çalıştırır. `deploy` ve `commit` gibi yan etkisi olan işlerde `disable-model-invocation: true` yazın, böylece yalnızca siz tetiklersiniz. Yalnızca ajanın bilmesi gereken arka plan bilgisi için `user-invocable: false` kullanın.[^1] Skill'in yalnızca belirli dosyalarla çalışırken öne çıkması için `paths: "**/*.tsx"` yazabilirsiniz.[^1][^3]

## Nereye konur?

| Araç | Proje | Kişisel |
| --- | --- | --- |
| [!claudeCode] | `.claude/skills/<ad>/SKILL.md` | `~/.claude/skills/<ad>/SKILL.md` |
| [!cursor] | `.cursor/skills/` veya `.agents/skills/` | `~/.cursor/skills/` veya `~/.agents/skills/` |

[!cursor] `.claude/skills/` klasörünü de okur, yani iki aracı birlikte kullanıyorsanız skill'i `.claude/skills/` altına koymak yeter.[^3] Proje skill'ini commit edin, ekip de kullanır.[^1] [!cursor]'da `name` alanı klasör adıyla aynı olmalı (küçük harf, rakam, tire).[^3] Eskiden `.claude/commands/` içine yazdığınız özel komutlar da artık skill ile aynı şeydir.[^1] İskeleti elle kurmak zorunda değilsiniz: [!cursor]'da `/create-skill`, [!claudeCode]'da `skill-creator` eklentisi var.[^1][^3]

> [!WARNING]
>
> Skill talimattır, zorunlu değildir. Konuşma özetlenince [!claudeCode] her skill'in yalnızca ilk 5.000 token'ını geri yükler.[^1] En önemli talimatları skill'in başına yazın, mutlaka olması gereken kuralı hook veya CI'a koyun.[^1]

## Hazır frontend skill'leri

Neden gerekli? Anthropic'in frontend yazısı sorunu adlandırıyor: talimat vermezseniz model, eğitim verisinin ortasındaki güvenli seçimlere (Inter yazı tipi, beyaz üstüne mor gradyan, az animasyon) yaslanır. Bunu sistem prompt'una yazarsanız her konuşma, alakasız işlerde bile tasarım talimatı taşır. Skill ise yalnızca arayüz işinde yüklenir.[^4]

[Emil Kowalski](https://emilkowal.ski) aynı sorunu animasyon tarafında çözüyor: ajanlar "iyi hissettiren"in ne olduğunu bilmiyor, o yüzden arayüzün her yönü için bir skill dosyası yazıyor.[^5] Yöntemi kendi skill'iniz için de işe yarar: *"güzel animasyon yap"* yerine karar kuralları yazın. Örneğin giren eleman `ease-out` kullanır, UI animasyonları 300 ms altında kalır, bir eleman `scale(0)` yerine `scale(0.95)`'ten başlar. Her kuralın nedenini yazın, karar noktalarını tablo ya da akış şemasına çevirin ki ajan tahmin etmesin.[^5]

| Skill | Ne işe yarar? |
| --- | --- |
| [**Anthropic frontend-design**](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design) | Yaklaşık 400 token'lık yönerge; tipografi, renk, hareket ve arka planı kapsayıp jenerik "AI estetiğini" bastırır.[^4] |
| [**emilkowalski/skills**](https://github.com/emilkowalski/skills) | Animasyon ve arayüz ince ayarı (`emil-design-eng`, `review-animations`, `animation-performance`). `break-ui` arayüzü en kötü senaryo verisiyle (çok uzun isim, boş liste) kırmaya çalışır. `pick-ui-library` ajanın elle toast bileşeni yazmak yerine güvenilir bir kütüphane seçmesini sağlar.[^6] Kurulum: `npx skills@latest add emilkowalski/skills` |
| [**jakubkrehel/skills**](https://github.com/jakubkrehel/skills) | `better-ui` (iç içe köşe yuvarlaklığı, optik hizalama, tıklama alanı, animasyon), `better-typography`, `better-colors`, `better-accessibility`, `better-layout`. `interface-review` değişikliklerinizi bu başlıklara göre inceler.[^7] Kurulum: `npx skills add jakubkrehel/skills` |
| [**vercel-labs/agent-skills**](https://github.com/vercel-labs/agent-skills) | `react-best-practices`: React ve Next.js performansı için 40'tan fazla kural, etkisine göre sıralı (önce asenkron waterfall'lar ve bundle boyutu, en sonda mikro iyileştirmeler). Her kuralda yanlış ve doğru kod örneği var.[^8] Aynı repoda `web-design-guidelines` ile 100'den fazla erişilebilirlik, performans ve UX kuralıyla [arayüz denetleyebilirsiniz](https://github.com/vercel-labs/agent-skills). |
| [**mattpocock/skills**](https://github.com/mattpocock/skills) | Dört ajan hatasının etrafında kurulu: istenmeyeni yapmak, gereksiz uzun konuşmak, çalışmayan kod, dağılan mimari. `grill-me` planın her dalı netleşene kadar sizi sorguya çeker, `tdd` kırmızı-yeşil-refactor döngüsüyle ilerler, `code-review` farkı hem proje standartlarına hem spec'e göre ayrı ajanlarla inceler.[^9] |

`npx skills add` komutu [!claudeCode], [!cursor] ve diğer araçlara kurulum yapar.[^8] [Matt Pocock](https://www.mattpocock.com) skill'lerin küçük, uyarlanabilir ve birleştirilebilir olmasını savunuyor, yani süreci sahiplenen büyük çerçeveler yerine kendi hâlinize getirmenizi istiyor.[^9]

> [!TIP]
>
> Hepsini kurmayın. Her skill'in açıklaması her konuşmada bağlamda durur. Çok skill olunca [!claudeCode] bazı açıklamaları kırpar, `/skill-doctor` hiç kullanmadığınız skill'leri gösterir.[^1]

**Skill işe yarıyor mu?** Tek denemeyle karar vermeyin. Anthropic'e göre önce ajanın skill'siz nerede takıldığını görün, skill'i yalnızca o boşluğu kapatacak kadar yazın.[^2] Sonra aynı isteği yeni bir konuşmada skill'li ve skill'siz çalıştırıp karşılaştırın.[^1] [!claudeCode]'daki `skill-creator` eklentisi bu karşılaştırmayı otomatikleştiriyor.[^1]

## Kendin dene

1. Son haftada ajana üç kez aynı şekilde anlattığınız bir işi seçin (örneğin yeni bileşen ekleme). Normal istekle yaptırın, bitince *"bu işte verdiğim bağlamı bir skill'e dönüştür"* deyin.
2. Çıkan `SKILL.md`'yi kısaltın: [!claude]'un zaten bildiği her şeyi silin, `description`'a "ne zaman" cümlesini ekleyin.
3. Yeni bir konuşmada aynı işi skill'li ve skill'siz isteyin, kaç düzeltme turu gerektiğini karşılaştırın.
4. Hazır bir skill kurun (örneğin `react-best-practices`). Kurmadan önce `SKILL.md`'sini okuyun, sonra bir bileşene *"performans açısından incele"* dedirtin.

## Kaynaklar

1. [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills) *(article)* — Skill ne zaman yazılır, `SKILL.md` alanları, konumlar, tetikleme kontrolü ve açıklama bütçesi.
2. [Anthropic: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) *(article)* — Kısalık, `description` yazımı, katılık düzeyi, kontrol döngüsü ve değerlendirme.
3. [Cursor: Agent Skills](https://cursor.com/docs/skills) *(article)* — Cursor'daki skill klasörleri, `paths` alanı ve `/create-skill`.
4. [Anthropic: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) *(article)* — Jenerik arayüz estetiğinin nedeni ve frontend-design yönergesi. 12 Kasım 2025.
5. [Emil Kowalski: Agents with Taste](https://emilkowal.ski/ui/agents-with-taste) *(article)* — Arayüz zevkini kurallara dökme yöntemi: neden, karar tabloları, katı kurallar.
6. [emilkowalski/skills](https://github.com/emilkowalski/skills) *(repo)* — Animasyon, arayüz ince ayarı ve kütüphane seçimi skill'leri. MIT.
7. [jakubkrehel/skills](https://github.com/jakubkrehel/skills) *(repo)* — Arayüz, tipografi, renk, erişilebilirlik ve yerleşim skill'leri. MIT.
8. [Vercel: Introducing React Best Practices](https://vercel.com/blog/introducing-react-best-practices) *(article)* — 40'tan fazla React performans kuralı ve etkiye göre sıralama. Shu Ding ve Andrew Qu, 14 Ocak 2026.
9. [mattpocock/skills](https://github.com/mattpocock/skills) *(repo)* — Küçük ve birleştirilebilir mühendislik skill'leri: `grill-me`, `tdd`, `code-review`. MIT.
