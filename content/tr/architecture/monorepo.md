---
title: "Monorepo"
description: "pnpm workspace ve Turborepo ile paylaşılan paketler ve ortak UI kütüphanesi."
lastVerified: "2026-10-15"
translationKey: "architecture/monorepo"
---

Monorepo, birden fazla uygulama ve paketin tek bir repoda durmasıdır. Ortak UI bileşenlerini, TypeScript ayarlarını ve tipleri ayrı bir repoya bölmeden paylaşırsınız. Takımlar arası koordinasyon maliyeti düşer, paketi ve onu kullanan uygulamaları tek bir değişiklikte güncelleyebilirsiniz.[^1] Bu rehber frontend'de en yaygın ikiliyi kuruyor: paketleri birbirine bağlayan **pnpm** workspace ve görevleri sıralayıp önbelleğe alan **Turborepo**.

## Ne zaman monorepo?

| Monorepo mantıklı | Ayrı repo mantıklı |
| --- | --- |
| Birlikte evrilen uygulamalar ve ortak UI, tip, config paketleri var[^2] | Projeler birbirinden bağımsız ürünler[^2] |
| Ortak kodu npm'e yayınlamadan paylaşmak istiyorsunuz | Katı izolasyon gerekiyor[^2] |
| Bir değişikliğin paketi ve tüm tüketicilerini tek PR'da güncellemesini istiyorsunuz | Ekipte CI olgunluğu yok[^2] |

Geçişin zor kısmı çoğu zaman teknik değil, organizasyonel: ekiplerin aynı repoda çalışmayı kabul etmesi gerekiyor.[^1]

