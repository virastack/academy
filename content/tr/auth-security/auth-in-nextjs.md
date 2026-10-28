---
title: "Next.js'te auth"
description: "Auth kütüphanesi seçimi, giriş, oturum okuma ve proxy ile yönlendirme."
lastVerified: "2026-10-18"
translationKey: "auth-security/auth-in-nextjs"
---

Önceki derslerde oturumun, parolanın ve OAuth'un nasıl çalıştığını gördük. Bu derste hepsini bir [!nextjs] Next.js App Router projesinde bir araya getiriyoruz: kütüphane seçimi, giriş formu, sunucuda oturum okuma, çıkış ve `proxy.ts` ile yönlendirme.

> [!NOTE]
>
> Bu dersteki kodlar `create-next-app` ile açılan `next@16.4.2` projesinde, `better-auth@1.7.10` ve `better-sqlite3` ile çalıştırıldı. Giriş, çıkış ve yönlendirme akışı Chromium'da Playwright ile test edildi; `next build` hatasız tamamlandı.

## Kütüphane seçimi

Next.js dokümantasyonu auth'u kendiniz yazabileceğinizi ama güvenlik ve sadelik için bir kütüphane kullanmanızı önerir.[^1] Seçenekler iki gruba ayrılır:

| Tür | Örnek | Ne zaman |
| :-- | :-- | :-- |
| Kendi veritabanınızda çalışan kütüphane | Better Auth, Auth.js | Kullanıcı verisinin sizde kalmasını istiyorsanız |
| Barındırılan servis | Clerk, Auth0, WorkOS, Supabase Auth | Arayüz, 2FA ve kurumsal giriş hazır gelsin istiyorsanız |

Eylül 2025'te Auth.js *(eski adıyla NextAuth.js)* Better Auth ekibine devredildi. Ekip, Auth.js'e güvenlik yamaları vermeye devam ediyor ama yeni projelerin Better Auth ile başlamasını öneriyor.[^2] Better Auth Temmuz 2026'da Vercel'e katıldı ve MIT lisanslı açık kaynak olarak kaldı.[^3] Bu derste Better Auth'u kullanıyoruz.

## Kurulum

```command
npm install better-auth better-sqlite3
```

`.env` dosyasına bir gizli anahtar ve uygulamanın adresi yazılır. Anahtar en az 32 karakter olmalı:[^4]

```bash
# openssl rand -base64 32 ile üretin
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

Sunucu tarafındaki yapılandırma tek bir dosyadır:

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("./sqlite.db"),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
```

`nextCookies()` eklentisi, Server Action içinden yapılan giriş ve çıkışlarda cookie'nin gerçekten yazılmasını sağlar; listede en sonda olmalıdır.[^5] Tabloları oluşturmak için `npx auth@latest migrate` çalıştırılır.[^4] Bu komut `user`, `session`, `account` ve `verification` tablolarını açtı. Parola hash'leme, oturum kimliği üretimi ve `HttpOnly` cookie gibi önceki derslerde gördüğümüz işleri kütüphane üstlenir.

> [!TIP]
>
> TypeScript `better-sqlite3` için tip bulamazsa `npm install -D @types/better-sqlite3` ekleyin. Gerçek projede SQLite yerine Drizzle ya da Prisma adaptörüyle Postgres kullanabilirsiniz.

Ardından auth isteklerini karşılayan route handler ve tarayıcı tarafı istemci eklenir:[^5]

