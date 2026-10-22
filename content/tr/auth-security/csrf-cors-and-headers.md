---
title: "CSRF, CORS ve güvenlik başlıkları"
description: "SameSite ile CSRF önlemi, CORS'un ne yaptığı ve temel HTTP güvenlik başlıkları."
lastVerified: "2026-10-22"
translationKey: "auth-security/csrf-cors-and-headers"
---

Tarayıcı bir siteye istek atarken o sitenin cookie'lerini kendiliğinden ekler. **CSRF** *(Cross-Site Request Forgery)* bunu kullanır: kullanıcı başka bir sitedeyken, o site arka planda sizin sitenize form gönderir. Cookie eklendiği için sunucu isteği kullanıcının kendisi atmış sanır.[^1]

```html
<!-- saldirgan.com -->
<form action="https://magaza.com/api/transfer" method="POST">
  <input name="to" value="attacker" />
</form>
<script>document.forms[0].submit()</script>
```

> [!NOTE]
>
> Bu dersteki kodlar `next@16.4.2` ile Chromium'da test edildi. Saldırgan sayfa `127.0.0.1:4000`'de, uygulama `localhost:3123`'te çalıştı; tarayıcı bu ikisini farklı site sayar.

## SameSite: İlk Savunma

[Oturum, cookie ve JWT](/academy/auth-security/sessions-cookies-and-jwt) dersinde oturum cookie'sine `SameSite=Lax` verdik. `Lax`, başka bir siteden gelen `POST` isteğine cookie eklenmesini engeller.[^1]

Testte saldırgan sayfa yukarıdaki formu gönderdi. İstek sunucuya ulaştı ama cookie yoktu; kullanıcı tanınmadı.

`SameSite` tek başına yetmez:[^1][^2]

- **Site, origin değildir.** `blog.magaza.com` ile `magaza.com` aynı site sayılır. Bir alt alan adında açık varsa `SameSite` korumaz.
- **`Lax`, `GET` ile gelen yönlendirmelere izin verir.** Durum değiştiren bir işi `GET` ile yapıyorsanız cookie gönderilir.
- **Eski tarayıcılar** `SameSite`'ı desteklemez.

> [!DONT]
>
> - Silme, satın alma ya da ayar değiştirme işlerini `GET` isteğiyle yapmayın. OWASP bunu açıkça yasaklar.[^2]

## Server Action'lar Kendini Korur

[!nextjs] Server Action'lar yalnızca `POST` ile çağrılır. Next.js ayrıca isteğin `Origin` başlığını sitenin `Host` başlığıyla karşılaştırır. Eşleşmezse işlemi durdurur.[^3]

Testte saldırgan sayfa, gerçek formdaki gizli action kimliğini kopyalayıp aynı isteği gönderdi. Sunucu `Invalid Server Actions request` hatasıyla isteği reddetti. Aynı form uygulamanın kendi sayfasından gönderilince çalıştı.

Uygulamanız bir ters vekil sunucu *(reverse proxy)* arkasındaysa ve adres çubuğundaki alan adı sunucuya farklı ulaşıyorsa, o alan adını `allowedOrigins` listesine eklersiniz.[^4]

> [!WARNING]
>
> `Origin` başlığı hiç gelmeyen istek reddedilmez, yalnızca uyarı yazılır.[^4] Modern tarayıcılar `POST`'ta bu başlığı gönderir; ama bu kontrolü tek savunmanız saymayın.

## Route Handler'ı Korumak

Route Handler'da bu kontrol **yoktur**. Testte saldırgan sayfanın formu `/api/transfer`'e ulaştı ve `200` döndü. Cookie `SameSite` yüzünden gelmediği için zarar olmadı, ama `SameSite=None` kullanan bir cookie ya da aynı sitedeki bir alt alan adı bu kapıyı açar.

OWASP, modern tarayıcılar için **Fetch Metadata** başlıklarını öneriyor. Tarayıcı her isteğe `Sec-Fetch-Site` ekler ve değerini sayfa kodu değiştiremez: `same-origin`, `same-site`, `cross-site` ya da `none`.[^2] Tüm büyük tarayıcılar bu başlığı Mart 2023'ten beri gönderiyor.[^2]

```ts
// lib/csrf.ts
export function isCrossSiteRequest(request: Request) {
  const site = request.headers.get("sec-fetch-site");

  if (site) {
    return site !== "same-origin";
  }

  // Eski tarayıcı: Origin başlığına bak
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}
```

```ts
// app/api/transfer/route.ts
import { isCrossSiteRequest } from "@/lib/csrf";

export async function POST(request: Request) {
  if (isCrossSiteRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ...
}
```

Testte aynı saldırı bu kontrolle `403` aldı. OWASP, `Sec-Fetch-Site` gelmeyen eski tarayıcılar için `Origin` kontrolüne düşmeyi zorunlu sayar.[^2]

## CORS Ne Yapar, Ne Yapmaz

Tarayıcı varsayılan olarak bir sayfanın başka bir origin'den gelen yanıtı **okumasına** izin vermez. Buna *same-origin policy* denir. **CORS** *(Cross-Origin Resource Sharing)*, sunucunun "bu origin yanıtımı okuyabilir" demesini sağlar.[^5][^6]

