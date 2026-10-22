---
title: "Çoklu Paket Projesi"
description: "Monorepo içinde ortak UI paketi ve iki uygulama kurma."
lastVerified: "2026-10-22"
translationKey: "architecture/multi-package-project"
---

## Senaryo

Bir mağazanın iki uygulaması var: müşterinin gördüğü mağaza ve ekibin kullandığı yönetim paneli. İkisi aynı butonu ve aynı fiyat biçimini kullanmalı. Kodu kopyalamak yerine tek bir pakette tutacaksınız.

| Parça | Klasör | Araç |
| :-- | :-- | :-- |
| Mağaza | `apps/store` | [!nextjs] |
| Yönetim paneli | `apps/admin` | [!vite] + [!react] |
| Ortak UI | `packages/ui` (`@repo/ui`) | Just-in-Time paket, [!vitest] |
| Ortak TypeScript ayarı | `packages/typescript-config` | [!typescript] |
| Görevler ve önbellek | `turbo.json` | [!turborepo] |

Kavramlar [Monorepo](/academy/architecture/monorepo) dersinde anlatıldı. Burada hepsini bir arada kurup çalıştığını göreceksiniz.

Projenin çalışan hali GitHub'da: [examples/architecture/multi-package-project](https://github.com/virastack/academy/tree/main/examples/architecture/multi-package-project).

> [!NOTE]
>
> Proje `pnpm@10.28.0`, `turbo@2.11.10`, `next@16.4.2`, `vite@8.3.5` ve `vitest@5.0.5` ile yazıldı.

## Adım 1: Kök Dizin

```text
store-monorepo/
├── apps/
│   ├── store/
│   └── admin/
├── packages/
│   ├── ui/
│   └── typescript-config/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: 19.3.0
  react-dom: 19.3.0
  "@types/react": ^19
  "@types/react-dom": ^19
  typescript: ^5
```

`catalog` ile React ve TypeScript sürümleri tek yerde durur. Paketler sürüm yerine `"react": "catalog:"` yazar.[^1] Üç paketin üç farklı React sürümüne kayması böyle önlenir.

Kök `package.json`'da yalnızca `turbo` var. Uygulama bağımlılıkları onları kullanan pakete yazılır.[^2]

