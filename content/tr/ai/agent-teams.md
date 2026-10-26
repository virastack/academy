---
title: "Ajan takımı kurmak"
description: "Spec, frontend, test ve inceleme rollerinde subagent'larla hat kurma, hata döngüsü, lead özeti ve agent teams."
lastVerified: "2026-10-26"
translationKey: "ai/agent-teams"
---

Hedef şu: bir ajan spec'i yazar, ikincisi kodu yazar, üçüncüsü test eder. Test kırılırsa iş kod yazan ajana geri döner. En sonda bir **lead** *(yönetici ajan)* ne yapıldığını size özetler. Önce hangi işin takım gerektirdiğine bakalım.

## Önce desen, sonra araç

[!anthropic]'in ajan rehberi iki şeyi ayırıyor. **Workflow**, adımları önceden belli olan, kodla ya da prompt'la sabitlenmiş bir akıştır. **Ajan** ise adımlarına kendisi karar verir.[^1] Ajan takımı da bilinen birkaç desenin birleşimidir:[^1]

| Desen | Ne yapar | Frontend örneği |
| :-- | :-- | :-- |
| **Zincir** | Her adım bir öncekinin çıktısını işler | Spec, sonra kod, sonra test |
| **Paralel** | Bağımsız işleri aynı anda yapar | Güvenlik, performans ve erişilebilirlik incelemesi |
| **Orkestratör-işçi** | Lead işi böler, işçilere dağıtır, sonucu birleştirir | Lead'in görevleri rollere vermesi |
| **Değerlendirici döngüsü** | Biri üretir, diğeri kontrol edip geri bildirim verir | Test kırılınca frontend'e geri dönmek |

Rehberin ana tavsiyesi: işe yarayan en basit çözümü bulun, karmaşıklığı ancak sonucu ölçülebilir şekilde iyileştiriyorsa ekleyin.[^1] Tek ajanın plan modu ve bir test komutu çoğu işe yeter.

## Rolleri yazmak

Her rol bir subagent dosyasıdır *(bkz. [Agentic kodlama](/academy/ai/agentic-coding))*. [!claudeCode]'da `.claude/agents/` altına yazılır. Rolü asıl belirleyen `tools` alanıdır: neye dokunabileceği.[^2]

```markdown
---
name: frontend-dev
description: Implements UI tasks from SPEC.md. Use after the spec is approved or when tests fail.
tools: Read, Edit, Write, Bash
---

Sen bir React ve Tailwind geliştiricisisin. SPEC.md'deki göreve göre kodu yaz.
Mevcut bileşenleri kullan, yeni paket ekleme. Test dosyalarına dokunma.
Bitince değiştirdiğin dosyaları ve çalıştırdığın komutları listele.
```

```markdown
---
name: qa-tester
description: Writes and runs tests against SPEC.md acceptance criteria. Use after frontend-dev finishes.
tools: Read, Write, Bash
---

SPEC.md'deki her kabul kriteri için Vitest veya Playwright testi yaz ve çalıştır.
Uygulama koduna dokunma. Sonucu test-report.md'ye yaz:
geçen ve kırılan testler, kırılanların hata çıktısı.
```

Diğer iki rol aynı kalıpla yazılır:

| Rol | `tools` | Çıktısı |
| :-- | :-- | :-- |
| `spec-writer` | `Read, Write` | `SPEC.md` |
| `frontend-dev` | `Read, Edit, Write, Bash` | Kod |
| `qa-tester` | `Read, Write, Bash` | Testler ve `test-report.md` |
| `reviewer` | `Read, Grep, Glob` | Bulgular *(yalnızca rapor)* |

Rollerin birbirine dosya üzerinden iş vermesi önemlidir. Ajanlar konuşmaları değil `SPEC.md` ve `test-report.md`'yi paylaşır, böylece her biri temiz bir bağlamla başlar.

## Lead: hattı kurmak

Lead ayrı bir dosya değildir, ana oturumunuzdur. Subagent'lar sonucu ona döner, o da bir sonrakine aktarır.[^2] [!anthropic]'in kendi çoklu ajan sistemindeki ders: lead her işçiye **amacı, çıktı biçimini, kullanacağı araçları ve sınırları** açıkça vermeli. Belirsiz talimat, aynı işin iki kez yapılmasına ya da boşluk kalmasına yol açıyor.[^3]

```text
Sepete kupon kodu özelliğini şu hatla yap:

1. spec-writer: kullanıcıyla netleştirip SPEC.md yaz. Onayımı bekle.
2. frontend-dev: SPEC.md'deki görevleri uygula.
3. qa-tester: kabul kriterlerini test et, test-report.md yaz.
4. Kırılan test varsa raporu frontend-dev'e ver ve 2. adıma dön.
   En fazla 3 tur. 3 turda geçmezse dur ve bana sor.
5. reviewer: diff'i SPEC.md'ye göre incele. Yalnızca doğruluğu ve
   kriterleri etkileyen bulguları raporla.
6. Bana özet ver: değişen dosyalar, test sonucu, tur sayısı, açık kalanlar.
```

Tur sınırı döngünün sonsuza gitmesini önler. İnceleyiciye *"yalnızca doğruluğu etkileyenleri raporla"* demek de gereksiz düzeltme turlarını keser.[^4] Testlerin gerçekten geçtiğini ajanın sözüne bırakmak istemiyorsanız [Hooks ve izin modları](/academy/ai/hooks) dersindeki `Stop` hook'unu ekleyin.

