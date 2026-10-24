---
title: "Korumalı yönetim paneli"
description: "Giriş, rol kontrolü ve güvenlik başlıklarıyla küçük bir panel."
lastVerified: "2026-10-22"
translationKey: "auth-security/project"
---

## Senaryo

Bir mağazanın yönetim panelini yazacaksınız. Panel:

- E-posta ve parolayla giriş ister. Giriş yapmamış kullanıcı `/sign-in`'e gider.
- Üç rol tanır: `customer` panele giremez, `editor` fiyat günceller, `admin` ürün arşivler ve rol değiştirir.
- Ürün açıklamasını HTML olarak gösterir ama içindeki script'i temizler.
- Arşivleme bir Route Handler'dır ve başka siteden gelen isteği reddeder.
- Her sayfada nonce'lu CSP ve güvenlik başlıkları vardır.
- Hepsini Playwright testleriyle korur.

Her parçanın hangi dersten geldiği:

| Parça | Dosya | Ders |
| :-- | :-- | :-- |
| Better Auth, giriş, proxy | `lib/auth.ts`, `app/sign-in/`, `proxy.ts` | Next.js'te auth |
| Rol ve izin, DAL, IDOR'a karşı kontrol | `lib/permissions.ts`, `lib/dal.ts`, `app/admin/actions.ts` | Yetkilendirme ve roller |
| Temizlenmiş HTML, CSP | `lib/products.ts`, `proxy.ts` | XSS ve CSP |
| `Sec-Fetch-Site`, güvenlik başlıkları | `lib/csrf.ts`, `next.config.ts` | CSRF, CORS ve güvenlik başlıkları |
| DTO, `allowScripts` | `lib/users.ts`, `package.json` | Secret ve bağımlılık güvenliği |

Projenin çalışan hali GitHub'da: [examples/auth-security/project](https://github.com/virastack/academy/tree/main/examples/auth-security/project). Uygulama ve 12 test orada; takıldığınızda karşılaştırın.

> [!NOTE]
>
> Proje `next@16.4.2`, `better-auth@1.7.12`, `better-sqlite3@13.0.3` ve `isomorphic-dompurify@4.6.0` ile yazıldı. Testler Chromium'da production build üzerinde çalıştırıldı.

## Adım 1: Projeyi kurun

```command
npx create-next-app@latest admin-panel --yes
```

```command
npm install better-auth better-sqlite3 isomorphic-dompurify zod server-only
```

`create-next-app`, `next.config.ts`'e `cacheComponents: true` yazar. Bu projede onu **kapatın**: nonce'lu CSP, Partial Prerendering ile çalışmaz.[^1] Yönetim paneli zaten kişiye özel olduğu için statik kabuktan bir şey kaybetmezsiniz.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

`securityHeaders` dizisi [CSRF, CORS ve güvenlik başlıkları](/academy/auth-security/csrf-cors-and-headers) dersindeki listenin aynısıdır. `authInterrupts`, 403 sayfası gösteren `forbidden()` fonksiyonunu açar; şu an deneyseldir.[^2]

Kök layout'ta `await connection()` çağırın. Nonce her istekte üretildiği için hiçbir sayfa statik kalmamalı; aksi halde giriş formunun script'leri nonce'suz kalır ve CSP onları engeller.[^1] Testte bu satır olmadan `/sign-in` statik üretildi ve form çalışmadı.

> [!TIP]
>
> npm 12 kullanıyorsanız kurulumda `better-sqlite3`, `esbuild` ve `unrs-resolver` için script uyarısı görürsünüz. Örnek projede üçü de `package.json`'daki `allowScripts` alanında onaylı.

## Adım 2: Kullanıcı ve rol

Rol, kullanıcının kendisinin gönderemeyeceği bir alandır:[^3]

```ts
// lib/auth.ts
export const auth = betterAuth({
  database: db,
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "customer", input: false },
    },
  },
  plugins: [nextCookies()],
});
```

