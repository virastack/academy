# Korumalı Yönetim Paneli

[Auth ve Güvenlik rehberindeki](https://virastack.com/academy/auth-security/project) proje dersinin çalışan hali. Takıldığınızda karşılaştırın.

Küçük bir mağaza yönetim paneli: e-posta ve parolayla giriş, `customer`, `editor` ve `admin` rolleri, rol ve izin kontrolü, temizlenmiş HTML, CSRF korumalı bir Route Handler, nonce'lu CSP ve güvenlik başlıkları.

## Çalıştırma

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

`.env.local` içindeki `BETTER_AUTH_SECRET` değerini `openssl rand -base64 32` ile üretin. Seed üç kullanıcı açar; hepsinin parolası `parola-1234`:

| E-posta | Rol |
| :-- | :-- |
| `admin@example.com` | admin |
| `editor@example.com` | editor |
| `customer@example.com` | customer |

## Kontroller

```bash
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright testleri production build üzerinde çalışır; CSP ve Better Auth'un giriş sınırı yalnızca orada gerçek davranır. Testler başlamadan veritabanını seed ile sıfırlar.

| Dosya | Ne öğretir |
| :-- | :-- |
| `lib/auth.ts` | Better Auth, `input: false` ile kullanıcının değiştiremediği rol |
| `lib/permissions.ts` | Rol ve izin listesi, `hasPermission` |
| `lib/dal.ts` | Data Access Layer, `requirePermission` ve `forbidden()` |
| `lib/products.ts`, `lib/users.ts` | DTO döndürmek, `isomorphic-dompurify` ile temizlenmiş HTML |
| `app/admin/actions.ts` | Her Server Action'da izin kontrolü ve Zod doğrulaması |
| `app/api/admin/products/[id]/archive/route.ts` | `Sec-Fetch-Site` ile CSRF kontrolü, 401 ve 403 |
| `proxy.ts` | İyimser oturum yönlendirmesi ve nonce'lu CSP |
| `next.config.ts` | Güvenlik başlıkları, `poweredByHeader`, `authInterrupts` |
| `package.json` | npm 12 için `allowScripts` onayları |
| `e2e/` | Rol başına oturum, XSS, CSRF, başlık, rol enjeksiyonu ve giriş sınırı testleri |