```json
// package.json
{
  "private": true,
  "packageManager": "pnpm@10.28.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "check-types": "turbo run check-types",
    "test": "turbo run test"
  },
  "devDependencies": { "turbo": "^2.11.10" }
}
```

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**", "dist/**"]
    },
    "check-types": { "dependsOn": ["^check-types"] },
    "test": { "dependsOn": ["^test"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`outputs` iki uygulamanın çıktısını kapsar: Next.js `.next/`'e, Vite `dist/`'e yazar.[^3]

## Adım 2: Ortak TypeScript Ayarı

`packages/typescript-config` içinde iki dosya var: `base.json` ve onu genişleten `nextjs.json`. Her paket kendi `tsconfig.json`'ında bunlardan birini seçer.[^4]

```json
// packages/typescript-config/base.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true
  }
}
```

`allowImportingTsExtensions` neden `base.json`'da? UI paketi `#format-price.ts` gibi uzantılı import kullanacak. Just-in-Time pakette tip kontrolü tüketicide de çalışır; paketteki kod, uygulamanın `tsc` çalıştırmasına girer.[^5] Ayarı yalnızca UI paketine koyduğumda yönetim paneli şu hatayı verdi:

```text
../../packages/ui/src/price.tsx(1,29): error TS5097: An import path can only end with a '.ts'
extension when 'allowImportingTsExtensions' is enabled.
```

## Adım 3: UI Paketi

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "type": "module",
  "exports": {
    "./button": "./src/button.tsx",
    "./price": "./src/price.tsx",
    "./styles.css": "./src/styles.css"
  },
  "imports": {
    "#*": "./src/*"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

- **`exports`:** Her dosya ayrı bir giriş. Tek bir barrel dosyası yok; uygulama `@repo/ui/button` yazar.[^6]
- **`build` script'i yok:** Paket TypeScript'i olduğu gibi verir, uygulamanın bundler'ı derler. Bu bir Just-in-Time pakettir.[^5]
- **`imports`:** Paketin içinde `@/` gibi `paths` alias'ı çalışmaz, çünkü kodu tüketici derler. Yerine Node.js subpath imports kullanılır.[^4]

```tsx
// packages/ui/src/price.tsx
import { formatPrice } from "#format-price.ts";

export function Price({ value }: { value: number }) {
  return <span className="ui-price">{formatPrice(value)}</span>;
}
```

Stil de paketin parçası: `styles.css` dosyası `exports` ile dışa açılır ve iki uygulama da onu import eder.

## Adım 4: Uygulamalara Bağlayın

```json
// apps/store/package.json ve apps/admin/package.json
{
  "dependencies": {
    "@repo/ui": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

`workspace:*` paketin registry'den değil, workspace'ten gelmesini garanti eder.[^7]

```tsx
// apps/store/src/components/add-to-cart.tsx
"use client";

import { Button } from "@repo/ui/button";
```

```tsx
// apps/admin/src/app.tsx
import { Button } from "@repo/ui/button";
import { Price } from "@repo/ui/price";
```

İki uygulamada da ek ayar gerekmedi. Turbopack workspace paketlerini kendisi derler; `transpilePackages` yalnızca `node_modules`'tan gelen derlenmemiş paketler ve webpack ile Pages Router gibi durumlar için gerekir.[^8] Vite de TypeScript kaynağını doğrudan derledi.

> [!WARNING]
>
> `Button` dosyasında `"use client"` yok, çünkü kendisi state tutmuyor. `onClick` veren bileşen ise Client Component olmalı. Mağazada bu yüzden `add-to-cart.tsx` ayrı bir dosya.

## Adım 5: Paketi Test Edin

Testler paketin yanında durur. Paketi değiştiren, onun testini de çalıştırır.

```tsx
// packages/ui/src/button.test.tsx
test("Price formats Turkish lira", () => {
  render(<Price value={2499} />);

  expect(screen.getByText("₺2.499,00")).toBeTruthy();
});
```

```command
pnpm install
pnpm turbo run build check-types test
```

Altı görev de geçmeli: iki `build`, üç `check-types` ve bir `test`. Turborepo birbirine bağlı olmayan görevleri paralel çalıştırır.[^10]

## Adım 6: Önbelleği ve Filtreyi Görün

Aynı komutu ikinci kez çalıştırın:

```text
 Tasks:    6 successful, 6 total
Cached:    6 cached, 6 total
  Time:    14ms >>> FULL TURBO
```

Hiçbir girdi değişmediği için Turborepo işi tekrarlamadı, sonucu önbellekten getirdi.[^9]

Şimdi `packages/ui/src/styles.css`'te bir satır değiştirin ve yalnızca UI'ı kullananları derleyin:[^10]

```command
pnpm turbo run build --filter=...@repo/ui
```

```text
   • Packages in scope: @repo/ui, admin, store
admin:build: cache miss, executing 65b696c8bcb51874
store:build: cache miss, executing cb587f335c67df93
```

Son olarak yalnızca `apps/admin` içinde bir başlığı değiştirip `pnpm build` çalıştırın. Yönetim paneli yeniden derlenir, mağaza önbellekten gelir:

```text
admin:build: cache miss, executing b61e7c14bf8626b5
store:build: cache hit, replaying logs cb587f335c67df93
```

> [!TIP]
>
> `pnpm dev` iki geliştirme sunucusunu birlikte açar: mağaza `localhost:3000`'de, panel `localhost:5173`'te. UI paketinde yaptığınız değişiklik ikisine de anında yansır.

## Kendin Dene

- `@repo/ui`'a bir `Card` bileşeni ekleyin. `exports`'a yeni satırını yazın ve iki uygulamada kullanın.
- `turbo.json`'dan `outputs` alanını silin, iki kez build alın ve `.next` klasörünü silip üçüncüsünü çalıştırın. Önbellekten dönen build dosyaları geri getiriyor mu?
- UI paketini Compiled pakete çevirin: `tsc` ile `dist/`'e derleyin, `exports`'u `dist`'e yönlendirin ve `build` görevinin önbelleğe alındığını görün.[^5]
- `packages/ui/src/price.tsx` içinde bilerek bir tip hatası yapın. `pnpm check-types` çıktısında hatanın hangi paketlerde göründüğüne bakın.

## Kaynaklar

1. [pnpm: Catalogs](https://pnpm.io/catalogs) *(doc)* — Sürümleri `catalog:` protokolüyle tek yerde tutma.
2. [Turborepo: Managing dependencies](https://turborepo.dev/docs/crafting-your-repository/managing-dependencies) *(doc)* — Bağımlılığı kullanıldığı pakete kurma ve kökte az bağımlılık.
3. [Turborepo: Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) *(doc)* — `dependsOn`, `^`, `outputs` ve `persistent` görevler.
4. [Turborepo: TypeScript](https://turborepo.dev/docs/guides/tools/typescript) *(doc)* — Paylaşılan `tsconfig` paketi ve `paths` yerine Node.js subpath imports.
5. [Turborepo: Internal Packages](https://turborepo.dev/docs/core-concepts/internal-packages) *(doc)* — Just-in-Time ve Compiled paketler; iç paketteki tip hatalarının tüketicide görünmesi.
6. [Turborepo: Structuring a repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) *(doc)* — `apps/` ve `packages/` yapısı, dosya başına `exports` ve `@repo` öneki.
7. [pnpm: Workspace](https://pnpm.io/workspaces) *(doc)* — `workspace:` protokolü ve tek lockfile.
8. [Next.js: transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) *(doc)* — Turbopack'in workspace paketlerini kendisi derlemesi ve ayarın gerektiği durumlar.
9. [Turborepo: Caching](https://turborepo.dev/docs/crafting-your-repository/caching) *(doc)* — Girdilerin parmak izi ve önbellekten geri getirme.
10. [Turborepo: Running tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks) *(doc)* — `--filter` ve `...` ile bağımlı paketleri seçme.
