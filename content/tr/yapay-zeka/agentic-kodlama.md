---
title: "Agentic Kodlama"
description: "Claude Code ve Cursor gibi araçlarla planla, kodla, test et döngüsü ve subagent'lar."
lastVerified: "2026-10-14"
translationKey: "yapay-zeka/agentic-kodlama"
---

Ajanla çalışmak, sohbetteki *"soruyu sor, cevabı kopyala"* düzenine benzemez. Ajana bir iş verirsiniz: dosyaları açar, kodu değiştirir, komutları çalıştırır. Sizin işiniz görevi doğru kurmak ve çıkan sonucu kontrol etmektir.

## Ajan döngüsü

[!claudeCode] dokümanı ajanın çalışmasını üç aşamada anlatıyor: **bağlam toplar**, **aksiyon alır**, **sonucu doğrular**. Hedef bitene kadar döngüyü tekrarlar ve her adımda bir öncekinden öğrendiğine göre ne yapacağını seçer.[^1] Siz de döngünün içindesiniz, istediğiniz an durdurup yönlendirebilirsiniz.[^1]

*"Sepet toplamı yanlış çıkıyor, düzelt"* dediğinizde ajan şöyle ilerler: testleri çalıştırır, hata çıktısını okur, ilgili dosyaları arar, `CartSummary.tsx`'i düzenler, testleri yeniden çalıştırır.[^1] Yani sonucun kalitesi, ajanın kullanabileceği bir kontrole (test, lint, tip kontrolü) bağlıdır. [Prompt ve Context Engineering](/academy/yapay-zeka/prompt-ve-context-engineering) rehberinde buna "bitiş ölçütü" demiştik.

## Planla, uygula, test et, commit et

[!claudeCode]'un önerdiği akış dört adım: keşfet, planla, uygula, commit.[^2] [!cursor] ekibi de aynı yerden başlıyor: yapabileceğiniz en etkili değişiklik, kodlamadan önce planlamak.[^3]

### 1. Planla

Her iş için plan gerekmez. [!claudeCode] dokümanı pratik bir ölçüt veriyor: değişikliği tek cümleyle anlatabiliyorsanız planı atlayın.[^2]

`Shift+Tab` ile Plan moduna geçin (iki araçta da aynı kısayol). Ajan dosyalara dokunmadan projeyi okur, gerekirse size soru sorar ve bir plan çıkarır.[^2][^3] Planı düzenleyebilirsiniz.

| Plan gerekir | Plan gerekmez |
| --- | --- |
| Ürün listesine filtre ve sıralama eklemek | Butondaki metni değiştirmek |
| Sepet state'ini başka bir kütüphaneye taşımak | Bir log satırı eklemek |
| Tanımadığınız bir kod tabanında özellik eklemek | Daha önce defalarca yaptığınız bir iş |

### 2. Uygula

Planı onaylayıp ajana planı izleyerek kodlatın. Sonuç beklediğiniz gibi çıkmadıysa takip mesajlarıyla düzeltmeye çalışmayın: değişiklikleri geri alın, planı daha net yazın ve yeniden çalıştırın. [!cursor] bunun çoğu zaman daha hızlı ve daha temiz sonuç verdiğini söylüyor.[^3]

### 3. Test et

