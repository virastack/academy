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

Geçişin zor kısmı çoğu zaman teknik değil, organizasyonel: ekiplerin aynı repoda çalışmayı kabul etmesi gerekiyor.[^1] Takımların bağımsız yayın döngüsü istediği durumlar için [Micro Frontend](/academy/architecture/micro-frontend) rehberine bakın.

## İki araç, iki iş

|  | pnpm workspace | Turborepo |
| --- | --- | --- |
| İşi | Paketleri keşfeder, birbirine bağlar, tek lockfile tutar[^3] | Görevleri sıralar, paralel çalıştırır, sonuçları önbelleğe alır[^4][^5] |
| Ayar dosyası | `pnpm-workspace.yaml` | `turbo.json` |

Turborepo paket yöneticisinin workspace özelliğinin üzerine kuruludur.[^6] Bağımlılıkları indirmek, symlink'lemek ve çözümlemek yine paket yöneticisinin işidir.[^7] Aynı işi yapan bir alternatif **Nx**: mimari sınırları zorlayan mekanizmalar da sunuyor.[^8]

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

Turborepo dokümanı uygulama ve servisleri `apps/` altında, kütüphane ve araçları `packages/` altında toplamayı öneriyor.[^6]

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

- `apps/*` ve `packages/*` altında `package.json` olan her klasör bir pakettir. İç içe paketler (`apps/a` ve `apps/a/b`) desteklenmez.[^6]
- Lockfile şart. Turborepo iç paketler arasındaki bağımlılıkları buradan anlıyor.[^6]
- Kök dizine yalnızca depo yönetim araçları konur (`turbo`, `husky`, `lint-staged`). Uygulama bağımlılıkları, onları kullanan pakete yazılır.[^7]

## Paylaşılan paketler

Bir uygulama, iç paketi npm'deki bir paket gibi ekler. Sürüm yerine paket yöneticisinin workspace sözdizimini yazarsınız:[^9]

```json
// apps/web/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*"
  }
}
```

`workspace:` protokolünde pnpm yerel workspace paketi dışında hiçbir şeye çözümlemeyi reddeder. Yanlışlıkla registry'den başka bir sürüm inmez.[^3] Paket adında kapsamlı bir önek kullanın. Turborepo dokümanı `@repo` kullanıyor, çünkü npm'de alınamayan bir ad alanı.[^6]

Aynı bağımlılığı birçok paket kullanıyorsa sürümü tek yerde tutmak için pnpm catalogs kullanabilirsiniz (pnpm 9.5 ve sonrası):[^7]

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

Catalogs üç şey kazandırır: workspace'te her bağımlılığın tek sürümü olur, güncelleme yalnızca `pnpm-workspace.yaml`'da tek satırlık değişikliktir ve `package.json` dosyalarında merge çakışması çıkmaz.[^10]

Paketleri tasarlarken iki kural işinizi görür:

- **Her pakete tek amaç:** `@repo/ui` tüm paylaşılan UI bileşenlerini, `@repo/typescript-config` TypeScript ayarlarını barındırır.[^11]
- **Uygulamalar paylaşılan kod barındırmaz.** Ortak kodu ayrı bir pakete koyun, uygulamalar o pakete bağlansın. Uygulamalar paket grafiğinin sonudur.[^11]

## Ortak UI paketi

Bir iç paketi derlemenin iki yolu var:[^9]

|  | **Just-in-Time** | **Compiled** |
| --- | --- | --- |
| Nasıl çalışır | TypeScript dosyalarını doğrudan export eder, uygulamanın bundler'ı derler | `tsc` ile `dist` klasörüne derlenir |
| Yapılandırma | Çok az | Daha fazla |
| Turborepo önbelleği | Paketin kendi `build` adımı olmadığı için önbelleğe alınamaz | Build çıktıları `outputs` ile önbelleğe alınır |
| Ne zaman | Uygulamalar Turbopack, webpack veya Vite gibi modern bir bundler kullanıyorsa | Paketi TypeScript'i derleyemeyen bir araç da kullanıyorsa |

