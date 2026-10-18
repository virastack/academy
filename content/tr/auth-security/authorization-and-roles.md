---
title: "Yetkilendirme ve roller"
description: "Rol ve izin kontrolü; sayfa, API ve Server Action koruması."
lastVerified: "2026-10-18"
translationKey: "auth-security/authorization-and-roles"
---

Kimlik doğrulama "sen kimsin?" sorusunu yanıtlar. **Yetkilendirme** *(authorization)* ise "bunu yapmaya iznin var mı?" sorusunu. Giriş yapmış her kullanıcı her şeyi yapamaz: müşteri yalnızca kendi siparişini görür, editör ürün günceller, yönetici kullanıcıları yönetir.

Bu konu küçük görünür ama OWASP Top 10:2025'in **birinci** sırasında *Broken Access Control* var. OWASP'ın test ettiği uygulamaların %100'ünde bir tür erişim kontrolü hatası bulundu.[^1]

> [!NOTE]
>
> Bu dersteki kodlar [Next.js'te auth](/academy/auth-security/auth-in-nextjs) dersindeki proje üzerine kuruldu ve `next@16.4.2`, `better-auth@1.7.10` ile Chromium'da test edildi.

## 401, 403 ve 404

| Durum | Anlamı | Ne zaman |
| :-- | :-- | :-- |
| `401 Unauthorized` | Kim olduğun belli değil | Oturum yok ya da geçersiz |
| `403 Forbidden` | Kim olduğunu biliyorum ama izin yok | Tekrar giriş yapmak sonucu değiştirmez |
| `404 Not Found` | Böyle bir kayıt yok | Kaydın varlığını bile belli etmek istemiyorsanız 403 yerine |

MDN, kaynağın var olduğunu yetkisiz kullanıcıya göstermek istemiyorsanız 403 yerine 404 dönebileceğinizi yazar.[^2]

## Rol ve İzin

En yaygın model **RBAC**'tir *(role-based access control)*: her kullanıcının bir rolü, her rolün bir izin listesi vardır.[^3] Kodda rolü değil **izni** kontrol etmek, yeni bir rol eklendiğinde her `if` satırını değiştirmekten kurtarır:

```ts
// lib/permissions.ts
export type Role = "customer" | "editor" | "admin";

const permissions = {
  customer: ["order:read-own"],
  editor: ["order:read-own", "product:update"],
  admin: ["order:read-own", "order:read-all", "product:update", "user:manage"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof permissions)[Role][number];

export function hasPermission(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}
```

`Permission` tipi listeden türetildiği için `hasPermission(user.role, "order:delete-all")` gibi olmayan bir izin TypeScript hatası verir.

RBAC tek başına "bu sipariş bu kullanıcının mı?" sorusunu yanıtlayamaz. OWASP bu yüzden kaydın sahibi, takım ya da saat gibi niteliklere bakan **ABAC** *(attribute-based)* ve ilişkilere bakan **ReBAC** *(relationship-based)* modellerini daha esnek bulur.[^3] Pratikte çoğu uygulama ikisini birlikte kullanır: rol genel izni, sahiplik kontrolü de tek bir kaydı belirler.

## Rolü Kim Belirler

Rol, kullanıcının değiştirebileceği bir yerde durmamalı. Better Auth'ta role kullanıcı tablosuna `input: false` ile eklenir; böylece kayıt ya da güncelleme isteğiyle gönderilemez:[^4]

```ts
// lib/auth.ts
export const auth = betterAuth({
  // ...
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
        input: false,
      },
    },
  },
});
```

Testte kayıt isteğine `"role": "admin"` eklendi. İstek başarılı oldu ama veritabanına `customer` yazıldı.

> [!DONT]
>
> - Rolü `localStorage`'da, URL'de *(`?isAdmin=true`)* ya da istemcinin gönderdiği bir alanda tutup ona güvenmeyin.[^5]
> - Yalnızca butonu gizleyip işlemi korumasız bırakmayın.

## Kontrolü Tek Yerde Toplamak

Önceki dersteki Data Access Layer'a bir yardımcı daha eklenir. Rolü her istekte oturumdan, yani sunucudan okur:

```ts
// lib/dal.ts
import "server-only";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as Role,
  };
}

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, permission)) {
    throw new Error("Forbidden");
  }

  return user;
}
```

Bir sayfa ya da bileşen artık `await requirePermission("user:manage")` ile başlar. OWASP'ın iki temel kuralı bu yapıda kendiliğinden uygulanır: **varsayılan olarak reddet** ve **her istekte kontrol et**.[^3]

## Server Action'ı Korumak

Next.js dokümantasyonu bunu açıkça yazar: Server Action'lar arayüzünüzden bağımsız olarak doğrudan bir POST isteğiyle çağrılabilir. Sayfadaki giriş kontrolü, sayfanın içindeki action'ı korumaz; her action kendi kontrolünü yapmalıdır.[^5]

En sık yapılan hata, giriş kontrolünü yapıp **sahiplik** kontrolünü unutmaktır. Kullanıcı başka birinin sipariş numarasını gönderir ve işlem gerçekleşir. Buna **IDOR** *(Insecure Direct Object Reference)* denir.[^6]

```ts
// lib/orders.ts
import "server-only";

export async function cancelOrder(orderId: string) {
  const user = await getCurrentUser();
  const order = await db.order.findUnique({ where: { id: orderId } });

  const canCancel =
    order && (order.userId === user.id || hasPermission(user.role, "order:read-all"));

  if (!canCancel) {
    throw new Error("Not found");
  }

  await db.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
}
```

```ts
// app/orders/actions.ts
"use server";

import { cancelOrder } from "@/lib/orders";

export async function cancelOrderAction(orderId: string) {
  await cancelOrder(orderId);
}
```

Action ince kalır; giriş, sahiplik ve rol kontrolü Data Access Layer'dadır.[^5] Test sonuçları:

| Kim | İşlem | Sonuç |
| :-- | :-- | :-- |
| Burak *(customer)* | Ayşe'nin siparişini iptal | Hata; sipariş `open` kaldı |
| Ayşe *(customer)* | Kendi siparişini iptal | Başarılı |
| Burak *(admin yapıldıktan sonra)* | Ayşe'nin siparişini iptal | Başarılı |

> [!TIP]
>
> Rastgele ve tahmin edilemez kimlikler *(UUID)* IDOR'u zorlaştırır ama çözmez. OWASP her nesne için ayrı yetki kontrolü ister.[^6]

## Route Handler'ı Korumak

Route Handler da açık bir API uç noktasıdır. Önce oturum, sonra izin kontrol edilir:[^7]

```ts
// app/api/orders/[id]/route.ts
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(null, { status: 401 });
  }

  if (!hasPermission(session.user.role as Role, "order:read-all")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await params;
  // ...
}
```

Testte giriş yapmamış istek `401`, müşteri `403`, yönetici `200` aldı.

## Arayüzde Göstermek

Kullanıcının yapamayacağı bir butonu göstermemek iyi bir deneyimdir, ama **güvenlik değildir**. OWASP istemci tarafındaki erişim kontrolüne asla güvenilmemesini söyler.[^3] React Summit 2025'teki "Security meets Usability" konuşması da aynı ayrımı yapar: frontend'deki izin kontrolü kullanıcı deneyimi içindir, asıl kontrol backend'de olmalıdır.[^8]

```tsx
async function OrderActions({ orderId }: { orderId: string }) {
  const user = await getCurrentUser();

  if (!hasPermission(user.role, "order:read-all")) {
    return null;
  }

  return <CancelOrderButton orderId={orderId} />;
}
```

Bu bileşen butonu gizler. Asıl koruma `cancelOrder` içindeki kontroldür.

## Kendin Dene

- Bir Server Action'daki sahiplik kontrolünü silin, ikinci bir kullanıcıyla giriş yapıp ilk kullanıcının kayıt kimliğini gönderin ve işlemin gerçekleştiğini görün.
- DevTools > **Network** sekmesinde bir Server Action isteğini bulun, sağ tıklayıp **Copy as fetch** ile kopyalayın ve konsolda farklı bir kimlikle tekrar gönderin.
- `permissions` nesnesine yeni bir rol ekleyin ve hangi dosyaları değiştirmeniz gerektiğini sayın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** OWASP Authorization Cheat Sheet; varsayılan olarak reddetme, en az yetki ve RBAC, ABAC, ReBAC karşılaştırması.[^3]
- **Resmi doküman:** Next.js Data Security rehberi; Server Action'ların doğrudan çağrılabilmesi, IDOR örneği ve denetim listesi.[^5]
- **Konuşma:** Samhitha Rama Prasad, "Security meets Usability: Crafting Dynamic and Granular Access Control Solutions" *(React Summit 2025, 21 dk)*.[^8]
- **Resmi doküman:** OWASP A01:2025 Broken Access Control.[^1]

## Kaynaklar

1. [OWASP Top 10:2025 — A01 Broken Access Control](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/) *(doc)* — Birinci sıra, test edilen uygulamaların %100'ü, IDOR, yetki yükseltme ve önlemler.
2. [MDN: 403 Forbidden](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403) *(doc)* — 401 ile farkı ve 403 yerine 404 dönme seçeneği.
3. [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) *(doc)* — En az yetki, varsayılan olarak reddetme, her istekte kontrol, RBAC ve ABAC/ReBAC, istemci tarafı kontrole güvenmeme.
4. [Better Auth: Database — Extending core schema](https://www.better-auth.com/docs/concepts/database#extending-core-schema) *(doc)* — `additionalFields`, `defaultValue` ve rolü kullanıcının belirleyememesi için `input: false`.
5. [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Server Action'ların doğrudan POST ile çağrılabilmesi, her action'da yeniden kontrol, IDOR örneği, `searchParams`'a güvenmeme ve DAL ile mutasyon.
6. [OWASP: Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html) *(doc)* — IDOR tanımı, örneği ve rastgele kimliklerin tek başına yetmemesi.
7. [Next.js: How to implement authentication — Route Handlers](https://nextjs.org/docs/app/guides/authentication#route-handlers) *(doc)* — Route Handler'da oturum ve rol kontrolü, 401 ve 403.
8. [Samhitha Rama Prasad: Security meets Usability](https://gitnation.com/contents/security-meets-usability-crafting-dynamic-and-granular-access-control-solutions) *(video)* — React Summit 2025; RBAC ve ABAC, React'te izin sistemi ve backend'de zorunlu kontrol.
