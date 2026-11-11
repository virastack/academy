---
title: "Agentic kodlama"
description: "Claude Code ve Cursor gibi araçlarla planla, kodla, test et döngüsü ve subagent'lar."
lastVerified: "2026-11-03"
translationKey: "ai/agentic-coding"
quiz:
  - question: "Agent'ın planla uyguladığı sonuç beklediğiniz gibi çıkmadı. Cursor ekibinin önerisi nedir?"
    options:
      - "Değişiklikleri geri alıp planı daha net yazmak ve yeniden çalıştırmak"
      - "Takip mesajlarıyla adım adım düzeltmek"
      - "Testleri silip yeniden yazdırmak"
      - "Aynı konuşmada daha büyük bir modele geçmek"
    answer: 0
    explanation: "Cursor bunun çoğu zaman daha hızlı ve daha temiz sonuç verdiğini söylüyor. Agent istemediğiniz soyutlama eklerse sınır koyun: \"Yalnızca istenen değişikliği yap.\""
  - question: "Claude Code'un `/rewind` checkpoint'leri neden git'in yerini tutmaz?"
    options:
      - "Commit mesajı yazmaz"
      - "Yalnızca son bir saati kapsar"
      - "Yalnızca plan modunda çalışır"
      - "Yalnızca agent'ın dosya düzenleme araçlarıyla yaptığı değişiklikleri kapsar; terminal komutları ve deploy gibi uzak işlemler kapsanmaz"
    answer: 3
    explanation: "Bu yüzden küçük ve sık commit atın; her commit agent'ın bir sonraki hatasında geri dönebileceğiniz bir kayıt noktasıdır."
  - question: "\"Projedeki tüm `fetch` çağrılarına bak, hata yönetimi olmayanları raporla\" işini subagent'a vermenin kazancı nedir?"
    options:
      - "Subagent daha güçlü bir model kullanır"
      - "Okunan dosyaların içeriği ana konuşmaya girmez, yalnızca özet döner"
      - "Subagent dosyalara yazamaz"
      - "Subagent daha az token harcar"
    answer: 1
    explanation: "Subagent kendi context penceresinde çalışır. Aynı işte daha iyi cevap vermez ve token harcar; kazanç paralellik, uzun çıktıyı ana bağlamın dışında tutmak ve taze gözle incelemedir."
---

Agent'la çalışmak, sohbetteki *"soruyu sor, cevabı kopyala"* düzenine benzemez. Agent'a bir iş verirsiniz: dosyaları açar, kodu değiştirir, komutları çalıştırır. Sizin işiniz görevi doğru kurmak ve çıkan sonucu kontrol etmektir.

## Agent döngüsü

[!claudeCode] dokümanı agent'ın çalışmasını üç aşamada anlatıyor: **bağlam toplar**, **aksiyon alır**, **sonucu doğrular**. Hedef bitene kadar döngüyü tekrarlar ve her adımda bir öncekinden öğrendiğine göre ne yapacağını seçer.[^1] Siz de döngünün içindesiniz, istediğiniz an durdurup yönlendirebilirsiniz.[^1]

*"Sepet toplamı yanlış çıkıyor, düzelt"* dediğinizde agent şöyle ilerler: testleri çalıştırır, hata çıktısını okur, ilgili dosyaları arar, `CartSummary.tsx`'i düzenler, testleri yeniden çalıştırır.[^1] Yani sonucun kalitesi, agent'ın kullanabileceği bir kontrole (test, lint, tip kontrolü) bağlıdır. [Prompt ve Context Engineering](/academy/ai/prompt-and-context-engineering) rehberinde buna "bitiş ölçütü" demiştik.

## Planla, uygula, test et, commit et

[!cursor] ekibi işe şuradan başlıyor: yapabileceğiniz en etkili değişiklik, kodlamadan önce planlamak.[^2]

### 1. planla

Her iş için plan gerekmez. Plan modu, değişikliği diske yazılmadan önce gözden geçirmek istediğiniz işler içindir.[^3]

`Shift+Tab` ile Plan moduna geçin *(iki araçta da aynı kısayol)*. Agent dosyalara dokunmadan projeyi okur, gerekirse size soru sorar ve bir plan çıkarır.[^2][^3] Planı düzenleyebilirsiniz.

| Plan gerekir | Plan gerekmez |
| --- | --- |
| Ürün listesine filtre ve sıralama eklemek | Butondaki metni değiştirmek |
| Sepet state'ini başka bir kütüphaneye taşımak | Bir log satırı eklemek |
| Tanımadığınız bir kod tabanında özellik eklemek | Daha önce defalarca yaptığınız bir iş |

### 2. uygula

Planı onaylayıp agent'a planı izleyerek kodlatın. Sonuç beklediğiniz gibi çıkmadıysa takip mesajlarıyla düzeltmeye çalışmayın: değişiklikleri geri alın, planı daha net yazın ve yeniden çalıştırın. [!cursor] bunun çoğu zaman daha hızlı ve daha temiz sonuç verdiğini söylüyor.[^2]

