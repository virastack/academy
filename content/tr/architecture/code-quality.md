---
title: "Kod Kalitesi ve Ekip Standartları"
description: "ESLint, Prettier, commit kuralları ve CI ile otomatik kontrol."
lastVerified: "2026-10-15"
translationKey: "architecture/code-quality"
---

Yazılı kural ihlal edilir, otomatik kural edilmez. Bu rehber ekibin kod standartlarını üç katmanda araçlara bağlıyor: editörde, commit anında ve CI'da. Google'ın kod inceleme rehberi stil konusunda stil rehberini nihai otorite sayarken, yazılım tasarımının neredeyse hiçbir zaman saf bir stil tercihi olmadığını söylüyor.[^1] Stil kurallarını araca devrettiğinizde inceleme zamanı tasarıma kalır.

## Üç katman

| Katman | Ne zaman çalışır? | Araç | Atlanabilir mi? |
| --- | --- | --- | --- |
| Editör | Dosyayı kaydederken | ESLint ve Prettier eklentisi | Evet, kişisel ayar[^2] |
| Commit | `git commit` anında | **Husky** + **lint-staged** + **commitlint** | Evet, `git commit --no-verify` ile |
| CI | Her pull request'te | GitHub Actions | Hayır, zorunlu kontrol yaparsanız[^3] |

Üçü de aynı komutları çalıştırır. Fark hızları ve atlanabilirlikleri: editör ve hook size hızlı geri bildirim verir, CI ise son kapıdır.

## Araç seçimi

Bu bir görüş meselesi. Önemli olan ekibin tek bir araç setinde ve tek bir ayarda anlaşması.

