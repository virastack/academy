---
title: "Gözetimsiz agent"
description: "Bulutta ve arka planda çalışan agent'lar, GitHub'da @claude ile iş verme, otomatik PR incelemesi ve sonucu doğrulama."
lastVerified: "2026-10-26"
translationKey: "ai/unattended-agents"
---

Şimdiye kadar agent sizin bilgisayarınızda, siz başındayken çalıştı. Oysa birçok iş sizi beklemeden de ilerleyebilir. Telefondan bir hata düzeltmesi başlatıp akşam PR'ını incelemek, her PR'a otomatik inceleme yaptırmak bunlara örnek. Bu derste agent'ı makinenizden ve ekrandan ayırıyoruz.

## Üç yol

| Yol | Nerede çalışır | Nasıl başlarsınız | Sonuç |
| :-- | :-- | :-- | :-- |
| **Bulut oturumu** | Sağlayıcının sanal makinesinde | Tarayıcı, mobil uygulama, terminal | Branch ve PR |
| **CI'da agent** | GitHub Actions runner'ında | PR veya issue'da `@claude`, ya da her PR'da otomatik | PR yorumu veya commit |
| **Headless** | Sizin makinenizde veya bir script'te | `claude -p "..."` | Terminal çıktısı veya JSON |

## Bulut oturumu

Bulut oturumu, sizin makineniz yerine sağlayıcının yönettiği bir sanal makinede çalışan agent oturumudur. Laptopunuzu kapatsanız da çalışmaya devam eder, ona her cihazdan bakabilirsiniz.[^1] [!claudeCode]'da [claude.ai/code](https://claude.ai/code) adresinden, mobil uygulamanın Code sekmesinden ya da terminalden başlatılır:[^1]

```bash
claude --cloud "Fix the pagination bug in the product list and run the tests"
```

Sanal makine repoyu GitHub'dan klonlar, yerel klasörünüzü değil. Yerel commit'leriniz varsa önce push edin.[^1] Her `--cloud` komutu ayrı bir oturum açar, yani birkaç işi aynı anda başlatabilirsiniz.[^1] İş bitince PR açarsınız ya da `claude --teleport` ile oturumu branch'iyle birlikte terminalinize çekip devam edersiniz.[^1]

[!claudeCode] dokümanının önerdiği akış: planı yerelde plan modunda birlikte çıkarın, bir dosyaya yazıp push edin, uygulamayı buluta verin.[^1] [Spec-driven geliştirme](/academy/ai/spec-driven-development) dersindeki `SPEC.md` tam olarak bu iş için.

**PR'ı takip ettirmek:** Auto-fix açık olduğunda agent PR'daki CI hatalarını ve inceleme yorumlarını izler. Düzeltme netse kendisi push eder, yorum belirsizse size sorar.[^1]

[!cursor]'da karşılığı Cloud Agents. Web'den, mobilden, Slack'ten ya da bir PR'a `@cursor` yazarak başlatılır. Agent ayrı bir branch'te çalışır ve ekran görüntüleriyle birlikte PR açar.[^2]

> [!NOTE]
>
> Bulut oturumu planınızın kullanım limitinden harcar. Paralel başlattığınız her oturum limiti orantılı olarak tüketir.[^1]

## GitHub'da agent

[!claudeCode] GitHub Actions ile agent'ı reponuzun içine koyarsınız. En kolay kurulum, [!claudeCode]'da `/install-github-app` komutudur. GitHub App'i kurar, anahtarı repo secret'ı olarak ekler ve workflow dosyası için bir PR hazırlar.[^3] Sonra herhangi bir issue veya PR yorumunda agent'a iş verebilirsiniz:[^3]

```text
@claude CartSummary'deki TypeError'ı düzelt ve bir test ekle
```

Agent'ı her PR'da kendiliğinden çalıştırmak için workflow'a bir `prompt` verirsiniz. Bu durumda agent bahsedilmeyi beklemez.[^3] Her PR'da otomatik inceleme yapan workflow:[^3]

```yaml
# .github/workflows/code-review.yml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          plugin_marketplaces: "https://github.com/anthropics/claude-code.git"
          plugins: "code-review@claude-code-plugins"
          prompt: "/code-review:code-review --comment ${{ github.repository }}/pull/${{ github.event.pull_request.number }}"
          claude_args: '--allowedTools "mcp__github_inline_comment__create_inline_comment"'
```

`--comment` bulguları PR'a satır yorumu olarak yazdırır. Taslak PR'lar atlanır.[^3] Agent projenin `CLAUDE.md`'sini okuyarak inceler. İnceleme ölçütlerinizi oraya yazın.[^3]