[!nextjs] ve Vite uygulamalarının paylaştığı bir UI paketi için Just-in-Time en az yapılandırmayla başlayan seçenek. Uygulamaların build süresinden memnunsanız önbellek kaybı sorun olmaz.[^9]

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

Dosya başına `exports` tanımlamak, paketi tek bir barrel dosyasına bağlamaktan kaçınmanızı sağlar. Barrel dosyaları derleyiciler ve bundler'lar için zordur.[^6] [Önceki rehberdeki](/academy/architecture/folder-structure) `index.ts` tartışmasının paket düzeyindeki karşılığı bu.

> [!WARNING]
>
> **Just-in-Time paketin içinde `paths` kullanamazsınız.** Paketi tüketici derlediği için TypeScript'in `compilerOptions.paths` ayarı çalışmaz. Bunun yerine Node.js subpath imports kullanın: `package.json` içinde `"imports": { "#*": "./src/*" }` yazıp kodda `#utils.ts` gibi import edin.[^12] Uygulamanın kendi içinde `@/` alias'ını kullanmaya devam edersiniz.

TypeScript ayarını da paylaşın. `packages/typescript-config` altında `base.json` ve `nextjs.json`, `react-library.json` gibi varyantlar durur, her paket kendi `tsconfig.json`'ında `extends` ile bunlardan birini seçer:[^12]

