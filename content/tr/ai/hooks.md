---
title: "Hooks ve izin modları"
description: "Ajanı kurala bağlama: format, lint ve test kapısı, tehlikeli işlemleri engelleme ve izin modları."
lastVerified: "2026-10-26"
translationKey: "ai/hooks"
---

`CLAUDE.md`'ye *"her değişiklikten sonra testleri çalıştır"* yazdınız, ajan yine de bazen atlıyor. Bu bir hata değil. Kural dosyası modele bağlam olarak gider ve uyulması garanti değildir *(bkz. [Prompt ve context engineering](/academy/ai/prompt-and-context-engineering))*. Her seferinde, istisnasız olması gereken bir şey için hook kullanılır.[^1]

## Hook nedir?

**Hook, ajanın çalışmasındaki belirli anlarda otomatik çalışan bir shell komutudur.**[^2] Ajan bir dosyayı düzenledikten sonra, bir komutu çalıştırmadan önce ya da işi bitirdiğini söylediğinde devreye girer. Model karar vermez, komut her seferinde çalışır.[^2]

Frontend'de en çok işe yarayan üç an:

| An | [!claudeCode] | [!cursor] | Örnek |
| :-- | :-- | :-- | :-- |
| **Araç çalışmadan önce** | `PreToolUse` | `preToolUse`, `beforeShellExecution` | `.env`'e yazmayı engelle |
| **Dosya düzenlendikten sonra** | `PostToolUse` | `afterFileEdit` | Prettier ile formatla |
| **Ajan bitirdiğinde** | `Stop` | `stop` | Testler geçmeden bitirtme |

İki araçta da hook'lar proje klasörüne yazılır ve repoya commit edilebilir: [!claudeCode]'da `.claude/settings.json`, [!cursor]'da `.cursor/hooks.json`.[^2][^3] Böylece takımdaki herkesin ajanı aynı kurallarla çalışır.

## Her düzenlemeden sonra formatla

Ajanın yazdığı kodu format kurallarınıza uydurmak için `PostToolUse` kullanın. `matcher`, hook'un yalnızca dosya düzenleyen araçlardan sonra çalışmasını sağlar:[^2]

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

Hook çalışırken olayın bilgisi komuta stdin'den JSON olarak gelir. Düzenlenen dosyanın yolu `tool_input.file_path` alanındadır, `jq` onu çekip Prettier'a verir.[^2] Aynı yerde `npx eslint --fix` de çalıştırabilirsiniz.

## Tehlikeli işlemi engelle

`PreToolUse` hook'u araç çalışmadan önce devreye girer ve işlemi durdurabilir. Kural basittir: script **çıkış kodu 2** ile biterse işlem engellenir ve stderr'e yazdığınız mesaj ajana geri bildirim olarak gider.[^2] Ajan nedenini okur ve başka bir yol dener.

```bash
#!/bin/bash
# .claude/hooks/protect-files.sh
FILE_PATH=$(jq -r '.tool_input.file_path // empty')

for pattern in ".env" "pnpm-lock.yaml" ".git/"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH is protected" >&2
    exit 2
  fi
done

exit 0
```

Script'i `chmod +x` ile çalıştırılabilir yapın ve `PreToolUse` altında `Edit|Write` matcher'ıyla kaydedin.[^2] Çıkış kodu 0 işlemi onaylamaz, yalnızca itiraz etmez. Normal izin akışı yine çalışır.[^2]

## Testler geçmeden bitirtme

`Stop` hook'u ajan cevabını bitirdiğinde çalışır. Çıkış kodu 2 burada *"henüz bitmedi"* demektir: ajan durmaz ve stderr'deki mesajla çalışmaya devam eder.[^1][^2] Böylece *"testler geçene kadar düzelt"* bir rica olmaktan çıkar, kural olur:

```bash
#!/bin/bash
# .claude/hooks/require-tests.sh
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

if ! OUTPUT=$(pnpm test --run 2>&1); then
  echo "Tests are failing. Fix them before finishing:" >&2
  echo "$OUTPUT" | tail -n 30 >&2
  exit 2
fi
```

`stop_hook_active` kontrolü sonsuz döngüyü önler. [!claudeCode], bir `Stop` hook'u arka arkaya sekiz kez engellerse onu yok sayar.[^2]

> [!WARNING]
>
> `Stop` hook'u yalnızca iş bittiğinde değil, ajan **her cevabını** bitirdiğinde çalışır.[^2] Ajana yalnızca soru sorduğunuzda da test koşar. Uzun bir test paketiniz varsa yalnızca değişen dosyaların testlerini çalıştırın.