Maliyet iki kalemden oluşur: GitHub Actions dakikaları ve token. `claude_args` içinde `--max-turns` ile tur sayısını, workflow'a `timeout-minutes` ekleyerek süreyi sınırlayın.[^3]

> [!CAUTION]
>
> API anahtarını asla workflow dosyasına yazmayın. Repo secret'ı olarak saklayın ve workflow'a yalnızca ihtiyaç duyduğu izinleri verin.[^3]

## Headless

`claude -p` agent'ı sohbet açmadan tek bir komutla çalıştırır. Bir script'in, pre-commit hook'unun ya da CI adımının parçası olur:[^4]

```bash
claude -p "Fix the lint errors in the changed files" \
  --allowedTools "Edit,Bash(pnpm lint *)"
```

`--output-format json` sonucu bir script'in okuyabileceği biçimde verir. `--allowedTools` gözetimsiz çalışmada yalnızca izin verdiğiniz araçların kullanılmasını sağlar.[^4]

## Sonucu doğrulamak

Agent ne kadar uzun gözetimsiz çalışırsa, işi bitti saymadan önceki bağımsız kontrol o kadar önemli olur.[^4] Üç kural:

1. **Kontrol edilebilir bir hedef verin.** Agent çalıştırabileceği bir kontrol olmadan "bitti gibi görünüyor" noktasında durur.[^4] Test komutunu prompt'a yazın ya da [Hooks ve izin modları](/academy/ai/hooks) dersindeki `Stop` hook'unu kullanın.
2. **Kanıt isteyin.** Test çıktısı, çalıştırılan komut, ekran görüntüsü. Kanıtı okumak, doğrulamayı baştan yapmaktan hızlıdır.[^4]
3. **Riskli işi izole edin.** [Simon Willison](https://simonwillison.net) riskli işleri yerel terminal yerine bulutta, asenkron çalışan agent'lara veriyor.[^5] Agent sizin makinenize ve anahtarlarınıza dokunamaz.

> [!WARNING]
>
> Issue ve PR yorumları dışarıdan yazılabilir ve agent'ın okuduğu metne talimat gizlenebilir *(bkz. [Güvenlik ve maliyet](/academy/ai/security-and-cost))*. Auto-fix açıkken agent sizin adınıza yorum da yazar. Yorumla tetiklenen deploy otomasyonu olan repolarda auto-fix'i kapatın.[^1]

## Kendin dene

- Küçük bir işi `claude --cloud` ile başlatın ve terminali kapatın. Telefondan oturuma baktığınızda agent ne yapıyor?
- Bir test reposunda `/install-github-app` çalıştırıp bir issue'ya `@claude` ile küçük bir istek yazın. Sonuç yorum mu, PR mı?
- Otomatik inceleme workflow'unu açın ve kasıtlı olarak hatalı bir PR gönderin. İnceleme hatayı buluyor mu?
- `claude -p` ile aynı isteği bir kez `--allowedTools` vererek, bir kez vermeden çalıştırın. Fark ne?

## Detaylı öğrenmek için

- **Resmi doküman:** [!claudeCode] "Use Claude Code in the cloud"; bulut ortamları, `--teleport`, auto-fix ve güvenlik.[^1]
- **Resmi doküman:** [!claudeCode] "GitHub Actions"; kurulum, örnek workflow'lar ve maliyet kontrolü.[^3]
- **Yazı:** [Simon Willison](https://simonwillison.net), "Embracing the parallel coding agent lifestyle"; yerel ve bulut agent'ları hangi işlere verdiği.[^5]

## Kaynaklar

1. [Claude Code: Use Claude Code in the cloud](https://code.claude.com/docs/en/claude-code-on-the-web) *(doc)* — Bulut oturumu, `--cloud`, `--teleport`, auto-fix, limitler ve güvenlik.
2. [Cursor: Cloud Agents](https://cursor.com/docs/cloud-agent) *(doc)* — Bulutta çalışan agent'lar, başlatma yolları ve PR olarak teslim.
3. [Claude Code: GitHub Actions](https://code.claude.com/docs/en/github-actions) *(doc)* — `/install-github-app`, `@claude`, otomatik inceleme workflow'u, secret'lar ve maliyet.
4. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Headless mod, `--allowedTools`, doğrulama ve bağımsız inceleme.
5. [Simon Willison](https://simonwillison.net): [Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) *(article)* — 5 Ekim 2025. Riskli işler için asenkron bulut agent'ları.
