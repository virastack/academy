---
title: "XSS ve CSP"
description: "dangerouslySetInnerHTML, güvenli olmayan URL'ler ve Content Security Policy."
lastVerified: "2026-10-22"
translationKey: "auth-security/xss-and-csp"
---

**XSS** *(Cross-Site Scripting)*, saldırganın sizin sayfanızda kendi JavaScript kodunu çalıştırmasıdır. Kod sizin alan adınızda çalıştığı için kullanıcının oturumuyla istek atabilir, sayfadaki veriyi okuyabilir, formu değiştirebilir.[^1]

Kötü içerik iki yoldan gelir. URL'deki bir parametre sayfaya basılırsa saldırgan linki kurbana gönderir. Bir yorum veritabanına kaydedilip herkese gösterilirse buna **stored** *(kalıcı)* XSS denir; sayfayı açan herkes etkilenir.[^1]

> [!NOTE]
>
> Bu dersteki kodlar `next@16.4.2`, `react@19.3.1` ve `isomorphic-dompurify@4.6.0` ile Chromium'da test edildi.

## React Sizi Çoğu Zaman Korur

JSX içine yazılan her değer metin olarak kodlanır *(output encoding)*. `<` işareti `&lt;` olur ve tarayıcı onu etiket olarak değil, yazı olarak gösterir.[^1]

```tsx
<p>{bio}</p>
```

Testte `bio` değeri `<img src=x onerror="...">` olarak verildi. Sayfada bu metin aynen yazı olarak göründü, kod çalışmadı.

OWASP da modern framework'lerin XSS hatalarını azalttığını yazar. Ama açıkları da sayar: `dangerouslySetInnerHTML`, kontrol edilmeyen URL'ler ve DOM'a doğrudan dokunan kaçış yolları.[^2]

## dangerouslySetInnerHTML

Bu prop, React'in kodlamasını kapatır ve metni HTML olarak basar. React dokümantasyonu güvenilmeyen içerikle kullanıldığında XSS açmanın "çok kolay" olduğunu yazar.[^3]

```tsx
// ❌ kullanıcıdan gelen HTML doğrudan basılıyor
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

HTML basmanız gerekiyorsa *(Markdown çıktısı, zengin metin editörü)* önce **sanitize** edin. Sanitize, HTML'den tehlikeli parçaları ayıklayıp güvenli kısmı bırakır. OWASP bu iş için DOMPurify'ı önerir.[^2] [!react] React içeriği kendisi temizlemez; bu iş geliştiricidedir.[^4]

DOMPurify çalışmak için bir DOM ister. Sunucuda DOM olmadığı için Server Component ya da SSR sırasında doğrudan `dompurify` çağırmak hata verir.[^5] Testte `"use client"` bileşeninde bile SSR aşamasında `sanitize is not a function` hatası alındı. Sunucuda da çalışan sarmalayıcı `isomorphic-dompurify`, arkada jsdom kullanır:[^6]

```command
npm install isomorphic-dompurify
```

```tsx
// components/post-body.tsx
import DOMPurify from "isomorphic-dompurify";