> [!TIP]
>
> Hattı önce bir kez elle yürütün: her adımı siz isteyin, nerede takıldığını görün. Akış oturunca lead prompt'unu bir skill'e çevirin *(bkz. [Skills](/academy/ai/skills))*.

## Agent teams

Subagent'lar yalnızca lead'e rapor verir. [!claudeCode]'un **agent teams** özelliğinde ise her üye ayrı bir oturumdur, ortak bir görev listesinden iş alır ve **birbirine doğrudan mesaj atar**.[^5]

| | Subagent | Agent teams |
| :-- | :-- | :-- |
| **İletişim** | Sonucu lead'e döner | Üyeler birbiriyle konuşur |
| **Koordinasyon** | Lead yönetir | Ortak görev listesi |
| **Token** | Daha az | Her üye ayrı oturum, çok daha fazla |
| **En iyi olduğu iş** | Sonucun yettiği odaklı işler | Tartışma ve karşılıklı kontrol gerektiren işler |

Özellik deneyseldir ve varsayılan olarak kapalıdır. Ayarlarda `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` değişkenini `1` yaparak açılır.[^5] Doküman en güçlü kullanımları şöyle sıralıyor: araştırma ve inceleme, birbirinden bağımsız modüller, rakip hipotezlerle hata ayıklama *(üyeler birbirinin teorisini çürütmeye çalışır)*.[^5] Başlangıç için 3-5 üye öneriliyor. İki üyenin aynı dosyayı düzenlemesi üzerine yazmaya yol açar, bu yüzden işi dosya sahipliğine göre bölün.[^5]

```text
PR #42'yi incelemek için üç üyeli bir takım kur:
biri güvenliğe, biri performansa, biri test kapsamına baksın.
Bulgularını birbirine sorgulatıp bana tek liste ver.
```

> [!WARNING]
>
> Agent teams oturum devam ettirmede, görev durumunda ve kapanışta bilinen sınırlamalarla geliyor.[^5] Günlük işinizi buna bağlamadan önce subagent hattıyla başlayın.

## Ne zaman gerekmez?

[!anthropic]'in ölçümünde ajanlar sohbetin yaklaşık 4 katı, çoklu ajan sistemleri yaklaşık 15 katı token harcıyor.[^3] Aynı yazı, ajanlar arasında çok bağımlılık olan ve az paralelleşen işlerin çoklu ajana uygun olmadığını, çoğu kodlama işinin de bu gruba girdiğini söylüyor.[^3]

| Takım kurun | Tek ajan yeter |
| :-- | :-- |
| Rolleri ayrı dosyalara dokunan, uzun bir özellik | Birkaç dosyalık değişiklik |
| Yazan ile kontrol edenin ayrı olması gereken iş | Hızlı bir hata düzeltmesi |
| Farklı açılardan paralel inceleme | Sürekli ileri geri konuşma gerektiren tasarım işi |

[!cursor]'da da aynı hat kurulabilir. Subagent'lar `.cursor/agents/` altına yazılır ve [!cursor] `.claude/agents/` klasörünü de okur.[^6]

## Kendin dene

- `frontend-dev` ve `qa-tester` dosyalarını yazın, lead prompt'unu küçük bir özellikle çalıştırın. Kaç turda testler geçti?
- `qa-tester`'ın `tools` listesinden `Write`'ı çıkarın. Rapor dosyası yazamayınca ne oluyor?
- Bir kabul kriterini kasıtlı olarak test edilemez yazın. `qa-tester` bunu nasıl raporluyor?
- Agent teams'i açıp aynı PR'ı üç üyeye inceletin, sonra tek bir subagent'a inceletin. Bulgular ne kadar farklı?

## Detaylı öğrenmek için

- **Yazı:** [!anthropic], "Building effective agents"; zincir, yönlendirme, paralel, orkestratör-işçi ve değerlendirici desenleri.[^1]
- **Yazı:** [!anthropic], "How we built our multi-agent research system"; lead'in görev dağıtması, token maliyeti ve çoklu ajanın sınırları.[^3]
- **Resmi doküman:** [!claudeCode] "Agent teams"; üyeleri yönetme, görev listesi, kalite hook'ları ve sınırlamalar.[^5]

## Kaynaklar

1. [Anthropic: Building effective agents](https://www.anthropic.com/research/building-effective-agents) *(article)* — Erik Schluntz ve Barry Zhang, 19 Aralık 2024. Workflow ile ajan farkı ve beş temel desen.
2. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — Subagent dosyası, `tools` alanı ve subagent'ları zincirleme.
3. [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) *(article)* — 13 Haziran 2025. Lead ve işçi ajanlar, görev tarifi, token maliyeti ve uygun olmayan işler.
4. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Bağımsız inceleyici ve inceleyiciyi doğruluğu etkileyen bulgularla sınırlamak.
5. [Claude Code: Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) *(doc)* — Agent teams'i açma, subagent'larla farkı, kullanım örnekleri ve sınırlamalar.
6. [Cursor: Subagents](https://cursor.com/docs/subagents) *(doc)* — Cursor'da subagent dosyaları ve `.claude/agents/` desteği.
