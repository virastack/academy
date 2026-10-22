# Çoklu Paket Projesi

[Mimari rehberindeki](https://virastack.com/academy/architecture/multi-package-project) proje dersinin çalışan hali. Takıldığınızda karşılaştırın.

pnpm workspace ve Turborepo ile kurulmuş bir monorepo:

- `apps/store`: Next.js mağaza (port 3000)
- `apps/admin`: Vite + React yönetim paneli (port 5173)
- `packages/ui`: İki uygulamanın paylaştığı `@repo/ui` (Just-in-Time paket, Vitest testleri)
- `packages/typescript-config`: Paylaşılan `tsconfig` dosyaları

## Çalıştırma

```bash
pnpm install
pnpm dev
```

## Kontroller

```bash
pnpm build
pnpm check-types
pnpm test
```

Aynı komutu ikinci kez çalıştırdığınızda Turborepo sonucu önbellekten getirir (`FULL TURBO`).