Tabloları `npx auth migrate --yes` açar. `scripts/seed.ts` üç kullanıcı ve üç ürün ekler; biri bilerek `<img onerror>` taşır.

## Adım 3: İzinler ve Data Access Layer

İzinler [Yetkilendirme ve roller](/academy/auth-security/authorization-and-roles) dersindeki gibi tek dosyadadır. `customer`'ın listesi boştur:

```ts
// lib/permissions.ts
const permissions = {
  customer: [],
  editor: ["product:read", "product:update"],
  admin: ["product:read", "product:update", "product:archive", "user:manage"],
} as const satisfies Record<Role, readonly string[]>;
```

`requirePermission` artık `Error` fırlatmak yerine `forbidden()` çağırır. Next.js 403 durum kodu döner ve `app/forbidden.tsx`'i gösterir:[^2]

```ts
// lib/dal.ts
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, permission)) {
    forbidden();
  }

  return user;
}
```

Her sayfa ilk satırda bunu çağırır: `/admin` için `product:read`, `/admin/users` için `user:manage`.

## Adım 4: Ürünler ve temiz HTML

Veri katmanı tablo satırını değil, sayfanın ihtiyacı olan alanları döndürür. Açıklama burada, üretildiği yerde temizlenir:[^4][^5]

```ts
// lib/products.ts
return rows.map((row) => ({
  id: row.id,
  name: row.name,
  price: row.price,
  description: { __html: DOMPurify.sanitize(row.description) },
}));
```

```tsx
<td dangerouslySetInnerHTML={product.description} />
```

Testte `<b>4K</b> panel<img src="x" onerror="...">` açıklaması kalın yazıyla ve `onerror`'sız basıldı.

## Adım 5: Server Action'lar

Her action izin kontrolüyle başlar, sonra girdiyi Zod ile doğrular. Sayfadaki kontrol action'ı korumaz; action doğrudan çağrılabilir:[^6]

```ts
// app/admin/actions.ts
export async function setRoleAction(formData: FormData) {
  const currentUser = await requirePermission("user:manage");
  const { id, role } = roleSchema.parse(Object.fromEntries(formData));

  if (id === currentUser.id) {
    throw new Error("Kendi rolünüzü değiştiremezsiniz.");
  }

  setRole(id, role);
  revalidatePath("/admin/users");
}
```

Son yöneticinin kendini `customer` yapıp paneli sahipsiz bırakmasını bu kontrol engeller.

## Adım 6: Arşivleme Route Handler'ı

Arşivleme bir istemci bileşeninden `fetch` ile çağrılır. Route Handler önce isteğin nereden geldiğine, sonra oturuma, en son izne bakar:

```ts
// app/api/admin/products/[id]/archive/route.ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isCrossSiteRequest(request)) {
    return new Response(null, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(null, { status: 401 });
  }

  const role = isRole(session.user.role) ? session.user.role : "customer";

  if (!hasPermission(role, "product:archive")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await params;
  return archiveProduct(id) ? new Response(null, { status: 204 }) : new Response(null, { status: 404 });
}
```

`isCrossSiteRequest`, CSRF dersindeki `Sec-Fetch-Site` kontrolüdür.[^7]

## Adım 7: Proxy

`proxy.ts` iki iş yapar. `/admin` için cookie yoksa `/sign-in`'e yönlendirir; bu yalnızca iyimser bir kontroldür, asıl kontrol DAL'dadır.[^8] Sonra her sayfa isteğine nonce'lu CSP ekler. CSP kısmı [XSS ve CSP](/academy/auth-security/xss-and-csp) dersindeki kodun aynısıdır.

```ts
// proxy.ts
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin") && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // ... nonce ve Content-Security-Policy
}
```

## Adım 8: Testler

Playwright'ın önerdiği gibi her rol bir **setup** projesinde bir kez giriş yapar ve oturumu dosyaya kaydeder. Testler bu dosyayı `storageState` ile kullanır.[^9]