```json
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

Kök dizinde `tsconfig.json`'a genellikle ihtiyacınız yok. Kökteki bir değişiklik tüm görevlerin önbelleğini düşürür.[^12]

**shadcn/ui kullanıyorsanız** CLI monorepo'yu tanıyor. `pnpm dlx shadcn@latest init --monorepo` iki workspace (`web` ve `ui`) ve Turborepo kurar. `apps/web` içinde `add button` çalıştırdığınızda bileşen `packages/ui` altına iner ve import yolları güncellenir. Bileşenler `@workspace/ui/components/button` gibi import edilir.[^13] Her workspace'te bir `components.json` bulunmalı, `style`, `iconLibrary` ve `baseColor` ikisinde de aynı olmalı. Tailwind CSS v4'te `components.json` içindeki `tailwind.config` alanı boş bırakılır.[^13] shadcn paketi `@workspace/ui` adıyla kuruyor, bu rehberdeki `@repo/ui` ile aynı rolde: shadcn kullanıyorsanız onun adını koruyun.

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

Her `tasks` anahtarı, paketlerin `package.json` dosyasındaki aynı adlı script'i çalıştırır.[^4]

- **`^build`:** Bir paketten önce bağımlılıklarının `build` görevini çalıştırır. `@repo/ui` derlenip bittikten sonra `web` derlenir.[^4]
- **`outputs`:** Hangi dosyaların önbelleğe alınacağını söyler. Yazmazsanız Turborepo dosyaları önbelleğe almaz ve önbellekten dönen çalıştırma dosyaları geri getirmez.[^4][^5]
- **`dev`:** Hiç bitmeyen bir görev olduğu için `persistent: true` ve `cache: false` alır.[^4]

> [!WARNING]
>
> `"build": {}` yazmak yetmez: görevler sırasız paralel çalışır ve çıktılar önbelleğe alınmaz, bu hızla hataya yol açar.[^4]

Önbellek girdilerin parmak izine dayanır. Aynı parmak izi yeniden gelirse Turborepo işi yeniden yapmaz, sonucu önbellekten geri getirir.[^5] Yerel önbellek `.turbo/cache` klasöründe durur. `npx turbo login` ve `npx turbo link` ile Remote Cache'i açarsanız takım arkadaşlarınız ve CI aynı önbelleği paylaşır.[^5] Kök `package.json`'daki bir bağımlılığı güncellemek tüm görevlerin önbelleğini düşürür, kök dizini ince tutmanın pratik gerekçesi bu.[^5]

`check-types` için `^check-types` doğru önbellek davranışı verir ama görevleri paralel çalıştırmaz. Hem doğruluk hem paralellik için Turborepo dokümanı Transit Node kalıbını öneriyor.[^4]

## Görevleri çalıştırma

```bash
turbo run build                 # tüm paketler
turbo run build --filter=web... # web ve bağımlılıkları
turbo run build --filter=...ui  # ui ve onu kullanan paketler
turbo run build test lint       # birden çok görev, mümkün olduğunca paralel
```

`...` sonda bağımlılıkları, başta bağımlıları (dependents) kapsar.[^14] Bir paketi değiştirirken `--filter=...ui` ile onu kullanan her şeyin hâlâ derlendiğini görebilirsiniz.[^14]

> [!WARNING]
>
> `turbo` komutlarını yalnızca kökteki `package.json`'a yazın. Paketlerin kendi script'lerine yazarsanız `turbo` kendini özyinelemeli çağırır.[^14]

> [!TIP]
>
> Bir paketten başka bir pakete ulaşmak için `../` yazdığınızı fark ederseniz durun. O paketi bağımlılık olarak ekleyip adıyla import edin.[^6]

## Kendin dene

1. `pnpm dlx create-turbo@latest` ile örnek bir repo oluşturun. `apps/web` ile `packages/ui` arasındaki `workspace:*` bağını inceleyin.
2. `turbo run build` komutunu iki kez çalıştırın. İkincisinde önbellekten dönen sonucu görün.
3. `packages/ui` içinde bir bileşeni değiştirin ve `turbo run build --filter=...ui` çalıştırın. Hangi paketlerin yeniden derlendiğine bakın.
4. `turbo.json`'dan `outputs`'u silip tekrar deneyin. Önbellekten dönen build'in dosyaları geri getirmediğini görün.

## Kaynaklar

1. [The New Stack: The Case for (and Against) Monorepos on the Frontend](https://thenewstack.io/the-case-for-and-against-monorepos-on-the-frontend/) *(article)* — Monorepo'nun frontend'de iş birliği maliyetine etkisi ve geçişin organizasyonel yönü.
2. [Graphite: When to use a monorepo](https://graphite.com/guides/when-to-use-monorepo) *(article)* — Monorepo'nun uygun ve uygun olmadığı durumlar.
3. [pnpm: Workspace](https://pnpm.io/workspaces) *(article)* — `pnpm-workspace.yaml`, `workspace:` protokolü ve tek lockfile.
4. [Turborepo: Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) *(article)* — `tasks`, `dependsOn`, `^`, `outputs` ve paralel çalıştırma.
5. [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) *(article)* — Parmak izi tabanlı önbellek, Remote Cache ve global hash girdileri.
6. [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) *(article)* — `apps/` ve `packages/` yapısı, paket anatomisi, `exports` ve `@repo` öneki.
7. [Turborepo: Managing dependencies](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies) *(article)* — Bağımlılığı kullanıldığı pakete kurma, kök dizinde az bağımlılık ve sürümleri eşitleme.
8. [Nx: Enforce module boundaries](https://nx.dev/docs/features/enforce-module-boundaries.md) *(article)* — Nx'in mimari sınırları zorlama mekanizmaları.
9. [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) *(article)* — `workspace:*` ile kullanım, Just-in-Time ve Compiled paket stratejileri.
10. [pnpm: Catalogs](https://pnpm.io/catalogs) *(article)* — Sürümleri `catalog:` protokolüyle tek yerde tutma.
11. [Turborepo: Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package) *(article)* — Paket oluşturma adımları, tek amaçlı paketler ve uygulamalarda paylaşılan kod barındırmama.
12. [Turborepo: TypeScript](https://turborepo.dev/docs/guides/tools/typescript) *(article)* — Paylaşılan `tsconfig` paketi, Node.js subpath imports ve kök `tsconfig`'e ihtiyaç duyulmaması.
13. [shadcn/ui: Monorepo](https://ui.shadcn.com/docs/monorepo) *(article)* — `init --monorepo`, `packages/ui` yapısı ve `components.json` gereksinimleri.
14. [Turborepo: Running tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks) *(article)* — `turbo run`, `--filter` kalıpları ve kök script'lerde kullanım.
