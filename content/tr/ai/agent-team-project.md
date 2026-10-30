---
title: "AI ekibiyle özellik"
description: "Spec, frontend, test ve inceleme agent'larından oluşan bir ekiple sepete kupon özelliği ekleme."
lastVerified: "2026-10-26"
translationKey: "ai/agent-team-project"
---

## Senaryo

Elinizde kuponsuz bir sepet var. Kupon özelliğini kendiniz yazmayacaksınız. Dört agent'lık bir ekip kuracak ve işi bir lead'e yönettireceksiniz:

- **spec-writer** isteği test edilebilir kriterlerle `SPEC.md`'ye çevirir ve sizin onayınızı bekler.
- **frontend-dev** spec'i uygular, test dosyalarına dokunmaz.
- **qa-tester** her kriter için test yazar, çalıştırır ve `test-report.md` yazar.
- Test kırılırsa rapor frontend-dev'e döner. En fazla üç tur.
- **reviewer** diff'i spec'e göre temiz bir bağlamda inceler.
- Lead size değişen dosyaları, test sonucunu ve tur sayısını özetler.

Amaç kuponun kendisi değil, ekibin kurallara bağlı çalışmasıdır. Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Test edilebilir kriterler, kapsam dışı, sınırlar | `SPEC.md` | Spec-driven geliştirme |
| Korunan dosyalar, testler geçmeden bitirmeme | `.claude/settings.json`, `.claude/hooks/` | Hooks ve izin modları |
| Rol başına araç kısıtı | `.claude/agents/*.md` | Agent takımı kurmak |
| Hat, hata döngüsü, tur sınırı, özet | `.claude/skills/feature-team/SKILL.md` | Agent takımı kurmak, Skills |
| Proje kuralları | `CLAUDE.md` | Prompt ve context engineering |

Projenin başlangıç ve çözüm hâli GitHub'da: [examples/ai/agent-team](https://github.com/virastack/academy/tree/main/examples/ai/agent-team). Çözümdeki testler ve `test-report.md` ile kendi sonucunuzu karşılaştırın.

## Adım 1: Projeyi kurun

```bash
cd examples/ai/agent-team/starter
npm install
npx playwright install chromium
npm test
```

Başlangıçta 3 birim testi ve 1 Playwright testi geçer. Hook'lar JSON okumak için `jq` kullanır, yoksa kurun.[^1]

## Adım 2: Rolleri okuyun

`.claude/agents/` altındaki dört dosyayı açın. Rolleri birbirinden ayıran şey `tools` alanı ve "neye dokunma" satırlarıdır.[^2]

| Rol | `tools` | Dokunmaz |
| :-- | :-- | :-- |
| `spec-writer` | `Read, Glob, Grep, Write` | Kod |
| `frontend-dev` | `Read, Glob, Grep, Edit, Write, Bash` | Test dosyaları |
| `qa-tester` | `Read, Glob, Grep, Write, Bash` | Uygulama kodu |
| `reviewer` | `Read, Glob, Grep, Bash` | Hiçbir dosya *(yalnızca rapor)* |

`qa-tester`'ın raporu her zaman `STATUS: PASS` veya `STATUS: FAIL` ile biter. Lead döngüye devam edip etmeyeceğine bu satıra bakarak karar verir. Agent'lar arasında net bir çıktı biçimi olması, işin iki kez yapılmasını ve boşluk kalmasını önler.[^3]

## Adım 3: Kuralları hook'a bağlayın

`.claude/settings.json` iki hook kaydeder:

- `PreToolUse`: `package-lock.json`, `.env` ve `.git/` altına yazmayı engeller.
- `Stop`: birim testleri kırıksa agent'ın bitirmesine izin vermez, hata çıktısını geri verir.[^1]

```json
"Stop": [
  {
    "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/require-tests.sh" }]
  }
]
```

Aynı dosyada test, build ve `git diff` komutlarına önceden izin verilir. `npm install` ise yasaktır, agent yeni paket ekleyemez.[^4] Böylece ekip her komut için sizi beklemez ama sınırın dışına da çıkamaz.

## Adım 4: Ekibi çalıştırın

Lead prompt'u bir skill olarak yazıldı. `disable-model-invocation: true` olduğu için yalnızca siz çağırırsınız:[^5]

```text
/feature-team sepete kupon kodu ekle, SALE10 yüzde 10 indirim yapsın
```

Akış:

1. `spec-writer` `SPEC.md`'yi yazar ve açık sorularını size iletir. Cevaplayın, spec'i okuyun, onaylayın.
2. `frontend-dev` kodu yazar ve `npm run build` çalıştırır.
3. `qa-tester` testleri yazar ve `test-report.md`'yi doldurur.
4. Rapor `STATUS: FAIL` ise lead raporu `frontend-dev`'e geri verir.
5. Testler geçince `reviewer` diff'i inceler.
6. Lead özeti yazar.

İlk çalıştırmada her adımda durup dosyaları okuyun. Spec'te bir hata varsa onu kodda değil spec'te düzeltin.

> [!TIP]
>
> Lead bazen işi kendisi yapmaya başlar. Böyle olursa *"kod yazma, işi subagent'lara ver"* diye hatırlatın. Skill'in ilk satırı da bunu söylüyor.

## Adım 5: Sonucu kontrol edin

Lead "bitti" dediğinde kanıta bakın:[^6]

- `test-report.md` `STATUS: PASS` ile bitiyor mu?
- `git diff --stat` yalnızca `SPEC.md`'nin "Files" bölümündeki dosyaları ve testleri mi gösteriyor?
- `npm test` sizin terminalinizde de geçiyor mu?

Çözümdeki `SPEC.md` altı kriter içeriyor, testler bunlardan beşini kapsıyor. Kalanı *(tek kupon kuralı)* raporda "elle kontrol edildi" olarak işaretli. Sizin ekibiniz bu kriteri nasıl ele aldı?

## Kendin dene

- `frontend-dev`'in tanımından "Test dosyalarına dokunma" satırını silin ve bir testi kasıtlı olarak kırın. Agent testi mi düzeltiyor, kodu mu?
- Tur sınırını 1'e indirin ve bir kriteri zorlaştırın *(örneğin kuruş yuvarlama)*. Lead sınıra gelince ne yapıyor?
- `reviewer`'ı çalıştırmadan önce `frontend-dev`'e "Files" dışında bir dosyayı değiştirtin. Reviewer bunu yakalıyor mu?
- Aynı özelliği ekipsiz, tek bir oturumda isteyin. Hangisi daha az token harcadı, hangisinin sonucunu incelemek daha kolaydı?

## Kaynaklar

1. [Claude Code: Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) *(doc)* — `PreToolUse` ile dosya koruma, `Stop` hook'u ve `jq` ile stdin okuma.
2. [Claude Code: Subagents](https://code.claude.com/docs/en/sub-agents) *(doc)* — Subagent dosyası, `tools` alanı ve zincirleme.
3. [Anthropic: How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) *(article)* — 13 Haziran 2025. Lead'in işçilere amaç, çıktı biçimi ve sınır vermesi.
4. [Claude Code: Configure permissions](https://code.claude.com/docs/en/permissions) *(doc)* — `allow` ve `deny` kuralları.
5. [Claude Code: Skills](https://code.claude.com/docs/en/skills) *(doc)* — `$ARGUMENTS` ve `disable-model-invocation` ile elle çağrılan skill.
6. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Kanıt istemek ve gözetimsiz çalışmayı doğrulamak.
