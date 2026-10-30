---
title: "Paralel agent'lar"
description: "Git worktree ile birden çok agent'ı aynı anda, birbirinin dosyasını ezmeden çalıştırma."
lastVerified: "2026-10-26"
translationKey: "ai/parallel-agents"
---

Agent bir özellik üzerinde çalışırken onu izlemek zorunda değilsiniz. Aynı sürede ikinci bir agent'a bir hata düzeltmesi, üçüncüsüne bir araştırma verebilirsiniz. Sorun şu: hepsi aynı klasörde çalışırsa birbirinin dosyasını ezer. Çözüm, her agent'a kendi çalışma kopyasını vermektir.

## Worktree nedir?

**Git worktree, aynı repoya bağlı ikinci bir çalışma klasörüdür.** Kendi dosyaları ve kendi branch'i vardır, ama commit geçmişi ve remote ortaktır.[^1][^2] Bir agent `feature/coupon` worktree'sinde kupon özelliğini yazarken diğeri `fix/cart-total` worktree'sinde sepet toplamını düzeltir. İkisi birbirinin değişikliğini görmez.

Agent kullanmadan da worktree açabilirsiniz:[^1]

```bash
git worktree add ../shop-coupon -b feature/coupon
cd ../shop-coupon
pnpm install
```

`git worktree list` hepsini gösterir, iş bitince `git worktree remove ../shop-coupon` ile silersiniz.[^1]

## Claude Code'da worktree

[!claudeCode] worktree'yi sizin yerinize açar. Her terminalde farklı bir isimle başlatın:[^1]

```bash
claude --worktree coupon
claude --worktree cart-total
```

Worktree repo kökünde `.claude/worktrees/<isim>/` altına, `worktree-<isim>` adında yeni bir branch'le açılır. Çıkarken değişiklik yoksa worktree ve branch kendiliğinden silinir. Değişiklik varsa tutmak isteyip istemediğiniz sorulur.[^1]

İki ayar işinizi kolaylaştırır:[^1]

- `.claude/worktrees/` klasörünü `.gitignore`'a ekleyin. Yoksa ana klasörde takip edilmeyen dosyalar olarak görünür.
- Worktree temiz bir checkout'tur, `.env` gibi gitignore'daki dosyalar gelmez. Kökteki `.worktreeinclude` dosyasına yazdıklarınız her yeni worktree'ye kopyalanır.

```text
.env
.env.local
```

Subagent'lar da kendi worktree'lerinde çalışabilir. Subagent dosyasının frontmatter'ına `isolation: worktree` eklemeniz yeterli.[^1]

## Cursor'da worktree

[!cursor]'da Agents penceresinden bir agent'ı worktree'de başlatırsınız. Editörde `/worktree` komutu aynı işi yapar, `/apply-worktree` değişiklikleri ana klasöre getirir.[^3] Kurulum adımlarını `.cursor/worktrees.json`'a yazarsınız:[^3]

```json
{
  "setup-worktree": ["pnpm install", "cp $ROOT_WORKTREE_PATH/.env .env"]
}
```

`/best-of-n` aynı görevi birkaç modele aynı anda verir, her biri kendi worktree'sinde çalışır. Sonuçları karşılaştırıp beğendiğinizi alırsınız. Hiçbirini kendiliğinden birleştirmez.[^3]

> [!WARNING]
>
> `node_modules`'ü worktree'ye symlink ile bağlamayın, ana klasörü bozabilir. Her worktree'de `pnpm install` çalıştırın. pnpm paketleri ortak depodan bağladığı için hızlıdır.[^3]

## Ne paralellenir?

Paralel çalışmanın sınırı agent sayısı değil, **sizin inceleme hızınızdır**. [Simon Willison](https://simonwillison.net) büyük değişikliklerden aynı anda yalnızca birini düzgün inceleyip birleştirebildiğini yazıyor.[^4] Bu yüzden yanına az dikkat isteyen işler ekliyor:[^4]

| Paralel iyi gider | Ana işte kalsın |
| :-- | :-- |
| Bir kütüphaneyi deneyen küçük prototip | Aynı dosyalara dokunan iki özellik |
| Kodun bir bölümünü açıklayan not | Birbirine bağlı adımlar *(önce API, sonra arayüz)* |
| Deprecation uyarısı gibi küçük bakım | Sizin karar vermeniz gereken tasarım işi |
| Spec'i net yazılmış, incelemesi kolay görev | Belirsiz, sık soru gerektiren iş |

Net bir spec incelemeyi hızlandırır.[^4] Paralel agent'a vereceğiniz işi [Spec-driven geliştirme](/academy/ai/spec-driven-development) dersindeki gibi önce yazın.

Willison'ın bir önerisi daha var: zor bir iş için bir agent'ı **keşif** amacıyla çalıştırın. Kodunu birleştirmeyi düşünmeyin. Amaç hangi dosyaların zor olduğunu ve sorunun nasıl çözülebileceğini görmek.[^4]

## Birleştirme

Her worktree ayrı bir branch'tir. İşi bitenden bir PR açın, testler ve inceleme ana branch'teki gibi çalışsın. İki worktree aynı dosyaya dokunduysa çakışmayı birleştirirken çözersiniz. İşleri baştan farklı dosyalara bölmek bu yüzden önemlidir.

Aynı anda iki uygulamayı çalıştıracaksanız portları ayırın: biri `pnpm dev`, diğeri `pnpm dev --port 3001`.

> [!TIP]
>
> Her worktree'ye ayrı bir isim verin *(`coupon`, `cart-total`)*. [!claudeCode]'da `claude --worktree coupon --resume` ile aynı oturuma geri dönebilirsiniz.[^1]

## Kendin dene

- İki terminalde iki worktree açın: birinde ürün listesine sıralama, diğerinde footer metni değişikliği. `git worktree list` ne gösteriyor?
- `.worktreeinclude` olmadan bir worktree açıp uygulamayı çalıştırın. `.env` eksik olduğu için ne kırılıyor?
- Aynı küçük hatayı iki agent'a ayrı worktree'lerde verin. İki çözüm aynı mı? Hangisini incelemek daha kolay?
- Bir worktree'yi değişiklik yapmadan kapatın. Branch hâlâ duruyor mu?

## Detaylı öğrenmek için

- **Resmi doküman:** [!claudeCode] "Run parallel sessions with worktrees"; `--worktree`, `.worktreeinclude`, temizlik ve subagent izolasyonu.[^1]
- **Yazı:** [Simon Willison](https://simonwillison.net), "Embracing the parallel coding agent lifestyle"; hangi işlerin paralel gittiği ve inceleme darboğazı.[^4]
- **Resmi doküman:** [!cursor] "Worktrees"; kurulum script'i, `/best-of-n` ve worktree limiti.[^3]

## Kaynaklar

1. [Claude Code: Run parallel sessions with worktrees](https://code.claude.com/docs/en/worktrees) *(doc)* — `--worktree`, worktree'nin yeri, temizlik, `.worktreeinclude` ve `isolation: worktree`.
2. [Git: git-worktree](https://git-scm.com/docs/git-worktree) *(doc)* — Worktree ekleme, listeleme ve silme komutları.
3. [Cursor: Worktrees](https://cursor.com/docs/configuration/worktrees) *(doc)* — `/worktree`, `/apply-worktree`, `.cursor/worktrees.json` ve `/best-of-n`.
4. [Simon Willison](https://simonwillison.net): [Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) *(article)* — 5 Ekim 2025. Paralel giden iş türleri, inceleme darboğazı ve keşif agent'ı.