En sık yanılgı CORS'u bir güvenlik duvarı sanmaktır. CORS **isteğin gönderilmesini** engellemez, yalnızca yanıtın okunmasını engeller. [Jake Archibald](https://jakearchibald.com/), form gibi sıradan bir `POST`'un ön kontrol *(preflight)* olmadan gönderildiğini gösterir.[^6] Yukarıdaki CSRF saldırısı bu yüzden CORS ayarı ne olursa olsun çalışır.

Yalnızca özel başlık, JSON gövde ya da `PUT`, `DELETE` gibi metotlar kullanan istekler önce `OPTIONS` ile izin ister.[^5][^6]

Bir API'yi başka bir sitenin okumasına açmanız gerekirse izin listesi tutun:

```ts
// app/api/products/route.ts
const allowedOrigins = ["https://partner.example.com"];

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.includes(origin)) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: Request) {
  const products = await getProducts();
  return Response.json(products, { headers: corsHeaders(request.headers.get("origin")) });
}
```

Testte izinli origin'deki sayfa listeyi okudu. İzinsiz origin'deki sayfa `Failed to fetch` hatası aldı.

> [!DONT]
>
> - Gelen `Origin` değerini kontrol etmeden aynen geri yazmayın. Cookie ile birlikte kullanılırsa her site kullanıcının verisini okuyabilir.[^6][^7]
> - `Vary: Origin` başlığını unutmayın. Unutursanız CDN bir origin'e verilen yanıtı başka birine de verebilir.[^6]

## Güvenlik Başlıkları

Birkaç HTTP başlığı tarayıcının bilinen saldırılara karşı davranışını sıkılaştırır. OWASP'ın önerdikleri:[^7]

| Başlık | Değer | Ne işe yarar |
| :-- | :-- | :-- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Siteye yalnızca HTTPS ile bağlanılır |
| `X-Content-Type-Options` | `nosniff` | Tarayıcı dosya türünü tahmin etmez |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Başka sitelere tam URL gönderilmez |
| `X-Frame-Options` | `DENY` | Sayfa `iframe` içine alınamaz *(clickjacking)* |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Kullanılmayan tarayıcı özellikleri kapanır |

Next.js'te bu başlıklar `next.config.ts` içinde verilir:[^8]

```ts
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

`poweredByHeader: false`, `X-Powered-By: Next.js` başlığını kaldırır. OWASP bu başlığın silinmesini önerir.[^7] CSP'yi bir önceki derste [XSS ve CSP](/academy/auth-security/xss-and-csp) `proxy.ts` ile ekledik. Oradaki `frame-ancestors 'none'`, `X-Frame-Options`'ın modern karşılığıdır.[^7]

> [!WARNING]
>
> HSTS'yi önce kısa bir `max-age` ile deneyin. Sertifikada sorun çıkarsa kullanıcılar `max-age` süresi boyunca siteye giremez.[^7]

> [!TIP]
>
> OWASP, başlıkları kontrol etmek için [Mozilla Observatory](https://observatory.mozilla.org/)'yi önerir.[^7]

## Kendin Dene

- İki farklı adreste *(`localhost` ve `127.0.0.1`)* iki sunucu açın. Birinden diğerine form gönderin ve DevTools > **Network**'te `Sec-Fetch-Site` değerini okuyun.
- Oturum cookie'nizi `SameSite=None; Secure` yapıp aynı saldırıyı tekrarlayın. Route Handler'daki kontrolü silip sonucu karşılaştırın.
- `curl -I` ile kendi sitenizin başlıklarını listeleyin ve tablodakilerle karşılaştırın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** OWASP CSRF Prevention Cheat Sheet; Fetch Metadata, `Origin` kontrolü, token ve `SameSite`.[^2]
- **Makale:** Jake Archibald, "How to win at CORS"; CORS'un tarihçesi, cookie'li istekler, preflight ve etkileşimli bir CORS oyun alanı.[^6]
- **Resmi doküman:** OWASP HTTP Security Response Headers Cheat Sheet; her başlık için önerilen değer.[^7]

## Kaynaklar

1. [MDN: Cross-site request forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF) *(doc)* — Saldırının işleyişi, `SameSite` değerleri, `Lax`'ın zayıf yanları ve site ile origin farkı.
2. [OWASP: Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) *(doc)* — Fetch Metadata, `Sec-Fetch-Site` desteği, `Origin`'e düşme zorunluluğu, `GET` ile durum değiştirmeme ve `SameSite`'ın sınırları.
3. [Next.js: How to think about data security — Allowed origins](https://nextjs.org/docs/app/guides/data-security#allowed-origins-advanced) *(doc)* — Server Action'ların `POST` ile sınırlanması ve `Origin`-`Host` karşılaştırması.
4. [Next.js: serverActions](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) *(doc)* — `allowedOrigins`, ters vekil sunucu durumu ve `Origin`'siz isteğin uyarıyla geçmesi.
5. [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) *(doc)* — Same-origin policy, basit istekler, preflight ve cookie'li istekler.
6. [Jake Archibald](https://jakearchibald.com/): [How to win at CORS](https://jakearchibald.com/2021/cors/) *(article)* — 12 Ekim 2021. CORS'un yanıtın okunmasını koruması, form benzeri isteklerin preflight'sız gitmesi, cookie'li isteklerde `*` yasağı ve `Vary`.
7. [OWASP: HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) *(doc)* — HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options` ve `frame-ancestors`, `Permissions-Policy`, `X-Powered-By`, CORS önerisi ve Mozilla Observatory.
8. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — `next.config` içinde başlık tanımlama ve `source` eşleştirme.