| Yaklaşım | Ne yapar? | Dikkat |
| --- | --- | --- |
| **ESLint** + **Prettier** | ESLint kod kalitesini, Prettier biçimi denetler. `eslint-config-prettier` çakışan kuralları kapatır[^4] | `eslint-plugin-prettier` önerilmiyor: editörde çok sayıda kırmızı çizgi çıkarıyor, Prettier'ı doğrudan çalıştırmaktan yavaş ve araya fazladan bir katman ekliyor[^4] |
| Yalnızca ESLint | Biçimlendirmeyi de ESLint kuralları ve eklentileriyle yapar, kaydederken otomatik düzeltir[^2] | [Anthony Fu](https://antfu.me)'nun hazır ESLint ayar kütüphanesi gibi görüş sahibi bir ayara bağlanırsınız[^2] |
| **Biome** | Formatter, linter ve import düzenlemeyi tek araçta yapar, `biome check` hepsini tek geçişte çalıştırır[^5] | ESLint eklenti kuralları otomatik taşınmaz, elle yazılır[^6] |
| **Oxlint** | Rust tabanlı linter. Dokümana göre ESLint'ten 50-100 kat hızlı, 870'ten fazla kural içeriyor[^7] | Hız iddiası dokümanın kendi ölçümü. Tip bilgili lint için tsgo kullanıyor, JS eklentileri alpha aşamasında[^7] |

Prettier'ın yaklaşımı bilinçli kısıtlamaya dayanıyor: yalnızca kodu *yazdırıyor*, dönüştürmüyor ve önceliği davranışı aynı tutmak.[^8] Biome'a geçiş gerekçesini Web Dev Simplified'ın videosu da hız ve tek ayar üzerinden anlatıyor.[^9]

Bu rehberdeki kurulum ESLint + Prettier ile, Biome için komutlar aşağıda ayrıca var. Güncel bir karşılaştırma için Elite Dev News'in ESLint, Biome ve Oxlint videosuna bakabilirsiniz.[^10]

## ESLint ve Prettier kurulumu

```bash
pnpm add -D eslint @eslint/js typescript@^6 typescript-eslint eslint-config-prettier prettier
```

> [!WARNING]
>
> `typescript@^6` bilerek yazıldı. typescript-eslint şu an `>=4.8.4 <6.1.0` aralığını destekliyor.[^11] Denemede TypeScript 7.0 kurulu olduğunda `typescript-eslint does not support TS 7.0` hatasıyla ESLint hiç çalışmadı. TypeScript 7 desteği gelene kadar sürümü 6'ya sabitleyin. Proje her yeni TypeScript sürümünü sabitlenmiş bir GitHub issue'sunda takip ediyor.[^11]

```js
// eslint.config.mjs
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist/', '.next/', 'coverage/']),
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  prettier,
])
```

- ESLint `eslint.config.js`, `.mjs` veya `.cjs` dosyasını arar. Dosya bir config nesneleri dizisi dışa aktarır, `defineConfig` yardımcısı `eslint/config` paketinden gelir.[^12]
- Aynı dosyayı eşleyen nesneler birleşir, çakışmada sonraki nesne kazanır.[^12] Bu yüzden `prettier` en sonda durur: çakışan biçim kurallarını son söz olarak kapatır.
- Tek anahtarı `ignores` olan nesne tüm yapılandırmaya uygulanır. `globalIgnores()` bunu açık hâle getirir. `node_modules` ve `.git` zaten yok sayılır.[^12]
- Tip bilgisi kullanan kurallar ayrı bir kurulum gerektirir, typescript-eslint'in Typed Linting sayfasında anlatılıyor.[^13]
- Mimari sınırları da burada zorlayabilirsiniz. `import/no-restricted-paths` zone'ları [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde.

```json
// .prettierrc.json
{ "semi": false, "singleQuote": true }
```

```json
// package.json (scripts)
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check-types": "tsc --noEmit"
  }
}
```

Hatalı bir dosyada `pnpm lint` şöyle bir çıktı verir:

```text
src/bad.ts
  1:7   error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars
  2:17  error  Unexpected any. Specify a different type     @typescript-eslint/no-explicit-any
```

### Biome ile

```bash
pnpm add -D -E @biomejs/biome   # -E: sürümü sabitler, herkes aynı sürümü kullanır
pnpm exec biome init
pnpm exec biome check           # formatter + linter + import düzenleme
pnpm exec biome check --write   # güvenli düzeltmeleri uygular
pnpm exec biome ci              # CI için
```

Mevcut projeyi taşıyorsanız `biome migrate eslint --write` ve `biome migrate prettier --write` komutları kuralları ve ayarları çevirir. Taşıma yalnızca birebir aynı kuralları alır, `--include-inspired` ile Biome'un ilham aldığı kuralları da ekleyebilirsiniz. Eklenti kuralları elle taşınır ve Prettier çıktısı birebir aynı olmayabilir.[^6] Sonra ESLint, Prettier ve eklentilerini kaldırın.[^6]

## Commit öncesi kontrol: Husky ve lint-staged

**Husky** git hook'larını projeye bağlar, **lint-staged** ise yalnızca commit'e giren dosyalar üzerinde komut çalıştırır. Linter tüm projeyi taramaz, böylece hızlı kalır.[^2][^14]

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

`husky init` `.husky/pre-commit` dosyasını oluşturur ve `package.json` içindeki `prepare` script'ini günceller.[^15] Hook'un içeriğini lint-staged ile değiştirin:

```sh
# .husky/pre-commit
pnpm exec lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,mjs,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": "prettier --write"
  }
}
```

lint-staged, eşleşen staged dosya adlarını komutun sonuna argüman olarak ekler. `eslint --fix` komutu `eslint --fix a.ts b.ts` olarak çalışır.[^14] Hatalı bir dosyayı commit etmeyi denerseniz commit reddedilir:

```text
✖ eslint --fix:
  3:17  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
husky - pre-commit script failed (code 1)
```

> [!WARNING]
>
> `tsc`'yi lint-staged ile çalıştırırken dikkat: dosya adları eklenince TypeScript bazı girdilerde `tsconfig.json`'u yok sayabilir. README'deki çözüm, fonksiyon biçimi kullanmak (`() => 'tsc --noEmit'`), bu da `lint-staged.config.mjs` gibi bir JS dosyası gerektirir.[^14] Tip kontrolü commit'i yavaşlattığı için çoğu zaman CI'a bırakmak daha iyi.

## Commit mesajı kuralları

**Conventional Commits** mesajı sabit bir yapıya oturtur: `<type>[optional scope]: <description>`, ardından isteğe bağlı gövde ve alt bilgi.[^16]

| Commit | Anlamı | SemVer karşılığı |
| --- | --- | --- |
| `fix: ...` | Hata düzeltmesi | PATCH[^16] |
| `feat: ...` | Yeni özellik | MINOR[^16] |
| `feat!: ...` veya `BREAKING CHANGE:` alt bilgisi | Geriye uyumsuz değişiklik | MAJOR[^16] |

`docs`, `chore` gibi diğer türler serbesttir ama sürümleme açısından özel anlamları yoktur.[^16]

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
export default { extends: ['@commitlint/config-conventional'] }
```

```sh
# .husky/commit-msg
pnpm exec commitlint --edit $1
```

commitlint'in Husky v9 rehberi aynı hook'u `npx --no -- commitlint --edit $1` olarak yazıyor, `pnpm exec` bunun pnpm karşılığı.[^17] Kurallara uymayan mesaj reddedilir:

```text
$ git commit -m "added stuff"
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
husky - commit-msg script failed (code 1)
```

`git commit -m "feat(cart): add ok constant"` ise geçer. How Dev You'nun videosu bu kurulumu uçtan uca gösteriyor.[^18]

## CI: son kapı

Hook'lar atlanabildiği için aynı kontroller CI'da da çalışmalı:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - name: Install pnpm and Node.js
        uses: pnpm/setup@c9883cc79df532ad1a7b81bf9ab944ceb090d65c # v2.0.0
        with:
          runtime: node@24
          cache: true
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm check-types
```

- `pnpm/setup` pnpm'i, Node.js'i kurar ve bağımlılıkları yükler. `cache: true` pnpm store'unu önbelleğe alır. pnpm CI ortamında kilit dosyasını otomatik dondurur, ayrıca bayrak vermeniz gerekmez.[^19]
- pnpm sürümü `package.json`'daki `packageManager` alanından okunur, workflow'u güncellemeniz gerekmez.[^19]
- Pinlenmiş `pnpm/setup` satırı ve diğer sürümler pnpm dokümanındaki örnekten alındı.[^19] Siz de eylemleri bir commit SHA'sına sabitleyebilirsiniz.

Kontrolün gerçekten kapı olması için GitHub'da *required status checks* açın. Zorunlu kontroller `successful`, `skipped` veya `neutral` olmadan birleştirme yapılamaz. İş adları tüm workflow'larda benzersiz olmalı, yoksa kontrol sonuçları belirsizleşir ve PR'lar bloke olabilir.[^3] [Anthony Fu](https://antfu.me)'nun videosu bu hattı PR başına çalışan bir `lint.yml` olarak kuruyor, yerelde denemek için de Docker tabanlı `act` aracını gösteriyor.[^2]

### Monorepo'da CI

[Monorepo](/academy/architecture/monorepo) kullanıyorsanız her PR'da her şeyi çalıştırmanız gerekmez:

```yaml
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      # ... pnpm/setup adımı
      - run: pnpm turbo run lint check-types --affected
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

`--affected` yalnızca değişiklikten etkilenen paketlerde görev çalıştırır. Kaynak kontrol geçmişi gerektirdiği için sığ (shallow) bir checkout'ta tüm paketler değişmiş sayılır, bu yüzden `fetch-depth: 0` ile geçmişi çekin.[^20] `TURBO_TOKEN` ve `TURBO_TEAM` Remote Cache'e erişimi sağlar.[^20]

## Ekip standartları ve kod inceleme

Otomasyon biçimi çözdükten sonra insan incelemesi tasarıma bakar. Google'ın rehberinden pratik çıkarımlar:[^1]

- **Küçük ama doğru ilerleyin:** İnceleyen, kod sağlığını kesin olarak iyileştiren bir değişikliği mükemmel olmasa da onaylamaya meyilli olmalı. "Mükemmel kod yoktur, yalnızca daha iyi kod vardır."
- **Küçük notları işaretleyin:** Zorunlu olmayan yorumlara `Nit:` öneki koyun, yazar yok sayabilsin.
- **Stil ile tasarımı ayırın:** Stil rehberinin kapsamadığı saf stil tercihlerinde mevcut koda uyun, aksi hâlde yazara bırakın. Tasarım konularında mühendislik ilkelerine bakın.
- **Anlaşmazlıkta sıraya girin:** Önce uzlaşı, sonra yüz yüze görüşme, olmazsa teknik lider veya mühendislik yöneticisi. PR beklemede kalmasın.

> [!TIP]
>
> Lint hatası kodlama ajanı için de geri bildirimdir: kural ihlali hemen kırmızıya düşer ve ajan kendini düzeltir. Bunu [Agentic Kodlama](/academy/ai/agentic-coding) rehberinde "ajanın kullanabileceği bir kontrol" olarak anlatmıştık.

## Kendin dene

1. ESLint ve Prettier'ı kurun. Kasıtlı olarak `any` ve kullanılmayan bir değişken yazıp `pnpm lint` çalıştırın.
2. Husky ve lint-staged'i ekleyin, hatalı dosyayı commit etmeyi deneyin ve reddedildiğini görün.
3. commitlint'i ekleyin. `git commit -m "added stuff"` komutunun reddedildiğini, `feat(cart): add item` komutunun geçtiğini doğrulayın.
4. CI workflow'unu ekleyin, hatalı bir PR açın ve kontrolün kırmızıya düştüğünü görün. Sonra branch protection'da kontrolü zorunlu yapın.
5. Aynı projeyi `biome migrate` ile Biome'a taşıyıp hız ve çıktı farkına bakın.
6. [Anthony Fu](https://antfu.me)'nun [Lint Like a Senior Developer](https://www.youtube.com/watch?v=Kr4VxMbF3LY) videosunu ve How Dev You'nun commitlint videosunu izleyin.[^2][^18]

## Kaynaklar

1. [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html) *(doc)* — Kod sağlığı ilkesi, `Nit:` önekleri, stil ile tasarım ayrımı ve anlaşmazlık çözümü.
2. [Lint Like a Senior Developer w/ eslint + husky + lint staged + github actions](https://www.youtube.com/watch?v=Kr4VxMbF3LY) *(video)* — Anthony Fu'nun ESLint ayarıyla React/Vite projesinde lint on save, Husky ile pre-commit, lint-staged ve GitHub Actions'ta PR başına lint. Mart 2025.
3. [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) *(doc)* — Zorunlu durum kontrolleri, sıkı mod ve benzersiz iş adı uyarısı.
4. [Prettier: Integrating with Linters](https://prettier.io/docs/integrating-with-linters) *(doc)* — `eslint-config-prettier` önerisi ve `eslint-plugin-prettier` uyarısı.
5. [Biome: Getting Started](https://biomejs.dev/guides/getting-started/) *(doc)* — Kurulum, `biome init`, `biome check` ve `--write`.
6. [Biome: Migrate from ESLint and Prettier](https://biomejs.dev/guides/migrate-eslint-prettier/) *(doc)* — `biome migrate` komutları, kapsam ve sınırlamalar.
7. [Oxc: Linter](https://oxc.rs/docs/guide/usage/linter.html) *(doc)* — Oxlint'in hız iddiası, kural sayısı, tip bilgili lint ve JS eklentileri.
8. [Prettier: Rationale](https://prettier.io/docs/rationale) *(doc)* — Prettier'ın yalnızca kodu yazdırması ve davranışı koruma önceliği.
9. [I Will Never Use Prettier or ESLint Again](https://www.youtube.com/watch?v=x5kwmIaPty8) *(video)* — Web Dev Simplified'dan ESLint + Prettier yerine Biome. Ekim 2025.
10. [ESLint vs Biome vs Oxlint 2026](https://www.youtube.com/watch?v=vx1MK52weHo) *(video)* — Elite Dev News'ten ESLint, Biome ve Oxlint'in hız ve kullanım senaryosu karşılaştırması. Eylül 2026.
11. [typescript-eslint: Dependency Versions](https://typescript-eslint.io/users/dependency-versions) *(doc)* — Desteklenen TypeScript aralığı ve destek politikası.
12. [ESLint: Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files) *(doc)* — Flat config dosya adları, `defineConfig`, `globalIgnores` ve "sonraki nesne kazanır" kuralı.
13. [typescript-eslint: Getting Started](https://typescript-eslint.io/getting-started/) *(doc)* — Kurulum, `recommended` ayarı ve Typed Linting yönlendirmesi.
14. [lint-staged](https://github.com/lint-staged/lint-staged) *(repo)* — Yapılandırma, staged dosyaların komuta eklenmesi ve `tsc` uyarısı.
15. [Husky: Get started](https://typicode.github.io/husky/get-started.html) *(doc)* — `husky init`, `.husky/pre-commit` ve `prepare` script'i.
16. [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) *(doc)* — Mesaj yapısı, `feat` ve `fix`, `BREAKING CHANGE` ve SemVer eşleşmesi.
17. [commitlint: Local setup](https://commitlint.js.org/guides/local-setup.html) *(doc)* — Husky v9 ile `commit-msg` hook'u.
18. [Conventional Commits with Husky & Commitlint](https://www.youtube.com/watch?v=vOh4mDo47Vg) *(video)* — How Dev You'dan commitlint kurulumu, `commit-msg` hook'u ve kurala uymayan mesajların reddi. Ağustos 2024.
19. [pnpm: Continuous Integration](https://pnpm.io/continuous-integration) *(doc)* — `pnpm/setup` ile GitHub Actions, önbellek ve `packageManager` alanı.
20. [Turborepo: Constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci) *(doc)* — CI'da `turbo run`, `--affected`, geçmiş gereksinimi ve Remote Cache değişkenleri.