En uç örnek Google: on binlerce geliştirici için tek bir ortak kaynak gerçeği olarak devasa bir tek repo kullanıyor. Communications of the ACM'deki makale, bu modelin avantajlarını ve ödünleşimlerini, onu mümkün kılan sistemler ve iş akışlarıyla birlikte anlatıyor.[^3] Ödünleşimin frontend'deki karşılığı boyut: kod büyüdükçe build, test ve sürüm kontrolü yavaşlar, editör ağırlaşır.[^4] Bu rehberin ölçüsü kabaca şu: üç veya daha fazla deploy edilebilir uygulama, birkaç paylaşılan paket ve kod tabanında çalışan birden fazla ekip varsa monorepo mantıklı. Tek uygulama ve yaklaşık 10 kişiden küçük ekipler için erken. [Fireship](https://fireship.io)'in deyimiyle monorepo "blogunuz için abartı olabilir".[^4]

Takımların bağımsız yayın döngüsü istediği durumlar için [Micro Frontend](/academy/architecture/micro-frontend) rehberine bakın.

## İki araç, iki iş

|  | pnpm workspace | Turborepo |
| --- | --- | --- |
| İşi | Paketleri keşfeder, birbirine bağlar, tek lockfile tutar[^5] | Görevleri sıralar, paralel çalıştırır, sonuçları önbelleğe alır[^6][^7] |
| Ayar dosyası | `pnpm-workspace.yaml` | `turbo.json` |

Turborepo paket yöneticisinin workspace özelliğinin üzerine kuruludur.[^8] Bağımlılıkları indirmek, symlink'lemek ve çözümlemek yine paket yöneticisinin işidir.[^9] Aynı işi yapan bir alternatif **Nx**: mimari sınırları zorlayan mekanizmalar da sunuyor.[^10] Fireship'in karşılaştırması farkı iyi özetliyor: ikisi de bağımlılık grafiği çıkarır, çıktıları önbelleğe alır ve işleri paralel çalıştırır. Nx daha eski ve geniş (kod üretimi, eklentiler, dağıtık görev çalıştırma), Turborepo daha yeni ve minimal, mevcut workspace'e kolayca eklenir.[^4] (Video 2021 tarihli, araç ayrıntıları değişti, kavramlar geçerli.)

## Yapı

```text
repo/
├── apps/
│   ├── web/                  # Next.js uygulaması
│   └── admin/                # ikinci uygulama
├── packages/
│   ├── ui/                   # @repo/ui
│   ├── typescript-config/    # @repo/typescript-config
│   └── eslint-config/        # @repo/eslint-config
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Turborepo dokümanı uygulama ve servisleri `apps/` altında, kütüphane ve araçları `packages/` altında toplamayı öneriyor.[^8] [Anthony Shew](https://www.youtube.com/@anthonyshewww)'un videosunda da aynı iskelet var: workspace'ler `apps` ve `packages` altındaki parçaları tek grafikte bağlıyor, her paketin kendi `package.json` dosyası, dışa açtığı API için `exports` alanı ve kendi `scripts` alanı oluyor.[^11]

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (kök)
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

- `apps/*` ve `packages/*` altında `package.json` olan her klasör bir pakettir. İç içe paketler (`apps/a` ve `apps/a/b`) desteklenmez.[^8]
- Lockfile şart. Turborepo iç paketler arasındaki bağımlılıkları buradan anlıyor.[^8]
- Kök dizine yalnızca depo yönetim araçları konur (`turbo`, `husky`, `lint-staged`). Uygulama bağımlılıkları, onları kullanan pakete yazılır.[^9] [Tally Barak](https://tallybarak.com)'ın DevOps.js konuşmasındaki uyarıya göre kökte toplanan (hoisted) bağımlılıklar eksik bildirimleri gizleyebilir ve hata ancak deploy'da ortaya çıkar.[^12]

## Paylaşılan paketler

Bir uygulama, iç paketi npm'deki bir paket gibi ekler. Sürüm yerine paket yöneticisinin workspace sözdizimini yazarsınız:[^13]

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

`workspace:` protokolünde pnpm yerel workspace paketi dışında hiçbir şeye çözümlemeyi reddeder. Yanlışlıkla registry'den başka bir sürüm inmez.[^5] Paket adında kapsamlı bir önek kullanın. Turborepo dokümanı `@repo` kullanıyor, çünkü npm'de alınamayan bir ad alanı.[^8]

Aynı bağımlılığı birçok paket kullanıyorsa sürümü tek yerde tutmak için pnpm catalogs kullanabilirsiniz (pnpm 9.5 ve sonrası):[^9]

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
```

```json
// apps/web/package.json ve packages/ui/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

Catalogs üç şey kazandırır: workspace'te her bağımlılığın tek sürümü olur, güncelleme yalnızca `pnpm-workspace.yaml`'da tek satırlık değişikliktir ve `package.json` dosyalarında merge çakışması çıkmaz.[^14]

Paketleri tasarlarken iki kural işinizi görür:

- **Her pakete tek amaç:** `@repo/ui` tüm paylaşılan UI bileşenlerini, `@repo/typescript-config` TypeScript ayarlarını barındırır.[^15]
- **Uygulamalar paylaşılan kod barındırmaz.** Ortak kodu ayrı bir pakete koyun, uygulamalar o pakete bağlansın. Uygulamalar paket grafiğinin sonudur.[^15]

## Ortak UI paketi

Bir iç paketi derlemenin iki yolu var:[^13]

|  | **Just-in-Time** | **Compiled** |
| --- | --- | --- |
| Nasıl çalışır | TypeScript dosyalarını doğrudan export eder, uygulamanın bundler'ı derler | `tsc` ile `dist` klasörüne derlenir |
| Yapılandırma | Çok az | Daha fazla |
| Turborepo önbelleği | Paketin kendi `build` adımı olmadığı için önbelleğe alınamaz | Build çıktıları `outputs` ile önbelleğe alınır |
| Ne zaman | Uygulamalar Turbopack, webpack veya Vite gibi modern bir bundler kullanıyorsa | Paketi TypeScript'i derleyemeyen bir araç da kullanıyorsa |

[!nextjs] ve Vite uygulamalarının paylaştığı bir UI paketi için Just-in-Time en az yapılandırmayla başlayan seçenek. Uygulamaların build süresinden memnunsanız önbellek kaybı sorun olmaz.[^13]

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  }
}
```

```tsx
import { Button } from "@repo/ui/button"
```

Dosya başına `exports` tanımlamak, paketi tek bir barrel dosyasına bağlamaktan kaçınmanızı sağlar. Barrel dosyaları derleyiciler ve bundler'lar için zordur.[^8] [Önceki rehberdeki](/academy/architecture/folder-structure) `index.ts` tartışmasının paket düzeyindeki karşılığı bu.

> [!WARNING]
>
> **Just-in-Time paketin içinde `paths` kullanamazsınız.** Paketi tüketici derlediği için TypeScript'in `compilerOptions.paths` ayarı çalışmaz. Bunun yerine Node.js subpath imports kullanın: `package.json` içinde `"imports": { "#*": "./src/*" }` yazıp kodda `#utils.ts` gibi import edin.[^16] Uygulamanın kendi içinde `@/` alias'ını kullanmaya devam edersiniz.

TypeScript ayarını da paylaşın. `packages/typescript-config` altında `base.json` ve `nextjs.json`, `react-library.json` gibi varyantlar durur, her paket kendi `tsconfig.json`'ında `extends` ile bunlardan birini seçer:[^16]

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

Kök dizinde `tsconfig.json`'a genellikle ihtiyacınız yok. Kökteki bir değişiklik tüm görevlerin önbelleğini düşürür.[^16]

**shadcn/ui kullanıyorsanız** CLI monorepo'yu tanıyor. `pnpm dlx shadcn@latest init --monorepo` iki workspace (`web` ve `ui`) ve Turborepo kurar. `apps/web` içinde `add button` çalıştırdığınızda bileşen `packages/ui` altına iner ve import yolları güncellenir. Bileşenler `@workspace/ui/components/button` gibi import edilir.[^17] Her workspace'te bir `components.json` bulunmalı, `style`, `iconLibrary` ve `baseColor` ikisinde de aynı olmalı. Tailwind CSS v4'te `components.json` içindeki `tailwind.config` alanı boş bırakılır.[^17] shadcn paketi `@workspace/ui` adıyla kuruyor, bu rehberdeki `@repo/ui` ile aynı rolde: shadcn kullanıyorsanız onun adını koruyun.

## turbo.json: görevler ve önbellek

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Her `tasks` anahtarı, paketlerin `package.json` dosyasındaki aynı adlı script'i çalıştırır.[^6]

- **`^build`:** Bir paketten önce bağımlılıklarının `build` görevini çalıştırır. `@repo/ui` derlenip bittikten sonra `web` derlenir.[^6]
- **`outputs`:** Hangi dosyaların önbelleğe alınacağını söyler. Yazmazsanız Turborepo dosyaları önbelleğe almaz ve önbellekten dönen çalıştırma dosyaları geri getirmez.[^6][^7]
- **`dev`:** Hiç bitmeyen bir görev olduğu için `persistent: true` ve `cache: false` alır.[^6]

> [!WARNING]
>
> `"build": {}` yazmak yetmez: görevler sırasız paralel çalışır ve çıktılar önbelleğe alınmaz, bu hızla hataya yol açar.[^6]

Önbellek girdilerin parmak izine dayanır. Aynı parmak izi yeniden gelirse Turborepo işi yeniden yapmaz, sonucu önbellekten geri getirir.[^7] Yerel önbellek `.turbo/cache` klasöründe durur. `npx turbo login` ve `npx turbo link` ile Remote Cache'i açarsanız takım arkadaşlarınız ve CI aynı önbelleği paylaşır.[^7] Kök `package.json`'daki bir bağımlılığı güncellemek tüm görevlerin önbelleğini düşürür, kök dizini ince tutmanın pratik gerekçesi bu.[^7]

`check-types` için `^check-types` doğru önbellek davranışı verir ama görevleri paralel çalıştırmaz. Hem doğruluk hem paralellik için Turborepo dokümanı Transit Node kalıbını öneriyor.[^6]

## Görevleri çalıştırma

```bash
turbo run build                 # tüm paketler
turbo run build --filter=web... # web ve bağımlılıkları
turbo run build --filter=...ui  # ui ve onu kullanan paketler
turbo run build test lint       # birden çok görev, mümkün olduğunca paralel
```

`...` sonda bağımlılıkları, başta bağımlıları (dependents) kapsar.[^18] Bir paketi değiştirirken `--filter=...ui` ile onu kullanan her şeyin hâlâ derlendiğini görebilirsiniz.[^18]

> [!WARNING]
>
> `turbo` komutlarını yalnızca kökteki `package.json`'a yazın. Paketlerin kendi script'lerine yazarsanız `turbo` kendini özyinelemeli çağırır.[^18]

> [!TIP]
>
> Bir paketten başka bir pakete ulaşmak için `../` yazdığınızı fark ederseniz durun. O paketi bağımlılık olarak ekleyip adıyla import edin.[^8] Shew de modüllere dosya yoluyla değil paket adıyla erişilmesini monorepo düzeninin korunması için kritik görüyor.[^11]

## CI ve Docker

Önbelleğin asıl değeri CI'da ortaya çıkıyor. [Michael Guay](https://www.youtube.com/@mguay)'in videosunda pnpm ve Turborepo ile bir Next.js ön yüzü ile NestJS arka yüzü tek workspace'te kuruluyor. TypeScript ve ESLint ayarları ile DTO tipleri paylaşılan paketlerde duruyor. GitHub Actions hattında Vercel Remote Cache bağlanınca daha önce derlenmiş çıktılar yeniden derlenmeden önbellekten geliyor.[^19] Shew'nun videosunda da aynı etki var: Remote Cache ile CI/CD'deki dağıtım süreçleri saniyelere iniyor.[^11] Turborepo'nun Docker rehberine göre kimlik bilgileri (`TURBO_TEAM`, `TURBO_TOKEN`) build argümanı olarak verilir. Yalnızca derleme aşamasında kullanıldıkları için son imaja girmezler.[^20]

Monorepo'da bir uygulamayı Docker'a koyarken sorun şu: bir uygulamanın kilit dosyasındaki ilgisiz bir değişiklik, başka bir uygulamanın Docker build'ini gereksiz yere geçersiz kılabilir.[^20] `turbo prune`, hedef uygulamanın ihtiyaç duyduğu workspace'leri ve budanmış bir kilit dosyasını içeren küçük bir kopya üretir:[^20]

```bash
turbo prune web --docker
```

`--docker` bayrağı çıktıyı ikiye böler: `out/json` yalnızca `package.json` dosyalarını (az değişir, bağımlılık kurulumu için), `out/full` ise kaynak kodu içerir. Budanmış kilit dosyası `out/` kökünde durur.[^21] Çok aşamalı bir Dockerfile'da önce `json` ve kilit dosyasıyla bağımlılıkları kurar, sonra `full` ile derlersiniz. Böylece bağımlılıklar değişmedikçe kurulum katmanı önbellekte kalır.[^20] Tam Dockerfile için Turborepo'nun Docker rehberine bakın.

## Kendin dene

1. `pnpm dlx create-turbo@latest` ile örnek bir repo oluşturun. `apps/web` ile `packages/ui` arasındaki `workspace:*` bağını inceleyin.
2. `turbo run build` komutunu iki kez çalıştırın. İkincisinde önbellekten dönen sonucu görün.
3. `packages/ui` içinde bir bileşeni değiştirin ve `turbo run build --filter=...ui` çalıştırın. Hangi paketlerin yeniden derlendiğine bakın.
4. `turbo.json`'dan `outputs`'u silip tekrar deneyin. Önbellekten dönen build'in dosyaları geri getirmediğini görün.
5. Fireship'in [Monorepos: Turborepo vs Nx](https://www.youtube.com/watch?v=9iU_IE6vnJ8) videosunu (9 dk) izleyin. Ardından [Tally Barak](https://tallybarak.com)'ın *1001 Packages* konuşmasından (24 dk) sürümleme ve bağımlılık kurulumu bölümlerine bakın.[^12] Daha sohbet havasında bir giriş için Syntax'ın monorepo bölümü de iyi: workspace'ler, pnpm, Turborepo, Nx, Lerna ve Rush üzerine.[^22]
6. Sıfırdan başlamak için [Anthony Shew](https://www.shew.dev)'nun [How to structure a JS/TS monorepo](https://www.youtube.com/watch?v=TeOSuGRHq7k) videosu, yalnızca pnpm tarafını görmek için de Code with tkssharma'nın [PNPM Workspaces Deep Dive](https://www.youtube.com/watch?v=2cW7aQ7CQcA) videosu var. İkincisinde `pnpm-workspace.yaml` ile `api` ve `utils` paketi kurulup `workspace:` ile bağlanıyor.[^23]
7. Bir uygulamanız varsa `turbo prune <uygulama> --docker` çalıştırın ve `out/json` ile `out/full` klasörlerine bakın.[^21]

## Kaynaklar

1. [The New Stack: The Case for (and Against) Monorepos on the Frontend](https://thenewstack.io/the-case-for-and-against-monorepos-on-the-frontend/) *(article)* — Monorepo'nun frontend'de iş birliği maliyetine etkisi ve geçişin organizasyonel yönü.
2. [Graphite: When to use a monorepo](https://graphite.com/guides/when-to-use-monorepo) *(article)* — Monorepo'nun uygun ve uygun olmadığı durumlar.
3. [Rachel Potvin ve Josh Levenberg: Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/) *(research)* — Google'ın tek repo modelinin gerekçeleri, avantajları ve ödünleşimleri. Communications of the ACM, 2016.
4. [Fireship: Monorepos, How the Pros Scale Huge Software Projects // Turborepo vs Nx](https://www.youtube.com/watch?v=9iU_IE6vnJ8) *(video)* — Monorepo'nun faydası ve boyut maliyeti, Nx ile Turborepo karşılaştırması ve `create-turbo` demosu. 9 dk, 2021.
5. [pnpm: Workspace](https://pnpm.io/workspaces) *(doc)* — `pnpm-workspace.yaml`, `workspace:` protokolü ve tek lockfile.
6. [Turborepo: Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) *(doc)* — `tasks`, `dependsOn`, `^`, `outputs` ve paralel çalıştırma.
7. [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) *(doc)* — Parmak izi tabanlı önbellek, Remote Cache ve global hash girdileri.
8. [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) *(doc)* — `apps/` ve `packages/` yapısı, paket anatomisi, `exports` ve `@repo` öneki.
9. [Turborepo: Managing dependencies](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies) *(doc)* — Bağımlılığı kullanıldığı pakete kurma, kök dizinde az bağımlılık ve sürümleri eşitleme.
10. [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries.md) *(doc)* — Nx'in mimari sınırları zorlama mekanizmaları.
11. [Anthony Shew: How to structure a JS/TS monorepo, From Zero to Turbo](https://www.youtube.com/watch?v=TeOSuGRHq7k) *(video)* — Workspace'ler, `apps` ve `packages` yapısı, `exports`, paket adıyla erişim, Turborepo görevleri ve Remote Cache.
12. [Tally Barak: 1001 Packages, Strategies for Managing Monorepos (DevOps.js Conf 2022)](https://gitnation.com/contents/1001-packages-strategies-for-managing-monorepos) *(video)* — Paket kurulumu, bağlama, build stratejileri, hoisting uyarısı ve sürümleme. 24 dk.
13. [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) *(doc)* — `workspace:*` ile kullanım, Just-in-Time ve Compiled paket stratejileri.
14. [pnpm: Catalogs](https://pnpm.io/catalogs) *(doc)* — Sürümleri `catalog:` protokolüyle tek yerde tutma.
15. [Turborepo: Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package) *(doc)* — Paket oluşturma adımları, tek amaçlı paketler ve uygulamalarda paylaşılan kod barındırmama.
16. [Turborepo: TypeScript](https://turborepo.dev/docs/guides/tools/typescript) *(doc)* — Paylaşılan `tsconfig` paketi, Node.js subpath imports ve kök `tsconfig`'e ihtiyaç duyulmaması.
17. [shadcn/ui: Monorepo](https://ui.shadcn.com/docs/monorepo) *(doc)* — `init --monorepo`, `packages/ui` yapısı ve `components.json` gereksinimleri.
18. [Turborepo: Running tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks) *(doc)* — `turbo run`, `--filter` kalıpları ve kök script'lerde kullanım.
19. [Michael Guay: Learn Turborepo By Example, Code Sharing, Distributed Cache, & More!](https://www.youtube.com/watch?v=nx-cj3dqWNE) *(video)* — Next.js ve NestJS'i tek workspace'te kurma, paylaşılan paketler, GitHub Actions ve Vercel Remote Cache, `turbo prune` ile Docker.
20. [Turborepo: Docker](https://turborepo.dev/docs/guides/tools/docker) *(doc)* — Monorepo'da Docker build'inin neden bozulduğu, `turbo prune --docker`, çok aşamalı Dockerfile ve Remote Cache argümanları.
21. [Turborepo: prune](https://turborepo.dev/docs/reference/prune) *(doc)* — `turbo prune` sözdizimi, `--docker` çıktısı (`json/`, `full/`, budanmış kilit dosyası) ve seçenekler.
22. [Syntax #426: Monorepos! Workspaces, pnpm, turborepo + more!](https://syntax.fm/show/426/monorepos-workspaces-pnpm-turborepo-more) *(podcast)* — Wes Bos ve Scott Tolinski'den monorepo deneyimi, paylaşılan bağımlılıklar ve araçlar. Ocak 2022.
23. [Code with tkssharma: PNPM Workspaces Deep Dive, Fast Monorepo Setup](https://www.youtube.com/watch?v=2cW7aQ7CQcA) *(video)* — `pnpm-workspace.yaml` kurulumu, alt paket oluşturma ve `workspace:` ile yerel bağımlılık ekleme.
