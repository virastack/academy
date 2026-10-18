---
title: "Oturum, cookie ve JWT"
description: "Sunucu oturumu ile JWT farkı, cookie bayrakları ve token'ın nerede saklanacağı."
lastVerified: "2026-10-18"
translationKey: "auth-security/sessions-cookies-and-jwt"
---

## Oturum Neden Gerekir

HTTP her isteği birbirinden bağımsız işler. Kullanıcı giriş yaptıktan sonra sunucunun bir sonraki istekte onu tanıması için tarayıcının her istekte "ben buyum" diyen bir değer göndermesi gerekir. Bu değeri üretip doğrulama işine **oturum yönetimi** *(session management)* denir.[^1]

Next.js dokümantasyonu işi üç parçaya ayırır:[^2]

| Kavram | Soru |
| :-- | :-- |
| Authentication | Kullanıcı söylediği kişi mi? |
| Session management | Giriş durumu istekler arasında nasıl korunur? |
| Authorization | Kullanıcı hangi sayfaya ve veriye erişebilir? |

Bu ders ortadaki parçayla ilgili. Oturumu tutmanın iki yaygın yolu var: **sunucu oturumu** ve **JWT**.

## Sunucu Oturumu

Kullanıcı giriş yapınca sunucu rastgele bir oturum kimliği *(session ID)* üretir, bunu veritabanına kaydeder ve tarayıcıya bir cookie ile gönderir. Tarayıcı sonraki her istekte bu cookie'yi geri yollar, sunucu da kimliği veritabanında arar.[^3]

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-session=k7Qp2v...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

Cookie'de kullanıcıya dair hiçbir bilgi yoktur; yalnızca tahmin edilemeyen bir anahtar vardır. OWASP bu kimliğin en az 64 bit entropiye sahip olmasını ve güvenli bir rastgele sayı üreteciyle üretilmesini ister.[^4] [Pilcrow](https://pilcrowonpaper.com/) ayrıca gizli değeri veritabanına hash'leyerek kaydetmeyi önerir.[^3]

En büyük avantajı kontrolün sunucuda olmasıdır: oturumu veritabanından silmek kullanıcıyı anında çıkarır. "Tüm cihazlardan çıkış yap" gibi özellikler bu yüzden kolaydır.[^5]

## JWT

**JSON Web Token**, nokta ile ayrılmış üç parçadan oluşan bir metindir: header, payload ve imza. İlk iki parça Base64URL ile kodlanmış JSON'dır.[^6]

```text
eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiY3VzdG9tZXIiLCJzdWIiOiJ1c2VyXzQyIiwiaWF0IjoxNzkyMzE5NTkyLCJleHAiOjE3OTIzMjA0OTJ9.taq0IJqNLhO36wrUVbxqry0i_t9l5cN5NhM7WXD4vTU
```

İlk noktaya kadar olan kısım header, ikinci noktaya kadar olan kısım payload, sonrası imzadır.

Payload'daki alanlara **claim** denir. Standart olanlar `sub` *(kim)*, `exp` *(ne zaman geçersiz olur)*, `iat` *(ne zaman üretildi)*, `iss` *(kim üretti)* ve `aud` *(kimin için)* gibi kısa adlardır.[^7]

Sunucu oturumunun tersine JWT bilgiyi **kendisi taşır**. Sunucu her istekte veritabanına gitmez, yalnızca imzayı kontrol eder. İmza, payload'ın değiştirilmediğini garanti eder.[^6]

> [!WARNING]
>
> İmzalı bir JWT şifreli değildir. Token'ı ele geçiren herkes payload'ı okuyabilir. Payload'a e-posta, telefon ya da parola gibi bilgileri koymayın; kullanıcı kimliği ve rol yeterlidir.[^6][^2]