## İzin modları

Hook'lar kuralı zorlar. İzin modları ise ajanın **ne kadar sormadan** çalışacağını belirler. [!claudeCode]'da `Shift+Tab` ile modlar arasında geçersiniz:[^4]

| Mod | Ajan ne yapar | Ne zaman |
| :-- | :-- | :-- |
| **Manual** *(default)* | Düzenleme ve komutlardan önce sorar | Tanımadığınız kod tabanı |
| **acceptEdits** | Dosyaları sormadan düzenler, komutlar için sorar | Plan onaylandıktan sonra |
| **plan** | Yalnızca okur ve plan önerir | Büyük değişiklikten önce |
| **auto** | Her şeyi yapar, ayrı bir model riskli işlemleri engeller | Uzun ve gözetimsiz işler |
| **bypassPermissions** | Hiçbir şey sormaz | Yalnızca izole bir container veya VM |

Sürekli onay vermek yorucudur. Onuncu onaydan sonra okumadan tıklamaya başlarsınız.[^1] Bunun yerine güvendiğiniz komutlara önceden izin verin, tehlikeli olanları yasaklayın:[^4][^5]

```json
{
  "permissions": {
    "allow": ["Bash(pnpm test *)", "Bash(pnpm lint)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Bash(rm -rf *)", "Read(./.env)"]
  }
}
```

`deny` kuralları her modda geçerlidir, `bypassPermissions` dahil.[^4] Bir `PreToolUse` hook'unun engellemesi de modu değiştirerek aşılamaz.[^2]

> [!CAUTION]
>
> Hook'lar sizin kullanıcı yetkinizle çalışan shell komutlarıdır. Bir eklentiden ya da başkasının reposundan gelen hook'u çalıştırmadan önce script'i okuyun.

## Ne zaman hangisi

| İhtiyaç | Araç |
| :-- | :-- |
| Tercih, stil, mimari kararı | `CLAUDE.md` / `AGENTS.md` |
| Tekrar eden bir iş akışı | Skill *(bkz. [Skills](/academy/ai/skills))* |
| Her seferinde, istisnasız olması gereken | Hook |
| Ajanın neye dokunabileceği | İzin kuralları ve izin modu |

Kural dosyanızdaki bir satıra ajan sürekli uymuyorsa ve satır gerçekten şartsa, onu hook'a taşıyın.[^1]

## Kendin dene

- Prettier hook'unu ekleyin ve ajandan tek tırnaklı string içeren bir dosya yazmasını isteyin. Dosya kaydedildiğinde tırnaklar ne oluyor?
- `.env` koruma hook'unu ekleyip ajana *".env'e bir yorum satırı ekle"* deyin. Ajan engellenince ne yapıyor?
- Bir testi kasıtlı olarak bozun ve `Stop` hook'unu açın. Ajan kaç turda testi düzeltip duruyor?
- [!claudeCode]'da `/hooks` komutunu çalıştırın. Hangi hook'lar hangi olaya bağlı görünüyor?

## Detaylı öğrenmek için

- **Resmi doküman:** [!claudeCode] "Automate actions with hooks"; tüm olaylar, matcher'lar, prompt tabanlı hook'lar ve sık hatalar.[^2]
- **Resmi doküman:** [!cursor] "Hooks"; olay listesi, `permission` çıktısı ve takım hook'ları.[^3]
- **Resmi doküman:** [!claudeCode] "Permission modes"; her modun ayrıntısı ve auto modun nasıl karar verdiği.[^4]

## Kaynaklar

1. [Claude Code: Best practices](https://code.claude.com/docs/en/best-practices) *(doc)* — Kural dosyası tavsiyedir, hook kesindir; Stop hook ile doğrulama ve izin onayı yorgunluğu.
2. [Claude Code: Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide) *(doc)* — Olaylar, stdin JSON, çıkış kodu 2, Prettier ve dosya koruma örnekleri, Stop hook sınırı.
3. [Cursor: Hooks](https://cursor.com/docs/agent/hooks) *(doc)* — `.cursor/hooks.json`, olay listesi ve çıkış kodlarının anlamı.
4. [Claude Code: Permission modes](https://code.claude.com/docs/en/permission-modes) *(doc)* — Manual, acceptEdits, plan, auto, dontAsk ve bypassPermissions modları.
5. [Claude Code: Configure permissions](https://code.claude.com/docs/en/permissions) *(doc)* — `allow`, `ask` ve `deny` kurallarının yazımı ve önceliği.