Ajan "bitti" dediğinde kanıt isteyin: test çıktısı, çalıştırdığı komut, ekran görüntüsü. Kanıtı okumak, doğrulamayı baştan yapmaktan hızlıdır.[^2] Testleri önce yazdırmak da iyi çalışıyor ([!cursor]'ın TDD akışı):[^3]

1. Ajana beklenen girdi-çıktı çiftlerine göre test yazdırın. Henüz olmayan kod için sahte uygulama yazmamasını söyleyin.
2. Testleri çalıştırıp başarısız olduklarını görün. Bu aşamada uygulama kodu yazmasın.
3. Testleri commit edin.
4. Ajandan testlere dokunmadan, hepsi geçene kadar kod yazmasını isteyin.
5. Uygulamayı commit edin.

Frontend'de bu, [Vitest ile Component Testi](/academy/vitest) rehberinde yazdığınız component testlerini ajana hedef olarak vermek demektir.

### 4. Commit et

Küçük ve sık commit atın. Her commit, ajanın bir sonraki hatasında geri dönebileceğiniz bir kayıt noktasıdır. Addy Osmani'nin kuralı net: açıklayamadığınız kodu commit etmeyin.[^4]

[!claudeCode]'un checkpoint'leri git'in yerini tutmaz. Yalnızca ajanın dosya düzenleme araçlarıyla yaptığı değişiklikleri kapsar, terminal komutlarıyla yapılanları ve uzak sistemlerdeki işlemleri (deploy, veritabanı) kapsamaz.[^1][^2]

> [!TIP]
>
> Ajan hızlandıkça incelemeniz daha önemli hale gelir.[^3] Diff'i okuyun, yanlış yöne gidiyorsa durdurun. Ajanı gözetimsiz bırakıp kusursuz sonuç beklemeyin. Addy Osmani da ajanı denetimli kullandığını, her adımı izleyip gerektiğinde müdahale ettiğini yazıyor.[^4]

## Subagent'lar

Subagent, **kendi context penceresi olan yardımcı bir ajandır**. Ağır işi orada yapar, ana konuşmaya yalnızca özet döner.[^5][^6] Böylece ana konuşmanızın bağlamı şişmez (bkz. [Prompt ve Context Engineering](/academy/yapay-zeka/prompt-ve-context-engineering)).

Örnek: *"Projedeki tüm `fetch` çağrılarına bak, hangilerinde hata yönetimi yok raporla."* Ajan onlarca dosya okuyacak. Bunu subagent'a verirseniz o dosyaların içeriği ana konuşmaya girmez, yalnızca *"şu dört dosyada eksik"* özeti gelir.

### Ne zaman subagent, ne zaman ana konuşma?

| Subagent kullanın | Ana konuşmada kalın |
| --- | --- |
| Test çıktısı, log, kod arama gibi bir daha bakmayacağınız uzun çıktı üreten işler | Sürekli ileri geri gereken işler |
| Birbirinden bağımsız araştırmalar (auth, API, veri katmanı) | Planlama, uygulama ve testin aynı bağlamı paylaştığı işler |
| Yapılan işi bağımsız biriyle doğrulatmak | Hızlı, küçük değişiklikler |

**Hazır olanlar:** [!claudeCode]'da salt okunur ve hızlı arama yapan **Explore** ile plan modunda araştırma yapan **Plan** kendiliğinden devreye girer. [!cursor]'da **Explore** ve tarayıcıyı kontrol edip gürültülü DOM çıktısını özetleyen **Browser** var.[^5][^6] Bunları ayarlamanız gerekmez.

**Kendi subagent'ınızı yazmak:** Aynı işi aynı talimatla tekrar tekrar veriyorsanız subagent'ı bir Markdown dosyasına yazın. [!claudeCode]'da `.claude/agents/`, [!cursor]'da `.cursor/agents/` klasörüne konur ([!cursor] `.claude/agents/` klasörünü de okur).[^5][^6] En önemli alan `description`: ajan ne zaman devredeceğine bunu okuyarak karar verir.[^5][^6]

```markdown
---
name: a11y-reviewer
description: Değişen bileşenlerde erişilebilirlik sorunlarını inceler. Bir bileşen yazıldıktan veya değiştirildikten sonra kullan.
tools: Read, Grep, Glob
---

Sen erişilebilirlik konusunda titiz bir frontend geliştiricisin.
Değişen bileşenlerde şunlara bak: etiketsiz form alanları, `alt` metni
olmayan görseller, klavyeyle erişilemeyen etkileşimler, yetersiz kontrast.
Dosyalara yazma, bulduklarını dosya ve satır numarasıyla raporla.
```

[!claudeCode]'da `tools` ile araçları kısıtlarsınız. [!cursor]'da karşılığı `readonly: true`.[^5][^6]

> [!TIP]
>
> **Yazan ile kontrol eden ayrı olsun.** [!claudeCode] dokümanı yazar/inceleyici düzenini öneriyor: bir oturum kodu yazar, başka bir oturum (ya da subagent) temiz bağlamda inceler. Temiz bağlam, az önce yazılan koda yatkın olmaz.[^2] [!cursor]'ın `verifier` örneği de aynı fikir: ajan "bitti" dediği işi şüpheyle test eder, iddiayı olduğu gibi kabul etmez.[^6]

> [!WARNING]
>
> *"Boşluk bul"* diye yönlendirilen inceleyici sağlam işte bile bir şeyler bulur, peşine düşmek de gereksiz soyutlama ve savunmacı kod üretir. İnceleyiciye yalnızca doğruluğu veya belirtilen gereksinimleri etkileyen boşlukları raporlamasını söyleyin.[^2]

**Paralel çalışma:** Birden çok ajan aynı klasörde çalışırsa birbirinin dosyasını ezer. Her ajanı kendi git worktree'sinde çalıştırın. [!cursor] worktree'leri kendisi yönetir, [!claudeCode]'da ayrı oturumları worktree'lerde açarsınız.[^2][^3][^6]

**Maliyet:** Her subagent kendi token'ını harcar. [!cursor]'a göre beş subagent'ı paralel çalıştırmak, kabaca tek ajanın beş katı token demek. Bağlam izolasyonu hız değil düzen sağlar: basit işte ana ajan daha hızlıdır.[^6] İki-üç odaklı subagent'la başlayın, "yardımcı" diye onlarca genel subagent açmayın.[^6] [!claudeCode]'da subagent açıklamaları da bağlamdan yer kaplar.[^5]

<details>
<summary>Hata ayıklama modu ([!cursor])</summary>

<ul>
<li>[!cursor]'ın Debug Mode'u tahminle düzeltme yapmaz. Önce birkaç hipotez üretir, koda log ekler, sizden hatayı yeniden üretmenizi ister, çalışma anı verisine bakarak kök nedeni bulur ve ona göre düzeltir. Yarış durumları, performans sorunları ve *"eskiden çalışıyordu"* türü hatalarda işe yarıyor.[^3]</li>
</ul>

</details>

> [!TIP]
>
> [!claudeCode]'u geliştiren Cat Wu ve Boris Cherny'nin plan modunu ve subagent'ları kendi iş akışlarında nasıl kullandığını anlattığı sohbeti izleyebilirsiniz.[^7]

## Kendin dene

1. Birkaç dosyaya dokunan küçük bir özellik seçin (örneğin ürün listesine fiyat sıralaması). Plan modunda isteyin, planı okuyun, bir adımı silip ya da ekleyip uygulatın.
2. Aynı özellik için önce testleri yazdırın, başarısız olduklarını görün, sonra geçene kadar kod yazdırın. Kaç tur sürdüğünü not edin.
3. Bir subagent'a *"bu değişiklikte erişilebilirlik sorunu var mı, yalnızca raporla"* dedirtin. [!claudeCode]'daysanız `/context` ile ana konuşmanın bağlamının ne kadar değiştiğine bakın.

## Ek kaynaklar

1. [Claude Code: How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) *(article)* — Ajan döngüsü, araçlar, izin modları ve checkpoint'ler.
2. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(article)* — Keşfet-planla-uygula-commit akışı, doğrulama ve yazar/inceleyici düzeni.
3. [Cursor: Best practices for coding with agents](https://cursor.com/blog/agent-best-practices) *(article)* — Plan modu, TDD akışı, paralel ajanlar ve Debug Mode. Lee Robinson, 9 Ocak 2026.
4. [Addy Osmani: My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/) *(article)* — Sık commit, açıklayamadığın kodu commit etmeme ve ajanı denetimli kullanma.
5. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(article)* — Subagent nedir, ne zaman kullanılır, nasıl yazılır.
6. [Cursor: Subagents](https://cursor.com/docs/subagents) *(article)* — Cursor'da subagent'lar, paralel çalışma ve maliyet.
7. [Every: How to Use Claude Code Like the People Who Built It](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it) *(video)* — Claude Code'un geliştiricilerinin plan modu, subagent ve kod incelemesi kullanımı.