```ts
// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

## Giriş formu

Giriş, istemci tarafında `authClient.signIn.email` ile yapılır.[^6] Hata mesajı, [Parola, passkey ve 2FA](/academy/auth-security/passwords-passkeys-and-mfa) dersinde gördüğümüz gibi hesabın var olup olmadığını belli etmez:

```tsx
// app/sign-in/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const { error } = await authClient.signIn.email({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (error) {
      setError("Email or password is incorrect.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form action={handleSubmit}>
      <input name="email" type="email" autoComplete="username" required />
      <input name="password" type="password" autoComplete="current-password" required />
      <button type="submit">Sign in</button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
```

Başarılı girişten sonra tarayıcıda `better-auth.session_token` adında `HttpOnly` ve `SameSite=Lax` bir cookie oluştu. "GitHub ile giriş" gibi OAuth sağlayıcıları ise `socialProviders` ayarıyla eklenir ve `authClient.signIn.social({ provider: "github" })` ile çağrılır.[^4][^6]

## Oturumu sunucuda okumak

Oturumu okuyan kodu tek bir yerde toplamak, Next.js'in önerdiği **Data Access Layer** fikrinin özüdür. `server-only` paketi bu dosyanın yanlışlıkla bir Client Component'e import edilmesini build hatasıyla engeller.[^1][^7]

```ts
// lib/dal.ts
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  return { id: session.user.id, email: session.user.email };
}
```

Fonksiyon tüm oturum nesnesi yerine yalnızca gereken alanları döndürür. Böylece token gibi bir değerin istemciye gitme riski azalır.[^1]

`create-next-app` 16.4'ün ürettiği `next.config.ts` dosyasında `cacheComponents: true` hazır geldi. Bu modda `headers()` ya da `cookies()` okuyan bir bileşen `<Suspense>` içinde olmalıdır; aksi halde Next.js "runtime data during prerendering" hatası verir.[^8] Sayfanın geri kalanı statik kalır, kullanıcıya özel kısım akarak gelir:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/dal";

import { signOut } from "./actions";

export default function DashboardPage() {
  return (
    <main>
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();

  return (
    <>
      <h1>Hoş geldin, {user.email}</h1>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </>
  );
}
```

`next build` çıktısında `/dashboard` bu yüzden **Partial Prerender** *(◐)* olarak işaretlendi.

> [!WARNING]
>
> Oturum kontrolünü layout'un en üstüne koymayın. Layout'lar sayfalar arasında gezinirken yeniden render edilmez ve alt sayfaların render edilmesini engellemez.[^1]

## Çıkış

Çıkış bir Server Action'dır. Oturum sunucuda silinir, cookie temizlenir:[^5]

```ts
// app/dashboard/actions.ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/sign-in");
}
```

Testte çıkıştan sonra veritabanındaki oturum kaydı silindi, tarayıcıda cookie kalmadı ve `/dashboard`'a gitmek yeniden `/sign-in`'e yönlendirdi.

## Proxy ile yönlendirme

Next.js 16'da `middleware.ts` dosyasının adı `proxy.ts` oldu ve varsayılan olarak Node.js runtime'ında çalışıyor.[^9] Proxy her istekten önce çalıştığı için giriş yapmamış kullanıcıyı erkenden yönlendirmek için uygundur:

```ts
// proxy.ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

Bu kontrol **iyimserdir** *(optimistic)*: `getSessionCookie` yalnızca cookie'nin var olup olmadığına bakar, geçerli olup olmadığını kontrol etmez.[^5] Testte tarayıcıya elle `better-auth.session_token=forged` cookie'si eklendi. Proxy isteği geçirdi, ama `getCurrentUser` oturumu doğrulayamadığı için sayfa içerik göstermeden `/sign-in`'e yönlendirdi.

Proxy'nin tek savunma hattı olmaması gerektiğini gösteren gerçek bir örnek de var. Mart 2025'te açıklanan CVE-2025-29927, kendi sunucusunda çalışan Next.js uygulamalarında `x-middleware-subrequest` başlığıyla middleware'in tamamen atlanabildiğini gösterdi. Vercel'in olay raporu middleware'i rotaları korumanın tek yolu olarak kullanmamayı açıkça öneriyor.[^10] Next.js dokümantasyonu da Server Function'ların proxy matcher'ı dışında kalabileceğini, bu yüzden her Server Action'ın kendi yetki kontrolünü yapması gerektiğini yazar.[^9]

> [!DO]
>
> - Proxy'de yalnızca hızlı ve iyimser yönlendirme yapın.
> - Asıl kontrolü veriye yakın yapın: Data Access Layer, Server Action ve Route Handler içinde.

Rollere göre erişim ve Server Action koruması bir sonraki dersin konusu.

## Kendin dene

- Yukarıdaki dosyalarla bir proje kurun, `/dashboard`'a giriş yapmadan gidin ve yönlendirmeyi görün.
- DevTools > **Application** > **Cookies** sekmesinden oturum cookie'sinin değerini değiştirin ve sayfayı yenileyin; proxy'nin geçirdiğini ama sayfanın sizi dışarı attığını görün.
- `Welcome` bileşenini `<Suspense>` dışına taşıyıp `next dev` çıktısındaki hatayı okuyun.

## Detaylı öğrenmek için

- **Resmi doküman:** Next.js Authentication rehberi; oturum, Data Access Layer ve yetki kontrolü.[^1]
- **Yazı:** Sebastian Markbåge, "How to Think About Security in Next.js"; Server Component ve Server Action'larda güvenlik modeli.[^7]
- **Video:** [Lee Robinson](https://leerob.com/), "Next.js App Router Authentication (Sessions, Cookies, JWTs)"; oturum ve cookie'nin App Router'daki yeri.[^11]
- **Resmi doküman:** Better Auth Next.js entegrasyonu.[^5]

## Kaynaklar

1. [Next.js: How to implement authentication](https://nextjs.org/docs/app/guides/authentication) *(doc)* — Kütüphane önerisi, Data Access Layer, DTO, proxy ile iyimser kontrol ve layout uyarısı.
2. [Better Auth: Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth) *(article)* — 22 Eylül 2025; Auth.js'in bakımı ve yeni projeler için öneri.
3. [Vercel: Vercel acquires Better Auth](https://vercel.com/blog/vercel-acquires-better-auth) *(article)* — 7 Temmuz 2026; Better Auth'un MIT lisanslı açık kaynak olarak kalması.
4. [Better Auth: Installation](https://www.better-auth.com/docs/installation) *(doc)* — `BETTER_AUTH_SECRET`, veritabanı seçenekleri, `emailAndPassword`, `socialProviders` ve CLI ile migration.
5. [Better Auth: Next.js integration](https://www.better-auth.com/docs/integrations/next) *(doc)* — `toNextJsHandler`, `nextCookies`, `getSession` ve `getSessionCookie`'nin cookie'yi doğrulamadığı uyarısı.
6. [Better Auth: Basic Usage](https://www.better-auth.com/docs/basic-usage) *(doc)* — `signUp.email`, `signIn.email`, `signIn.social`, `useSession` ve `signOut`.
7. [Sebastian Markbåge: How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions) *(article)* — Data Access Layer, `server-only`, Server Action'ları açık uç nokta gibi ele alma.
8. [Next.js: Authentication with Cache Components](https://nextjs.org/docs/app/guides/authentication-with-cache-components) *(doc)* — Oturum okuyan bileşenin `<Suspense>` içinde olması ve oturumdan türeyen verinin cache'lenmesi.
9. [Next.js: proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) *(doc)* — `middleware`'den `proxy`'ye geçiş, Node.js runtime, `matcher` ve Server Function uyarısı.
10. [Vercel: Postmortem on Next.js Middleware bypass](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass) *(article)* — CVE-2025-29927, etkilenen kurulumlar, düzeltilen sürümler ve middleware'e tek başına güvenmeme önerisi.
11. [Lee Robinson](https://leerob.com/): [Next.js App Router Authentication (Sessions, Cookies, JWTs)](https://www.youtube.com/watch?v=DJvM2lSPn6w) *(video)* — App Router'da oturum, cookie ve JWT.