Bunun bir sebebi daha var. Better Auth production'da `/sign-in/email` isteklerini **10 saniyede 3 istekle** sınırlar.[^10] Testte her test kendi girişini yapınca dördüncü giriş `429` aldı. Bu sınır kaba kuvvet *(brute force)* saldırılarına karşı ücretsiz bir korumadır; geliştirme ortamında kapalıdır.

| Test | Ne kanıtlar |
| :-- | :-- |
| Giriş yapmamış kullanıcı | `/admin` → `/sign-in` |
| `customer` | 403 sayfası |
| `editor` | Fiyat güncellenir; arşiv isteği `403`, `/admin/users` 403 |
| `admin` | Ürün arşivlenir, rol değişir |
| XSS | `onerror` silinir, script çalışmaz |
| CSRF | Başka siteden gönderilen form `403` alır, ürün yerinde kalır |
| Başlıklar | Nonce'lu CSP, `DENY`, `nosniff`, `X-Powered-By` yok |
| Rol enjeksiyonu | Kayıtta gönderilen `"role": "admin"` veritabanına `customer` olarak yazılır |
| Giriş sınırı | Art arda yanlış parola `429` alır |

CSRF testi saldırgan sayfayı `page.route` ile sahte bir alan adında *(`https://evil.example`)* üretir. Tarayıcı isteği gerçekten başka bir siteden gönderir.

## Adım 9: Son kontrol

```bash
npm run lint
npm run build
npm run test:e2e
```

Build çıktısında bütün sayfalar `ƒ` *(dinamik)* görünmeli. `npm audit` geliştirme araçlarındaki bir açığı raporladı; `npm audit --omit=dev` ise sıfır açık gösterdi. Production'a giden paketlerle geliştirme araçlarını ayırarak okuyun.

## Kendin dene

- `lib/dal.ts`'ten `forbidden()` satırını silin. Hangi testler kırılıyor?
- `setRoleAction`'daki "kendi rolünü değiştiremez" kontrolünü silin ve tek admin olarak kendinizi `customer` yapın. Paneli geri almanın bir yolu var mı?
- Route Handler'daki `isCrossSiteRequest` satırını silip CSRF testini çalıştırın. Neden yine de `401` aldı? *(İpucu: `SameSite=Lax`.)*
- `next.config.ts`'te `cacheComponents: true` yapın, build alın ve giriş sayfasını açın. Konsolda ne görüyorsunuz?
- Bir `audit_log` tablosu ekleyin: fiyat ve rol değişikliklerinde kim, neyi, ne zaman değiştirdi.

## Kaynaklar

1. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — Nonce için dinamik render zorunluluğu ve Partial Prerendering ile uyumsuzluk.
2. [Next.js: forbidden](https://nextjs.org/docs/app/api-reference/functions/forbidden) *(doc)* — 403 sayfası, `forbidden.tsx` ve deneysel `authInterrupts` ayarı.
3. [Better Auth: Database — Extending core schema](https://www.better-auth.com/docs/concepts/database#extending-core-schema) *(doc)* — `additionalFields` ve `input: false`.
4. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — DTO, Data Access Layer ve her Server Action'da yeniden kontrol.
5. [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) *(doc)* — `dangerouslySetInnerHTML` ve DOMPurify ile temizleme.
6. [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) *(doc)* — Varsayılan olarak reddetme ve her istekte kontrol.
7. [OWASP: Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) *(doc)* — Fetch Metadata ile CSRF kontrolü.
8. [Better Auth: Next.js integration](https://www.better-auth.com/docs/integrations/next) *(doc)* — `getSessionCookie`'nin cookie'yi doğrulamaması ve proxy'de iyimser kontrol.
9. [Playwright: Authentication](https://playwright.dev/docs/auth) *(doc)* — Setup projesi, `storageState` ve rol başına oturum.
10. [Better Auth: Rate Limit](https://better-auth.com/docs/concepts/rate-limit) *(doc)* — Production'da varsayılan sınır ve `/sign-in/email` için 10 saniyede 3 istek.