export function PostBody({ html }: { html: string }) {
  const markup = { __html: DOMPurify.sanitize(html) };

  return <div dangerouslySetInnerHTML={markup} />;
}
```

Testte `<b>Merhaba</b><img src=x onerror="...">` girdisi `<b>Merhaba</b><img src="x">` olarak basıldı. Kalın yazı kaldı, `onerror` silindi.

> [!TIP]
>
> React dokümantasyonu `{ __html }` nesnesini HTML'in üretildiği yere en yakın yerde oluşturmanızı önerir. Böylece hangi değişkenin HTML taşıdığı kodda açıkça görünür.[^3]

> [!WARNING]
>
> DOMPurify'ı ve sunucudaki jsdom'u güncel tutun. Tarayıcılar değiştikçe yeni atlatma yolları bulunur.[^2][^5]

## Güvenli Olmayan URL'ler

Kullanıcının girdiği bir web sitesi adresini link yapmak masum görünür. Ama adres `javascript:` ile başlarsa tıklanınca kod çalışır.

React 19, `href` ve `src` içindeki `javascript:` adreslerini engeller.[^2] Testte `<a href="javascript:...">` yazıldı, React adresi tıklanınca yalnızca hata fırlatan zararsız bir değerle değiştirdi. OWASP bunun uygulamaya özgü URL kontrolünün yerini tutmadığını ekler.[^2] `data:` gibi diğer şemalar ve açık yönlendirme sorunu hâlâ sizdedir. Bu yüzden izin verdiğiniz şemaları açıkça kontrol edin:

```tsx
function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function WebsiteLink({ href }: { href: string }) {
  if (!isSafeUrl(href)) {
    return null;
  }

  return (
    <a href={href} rel="noopener noreferrer">
      Web sitesi
    </a>
  );
}
```

> [!DONT]
>
> - `innerHTML`, `outerHTML` ya da `document.write` ile kullanıcı verisi basmayın. Bunlar DOM'daki en tehlikeli noktalardır.[^1]
> - `eval`, `new Function` ya da string alan `setTimeout` kullanmayın.

## Content Security Policy

Bütün önlemlere rağmen bir açık kalabilir. **CSP** *(Content Security Policy)*, tarayıcıya hangi script'leri çalıştırabileceğini söyleyen bir HTTP başlığıdır. MDN onu ikinci savunma hattı olarak tanımlar: ilk savunma kodlama ve sanitize'dır, CSP onlar kaçırdığında devreye girer.[^1]

### İzin listesi değil, nonce

Eski yöntemde güvenilen alan adları listelenir. Google'ın 2016'da 26.011 farklı politikayı inceleyen araştırması, bunların **%94,72'sinin atlatılabildiğini** gösterdi. Sebep, izin verilen popüler alan adlarında saldırganın kullanabileceği script'lerin bulunmasıydı.[^7]

Önerilen yöntem **strict CSP**'dir. Sunucu her istekte rastgele bir **nonce** üretir. Yalnızca bu değeri taşıyan script'ler çalışır. `'strict-dynamic'` ise güvenilen bir script'in yüklediği script'lere de izin verir.[^8] Saldırganın eklediği `<script>` etiketi nonce'u bilmediği için çalışmaz. Satır içi event handler'lar *(`onerror`, `onclick`)* ve `javascript:` adresleri de tamamen engellenir.[^1]

### Next.js'te CSP

[!nextjs] Next.js nonce'u `proxy.ts` içinde üretmenizi önerir:[^9]

```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}
```

Next.js başlıktaki nonce'u okur ve kendi script'lerine otomatik ekler. Testte sayfadaki 9 script'in hepsi nonce taşıdı.[^9] Aynı sayfada `dangerouslySetInnerHTML` ile temizlenmeden basılan `<img onerror>` çalışmadı; konsolda "Refused to execute inline event handler" hatası çıktı.

Bilmeniz gereken üç şey:[^9]

- Nonce her istekte değişir. Bu yüzden CSP'li sayfalar **statik üretilemez**, dinamik render edilir. Gerekirse sayfada `await connection()` çağırın.
- Geliştirme ortamında React hata ayıklama için `eval` kullanır; `'unsafe-eval'` yalnızca orada eklenir.
- `frame-ancestors 'none'` sayfanızın başka bir sitede `iframe` içine alınmasını engeller. Bir sonraki derste güvenlik başlıklarıyla birlikte ele alınıyor.

### Önce raporla, sonra uygula

CSP'yi canlıya doğrudan koymak bir analitik script'ini ya da üçüncü parti widget'ı kırabilir. Önce `Content-Security-Policy-Report-Only` başlığıyla yayınlayın. Tarayıcı hiçbir şeyi engellemez, yalnızca neyi engelleyeceğini raporlar. Sorun kalmayınca asıl başlığa geçin.[^8]

> [!TIP]
>
> Chromium tabanlı tarayıcılarda `require-trusted-types-for 'script'` direktifi, `innerHTML` gibi noktalara düz metin atanmasını tamamen engeller. OWASP bunu DOM XSS'i sınıf olarak ortadan kaldıran az sayıdaki önlemden biri sayar.[^2] [Philippe De Ryck](https://pragmaticwebsecurity.com/about) React'te DOMPurify ile birlikte nasıl kullanılacağını anlatır.[^4]

## Kendin Dene

- Bir sayfada `searchParams`'tan gelen değeri hem `{value}` ile hem `dangerouslySetInnerHTML` ile basın. `?q=<img src=x onerror=alert(1)>` adresini açıp farkı görün.
- `proxy.ts`'i ekleyip aynı adresi tekrar açın. DevTools > **Console**'da CSP hatasını bulun.
- Sayfanızın kaynağında `<script` etiketlerini arayın ve hepsinin `nonce` taşıdığını kontrol edin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** OWASP XSS Prevention Cheat Sheet; framework açıkları, sanitize ve CSP'nin yeri.[^2]
- **Makale:** Lukas Weichselbaum, "Mitigate cross-site scripting with a strict CSP"; nonce ve hash ile politika kurmak, adım adım geçiş.[^8]
- **Makale:** Philippe De Ryck, "Securing SPAs with Trusted Types"; React'te DOM XSS ve Trusted Types.[^4]
- **Araştırma:** "CSP Is Dead, Long Live CSP!"; izin listesi CSP'lerin neden işe yaramadığı.[^7]

## Kaynaklar

1. [MDN: Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS) *(doc)* — XSS türleri, output encoding, tehlikeli DOM API'leri, CSP'nin ikinci savunma olması ve strict CSP'nin engelledikleri.
2. [OWASP: Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) *(doc)* — Framework açıkları, React 19'un `javascript:` engeli ve sınırı, DOMPurify önerisi ve güncel tutma, Trusted Types.
3. [React: Dangerously setting the inner HTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) *(doc)* — Prop'un riski ve `{ __html }` nesnesini HTML'in üretildiği yerde oluşturma önerisi.
4. [Philippe De Ryck](https://pragmaticwebsecurity.com/about): [Securing SPAs with Trusted Types](https://auth0.com/blog/securing-spa-with-trusted-types/) *(article)* — 15 Haziran 2021. React'in içeriği temizlememesi, DOMPurify ve Trusted Types politikaları.
5. [DOMPurify](https://github.com/cure53/DOMPurify) *(repo)* — Kullanım, sunucuda DOM gereksinimi ve jsdom'u güncel tutma uyarısı.
6. [isomorphic-dompurify](https://github.com/kkomelin/isomorphic-dompurify) *(repo)* — DOMPurify'ı sunucuda ve istemcide aynı şekilde kullanma; Next.js örneği.
7. [Weichselbaum, Spagnuolo, Lekies, Janc: CSP Is Dead, Long Live CSP!](https://research.google.com/pubs/pub45542.html) *(research)* — ACM CCS 2016. 26.011 politikanın %94,72'sinin atlatılabilmesi ve nonce tabanlı yaklaşım.
8. [Lukas Weichselbaum](https://research.google/people/lukasweichselbaum/): [Mitigate cross-site scripting (XSS) with a strict CSP](https://web.dev/articles/strict-csp) *(article)* — Son güncelleme 13 Eylül 2024. Nonce, `'strict-dynamic'`, `object-src` ve `base-uri`, Report-Only ile geçiş.
9. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — `proxy.ts` ile nonce, otomatik nonce ekleme, dinamik render zorunluluğu ve geliştirmede `'unsafe-eval'`.