Bunu [jose](https://github.com/panva/jose) kütüphanesiyle deneyebilirsiniz:

```ts
import { SignJWT, decodeJwt, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

const token = await new SignJWT({ role: "customer" })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject("user_42")
  .setIssuedAt()
  .setExpirationTime("15m")
  .sign(secret);

// Payload'ı okumak için anahtar gerekmez
console.log(decodeJwt(token));
// { role: "customer", sub: "user_42", iat: 1792319592, exp: 1792320492 }

// Doğrulamak için gerekir
const { payload: session } = await jwtVerify(token, secret, {
  algorithms: ["HS256"],
});
```

Payload'daki `role` değerini `admin` yapıp token'ı tekrar gönderirseniz `jwtVerify` `signature verification failed` hatası verir. Header'a `"alg": "none"` yazıp imzayı silmek de işe yaramaz, çünkü `algorithms` listesi yalnızca `HS256`'yı kabul eder. JWT için güvenlik önerilerini toplayan RFC 8725 tam olarak bunu ister: kütüphane hangi algoritmaların kabul edileceğini sizden almalı ve doğrulamalardan biri bile başarısız olursa token'ın tamamını reddetmelidir.[^8]

## Hangisini Seçmeli

| | Sunucu oturumu | JWT |
| :-- | :-- | :-- |
| Bilgi nerede | Veritabanında | Token'ın içinde |
| Her istekte | Veritabanı sorgusu | Yalnızca imza kontrolü |
| Erken iptal | Kaydı silmek yeter | Süresi dolana kadar geçerli; iptal için ayrı bir engel listesi gerekir |
| Boyut | Kısa bir kimlik | Claim'lerle büyür; cookie sınırı yaklaşık 4 KB[^5] |
| Uygun olduğu yer | Kendi sunucusu olan web uygulaması | Servisler arası kısa ömürlü yetki, OAuth access token |

Auth.js dokümantasyonu farkı açıkça yazar: süresi dolmadan bir JWT'yi geçersiz kılmak mümkün değildir; veritabanı oturumu ise istenen anda değiştirilip silinebilir.[^5] Auth.js veritabanı tanımlanmadığında JWT'yi varsayılan seçer ama token'ı imzalamakla kalmaz, sunucuya özel bir anahtarla **şifreler** ve `HttpOnly` bir cookie'ye koyar.[^5]

[Randall Degges](https://www.rdegges.com/)'in "JWTs Suck" sunumu da aynı sonuca varır: tarayıcıdaki bir web uygulaması için klasik oturum cookie'si çoğu zaman daha basit ve daha güvenlidir. JWT kullanacaksanız ömrünü kısa tutun.[^9]

> [!TIP]
>
> Kendi sunucunuz olan bir React ya da Next.js uygulamasında varsayılan seçim: oturum kimliği ya da şifreli oturum verisi, `HttpOnly` bir cookie içinde. JWT'yi elle yönetmeye ancak gerçekten ihtiyaç olduğunda geçin.

## Cookie Bayrakları

Hangi yolu seçerseniz seçin, değer büyük ihtimalle bir cookie içinde gider. Cookie'nin güvenliğini `Set-Cookie` başlığındaki bayraklar belirler:[^1]

| Bayrak | Ne yapar |
| :-- | :-- |
| `HttpOnly` | JavaScript cookie'yi okuyamaz; `document.cookie` içinde görünmez |
| `Secure` | Cookie yalnızca HTTPS isteklerinde gönderilir |
| `SameSite=Lax` | Başka bir sitedeki form ya da görsel isteğinde gönderilmez; linke tıklayarak gelince gönderilir |
| `SameSite=Strict` | Başka bir siteden gelen hiçbir istekte gönderilmez |
| `Max-Age` | Cookie'nin kaç saniye yaşayacağı; `Expires`'tan önceliklidir |
| `Path=/` | Sitenin tüm yollarında geçerli |
| `__Host-` öneki | Tarayıcı cookie'yi ancak `Secure`, `Path=/` ve `Domain` yoksa kabul eder; cookie alt alan adlarına sızmaz |

OWASP oturum cookie'si için `Secure` ve `HttpOnly`'yi zorunlu sayar; `SameSite` için `Strict` ya da `Lax` ister ve `__Host-` önekini önerir.[^4] [Pilcrow](https://pilcrowonpaper.com/) ise `Lax`'ı tercih eder, çünkü `Strict` başka bir siteden linke tıklayarak gelen kullanıcıyı çıkış yapmış gibi gösterir.[^10]

Aşağıdaki iki cookie'yi gönderen bir sayfa Chromium'da açıldığında `document.cookie` yalnızca `theme=dark` döndürdü; `session_id` DevTools'ta görünür ama JavaScript'ten okunamaz:

```http
Set-Cookie: session_id=abc123; HttpOnly; SameSite=Lax; Path=/
Set-Cookie: theme=dark; SameSite=Lax; Path=/
```

[!nextjs] Next.js'te cookie'yi sunucuda, `cookies()` API'siyle aynı bayraklarla yazarsınız:[^2]

```ts
import { cookies } from "next/headers";

const cookieStore = await cookies();
cookieStore.set("session", session, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  expires: expiresAt,
});
```

## Token'ı Nerede Saklamalı

En çok tartışılan soru bu. OWASP'ın yanıtı net: oturum kimliğini ya da token'ı `localStorage` veya `sessionStorage`'a koymayın, çünkü sayfada çalışan her JavaScript bunlara erişebilir.[^4][^11]

| Yer | XSS ile çalınabilir mi | Not |
| :-- | :-- | :-- |
| `localStorage` | Evet | Tarayıcı kapansa da silinmez; tek bir XSS açığı token'ı dışarı yollar |
| `HttpOnly` cookie | Hayır | Tarayıcı otomatik gönderir; CSRF'e karşı `SameSite` ve ek önlem gerekir |

`HttpOnly` sihirli bir kalkan değildir. [Pilcrow](https://pilcrowonpaper.com/)'un hatırlattığı gibi, XSS açığı olan bir sayfada saldırgan cookie'yi okuyamasa da kullanıcı adına istek atabilir. `HttpOnly`'nin sağladığı şey, token'ın **kopyalanıp başka yerden kullanılmasını** engellemektir.[^10] XSS'e karşı asıl önlemler XSS ve CSP dersinde.

Tarayıcıda çalışan ve başka bir API'ye token gönderen uygulamalar için güncel öneri **Backend for Frontend** *(BFF)* desenidir: token'lar sunucuda kalır, tarayıcı yalnızca `HttpOnly` bir oturum cookie'si taşır.[^4] [Philippe De Ryck](https://pragmaticwebsecurity.com/about)'in LocoMocoSec konuşması cookie ile token seçiminin bu ödünleşimlerini anlatır.[^12]

## Oturumun Yaşam Döngüsü

| An | Ne yapılır |
| :-- | :-- |
| Giriş | Yeni bir oturum kimliği üretin; girişten önceki kimliği kullanmaya devam etmeyin *(session fixation)*[^4] |
| Kullanım | Belirli bir süre işlem yoksa oturumu bitirin *(idle timeout)*; ayrıca toplam bir üst sınır koyun *(absolute timeout)*[^4] |
| Çıkış | Oturumu **sunucuda** silin; yalnızca cookie'yi silmek çalınmış bir kopyayı geçersiz kılmaz[^4] |

OWASP düşük riskli uygulamalar için 15–30 dakikalık işlemsizlik süresini makul bulur.[^4] Uzun süre açık kalan uygulamalarda oturum kullanıldıkça uzatılır; parola değiştirmek gibi hassas işlemler için kullanıcıdan kimliğini yeniden doğrulaması istenir.[^13]

## Kendin Dene

- Giriş yaptığınız bir sitede DevTools > **Application** > **Cookies** sekmesini açın. Oturum cookie'sinin `HttpOnly`, `Secure` ve `SameSite` sütunlarına bakın.
- Aynı sayfanın konsolunda `document.cookie` yazın; `HttpOnly` cookie'nin listede olmadığını görün.
- [jwt.io](https://www.jwt.io/)'daki örnek token'ın payload'ını değiştirin ve imzanın geçersiz olduğunu görün.

## Detaylı Öğrenmek İçin

- **Rehber:** [Pilcrow](https://pilcrowonpaper.com/)'un auth kitabı; oturum, cookie ve tarayıcı depolaması için kısa ve net sayfalar.[^3][^10]
- **Resmi doküman:** OWASP Session Management Cheat Sheet; kimlik uzunluğu, cookie bayrakları ve süre önerileri.[^4]
- **Konuşma:** [Philippe De Ryck](https://pragmaticwebsecurity.com/about), "The truth about cookies, tokens and APIs" *(LocoMocoSec 2019, 38 dk)*.[^12]
- **Sunum:** [Randall Degges](https://www.rdegges.com/), "JWTs Suck"; JWT ile oturum cookie'sinin madde madde karşılaştırması.[^9]
- **Resmi doküman:** Next.js Authentication rehberi; stateless ve database oturumları, cookie ayarları.[^2]

## Kaynaklar

1. [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) *(doc)* — Oturum yönetimi için cookie, `Max-Age`, `Secure`, `HttpOnly`, `SameSite` ve `__Host-` öneki.
2. [Next.js: How to implement authentication](https://nextjs.org/docs/app/guides/authentication) *(doc)* — Authentication, session management ve authorization ayrımı; stateless ve database oturumları, `cookies()` ile önerilen ayarlar.
3. [Pilcrow](https://pilcrowonpaper.com/): [Sessions](https://auth.pilcrowonpaper.com/sessions) *(article)* — Sunucu tarafı oturum kaydı, rastgele ve hash'lenmiş gizli değer, süre ve yeniden doğrulama.
4. [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) *(doc)* — 64 bit entropi, zorunlu cookie bayrakları, `__Host-`, girişten sonra kimlik yenileme, zaman aşımları, sunucuda çıkış ve web storage uyarısı.
5. [Auth.js: Session strategies](https://authjs.dev/concepts/session-strategies) *(doc)* — JWT ve veritabanı oturumlarının karşılaştırması, şifreli JWT cookie'si ve erken iptal sorunu.
6. [JWT.io: Introduction to JSON Web Tokens](https://www.jwt.io/introduction) *(doc)* — Header, payload ve imza yapısı; imzalı token'ın şifreli olmaması.
7. [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) *(doc)* — JWT tanımı ve `iss`, `sub`, `aud`, `exp`, `iat` gibi kayıtlı claim'ler.
8. [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) *(doc)* — Algoritma listesi verme, `none` algoritması, tüm doğrulamaların geçmesi ve `iss`/`aud` kontrolü.
9. [Randall Degges](https://www.rdegges.com/): [JWTs Suck](https://speakerdeck.com/rdegges/jwts-suck) *(talk)* — JWT ile oturum cookie'sinin kolaylık, güvenlik, iptal ve ölçeklenme açısından karşılaştırması.
10. [Pilcrow](https://pilcrowonpaper.com/): [Browser client-side storage](https://auth.pilcrowonpaper.com/browser-client-side-storage) *(article)* — Cookie ve Web Storage, `HttpOnly`'nin neyi engelleyip neyi engellemediği.
11. [OWASP: HTML5 Security Cheat Sheet — Local Storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage) *(doc)* — Oturum kimliğini local storage'da tutmama önerisi.
12. [Philippe De Ryck](https://pragmaticwebsecurity.com/about): [The truth about cookies, tokens and APIs](https://www.youtube.com/watch?v=-zD11ubPsFM) *(video)* — LocoMocoSec 2019; cookie ve token tabanlı oturumun CSRF ve XSS açısından ödünleşimleri.
13. [Pilcrow](https://pilcrowonpaper.com/): [Auth sessions](https://auth.pilcrowonpaper.com/auth-sessions) *(article)* — Oturum süresi, kullanıldıkça uzatma ve hassas işlemler için ayrı doğrulama.