Agent bazen istemediğiniz dosya, soyutlama veya esneklik ekler. Bunu görürseniz sınır koyun: *"Yalnızca istenen değişikliği yap. Başka özellik, refactor veya soyutlama ekleme."*[^4]

### 3. test et

Agent "bitti" dediğinde kanıt isteyin: test çıktısı, çalıştırdığı komut, ekran görüntüsü. Kanıtı okumak, doğrulamayı baştan yapmaktan hızlıdır.[^5] Testleri önce yazdırmak da iyi çalışıyor ([!cursor]'ın TDD akışı):[^2]

1. Agent'a beklenen girdi-çıktı çiftlerine göre test yazdırın. Henüz olmayan kod için sahte uygulama yazmamasını söyleyin.
2. Testleri çalıştırıp başarısız olduklarını görün. Bu aşamada uygulama kodu yazmasın.
3. Testleri commit edin.
4. Agent'tan testlere dokunmadan, hepsi geçene kadar kod yazmasını isteyin.
5. Uygulamayı commit edin.

Frontend'de bu, [Vitest ile Component Testi](/academy/vitest) rehberinde yazdığınız component testlerini agent'a hedef olarak vermek demektir.

**Hedef yalnızca testi geçirmek olmasın.** Agent bazen genel bir çözüm yerine yalnızca test girdilerine uyan kod yazar. *"Test girdilerine özel çözüm yazma, değer gömme. Test yanlışsa bana söyle."* deyin.[^4]

### 4. commit et

Küçük ve sık commit atın. Her commit, agent'ın bir sonraki hatasında geri dönebileceğiniz bir kayıt noktasıdır. [Addy Osmani](https://addyosmani.com)'nin kuralı net: açıklayamadığınız kodu commit etmeyin.[^6]

`/rewind` kodu, konuşmayı veya ikisini önceki bir isteğe geri alır. Bu yüzden cesur bir yaklaşımı denemek ucuzdur.[^5] Yine de [!claudeCode]'un checkpoint'leri git'in yerini tutmaz. Yalnızca agent'ın dosya düzenleme araçlarıyla yaptığı değişiklikleri kapsar, terminal komutlarıyla yapılanları ve uzak sistemlerdeki işlemleri *(deploy, veritabanı)* kapsamaz.[^1][^5]

> [!TIP]
>
> Agent hızlandıkça incelemeniz daha önemli hale gelir.[^2] Diff'i okuyun, yanlış yöne gidiyorsa durdurun. Agent'ı gözetimsiz bırakıp kusursuz sonuç beklemeyin. [Addy Osmani](https://addyosmani.com) da agent'ı denetimli kullandığını, her adımı izleyip gerektiğinde müdahale ettiğini yazıyor.[^6]

## Subagent'lar

Subagent, **kendi context penceresi olan yardımcı bir agent'tır**. Ağır işi orada yapar, ana konuşmaya yalnızca özet döner.[^7][^8] Böylece ana konuşmanızın bağlamı şişmez (bkz. [Prompt ve Context Engineering](/academy/ai/prompt-and-context-engineering)).

Örnek: *"Projedeki tüm `fetch` çağrılarına bak, hangilerinde hata yönetimi yok raporla."* Agent onlarca dosya okuyacak. Bunu subagent'a verirseniz o dosyaların içeriği ana konuşmaya girmez, yalnızca *"şu dört dosyada eksik"* özeti gelir.

Subagent aynı işte daha iyi cevap vermez, aynı model ya da daha küçüğü çalışır. Kazancınız paralellik, uzun çıktıyı ana konuşmanın dışında tutmak, taze gözle inceleme ve araçları kısıtlamaktır. Bedeli token'dır. Temiz başlayan bir subagent bağlamı yeniden toplarken işi doğrudan yapmaktan yavaş da kalabilir.[^5] Güncel modeller kendiliğinden devreder, bazen gereğinden sık. Basit işlerde ana konuşmada çalışmasını söyleyin.[^4]

### Ne zaman subagent, ne zaman ana konuşma?

| Subagent kullanın | Ana konuşmada kalın |
| --- | --- |
| Test çıktısı, log, kod arama gibi bir daha bakmayacağınız uzun çıktı üreten işler | Sürekli ileri geri gereken işler |
| Birbirinden bağımsız araştırmalar (auth, API, veri katmanı) | Planlama, uygulama ve testin aynı bağlamı paylaştığı işler |
| Yapılan işi bağımsız biriyle doğrulatmak | Hızlı, küçük değişiklikler |

**Hazır olanlar:** [!claudeCode]'da salt okunur ve hızlı arama yapan **Explore** ile plan modunda araştırma yapan **Plan** kendiliğinden devreye girer. [!cursor]'da **Explore** ve tarayıcıyı kontrol edip gürültülü DOM çıktısını özetleyen **Browser** var.[^7][^8] Bunları ayarlamanız gerekmez.

**Kendi subagent'ınızı yazmak:** Aynı işi aynı talimatla tekrar tekrar veriyorsanız subagent'ı bir Markdown dosyasına yazın. [!claudeCode]'da `.claude/agents/`, [!cursor]'da `.cursor/agents/` klasörüne konur ([!cursor] `.claude/agents/` klasörünü de okur).[^7][^8] En önemli alan `description`: agent ne zaman devredeceğine bunu okuyarak karar verir.[^7][^8]

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

[!claudeCode]'da `tools` ile araçları kısıtlarsınız. [!cursor]'da karşılığı `readonly: true`.[^7][^8]

> [!TIP]
>
> **Yazan ile kontrol eden ayrı olsun.** Bir oturum kodu yazar, başka bir oturum ya da subagent temiz bağlamda inceler. Temiz bağlam, az önce yazılan koda yatkın olmaz.[^5] Terminalde `/code-review` diff'i konuşmayı görmemiş yeni bir subagent'la inceler.[^5] [!cursor]'ın `verifier` örneği de aynı fikir: agent "bitti" dediği işi şüpheyle test eder, iddiayı olduğu gibi kabul etmez.[^8]

> [!WARNING]
>
> *"Boşluk bul"* diye yönlendirilen inceleyici sağlam işte bile bir şeyler bulur, peşine düşmek de gereksiz soyutlama ve savunmacı kod üretir. İnceleyiciye yalnızca doğruluğu veya belirtilen gereksinimleri etkileyen boşlukları raporlamasını söyleyin.[^5]

Birden çok agent'ı aynı anda çalıştırmak [Paralel agent'lar](/academy/ai/parallel-agents), spec, kod ve test rollerini bir hatta bağlamak [Agent takımı kurmak](/academy/ai/agent-teams) dersinde. Her subagent kendi token'ını harcar. İki-üç odaklı subagent'la başlayın, *"yardımcı"* diye onlarca genel subagent açmayın.[^8]

<details>
<summary>Hata ayıklama modu ([!cursor])</summary>

<ul>
<li>[!cursor]'ın Debug Mode'u tahminle düzeltme yapmaz. Önce birkaç hipotez üretir, koda log ekler, sizden hatayı yeniden üretmenizi ister, çalışma anı verisine bakarak kök nedeni bulur ve ona göre düzeltir. Yarış durumları, performans sorunları ve *"eskiden çalışıyordu"* türü hatalarda işe yarıyor.[^2]</li>
</ul>

</details>

> [!TIP]
>
> [!claudeCode]'u geliştiren Cat Wu ve [Boris Cherny](https://borischerny.com)'nin plan modunu ve subagent'ları kendi iş akışlarında nasıl kullandığını anlattığı sohbeti izleyebilirsiniz.[^9]

## Kendin dene

1. Birkaç dosyaya dokunan küçük bir özellik seçin (örneğin ürün listesine fiyat sıralaması). Plan modunda isteyin, planı okuyun, bir adımı silip ya da ekleyip uygulatın.
2. Aynı özellik için önce testleri yazdırın, başarısız olduklarını görün, sonra geçene kadar kod yazdırın. Kaç tur sürdüğünü not edin.
3. Bir subagent'a *"bu değişiklikte erişilebilirlik sorunu var mı, yalnızca raporla"* dedirtin. [!claudeCode]'daysanız `/context` ile ana konuşmanın bağlamının ne kadar değiştiğine bakın.

## Kaynaklar

1. [Claude Code: How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) *(doc)* — Agent döngüsü, araçlar, izin modları ve checkpoint'ler.
2. [Cursor: Best practices for coding with agents](https://cursor.com/blog/agent-best-practices) *(article)* — 9 Ocak 2026. Lee Robinson. Plan modu, TDD akışı, paralel agent'lar ve Debug Mode.
3. [Claude Code: Common workflows](https://code.claude.com/docs/en/common-workflows) *(doc)* — Plan modu ve değişikliği diske yazılmadan önce gözden geçirmek.
4. [Anthropic: Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) *(doc)* — Fazla mühendislik, testi geçirmeye odaklanma ve subagent'ların gereksiz kullanımı.
5. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Kanıt istemek, `/rewind`, `/code-review`, subagent maliyeti ve bağımsız inceleme.
6. [Addy Osmani: My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/) *(article)* — Sık commit, açıklayamadığın kodu commit etmeme ve agent'ı denetimli kullanma.
7. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — Subagent nedir, ne zaman kullanılır, nasıl yazılır.
8. [Cursor: Subagents](https://cursor.com/docs/subagents) *(doc)* — Cursor'da subagent'lar, paralel çalışma ve maliyet.
9. [Every: How to Use Claude Code Like the People Who Built It](https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it) *(video)* — Claude Code'un geliştiricilerinin plan modu, subagent ve kod incelemesi kullanımı.
