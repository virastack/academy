---
title: "OAuth ve OIDC akışları"
description: "Authorization code ve PKCE, access ve ID token; \"Google ile giriş\" nasıl çalışır."
lastVerified: "2026-10-18"
translationKey: "auth-security/oauth-and-oidc"
---

"[!google] Google ile giriş yap" düğmesine bastığınızda arka planda iki standart birlikte çalışır: **OAuth 2.0** ve onun üzerine kurulan **OpenID Connect** *(OIDC)*. Bu derste ikisinin ne işe yaradığını, bugün hangi akışın kullanılması gerektiğini ve token'ların nerede durması gerektiğini göreceksiniz.

## OAuth Ne Çözer

OAuth'tan önce bir uygulama Gmail kişilerinize erişmek isterse sizden Gmail parolanızı isterdi. OAuth bu sorunu çözmek için çıktı: kullanıcı parolasını paylaşmadan, bir uygulamaya **sınırlı ve geri alınabilir** bir erişim izni verir.[^1]

Akışta dört rol vardır:[^2]

| Rol | Örnek |
| :-- | :-- |
| Resource owner | Kullanıcı |
| Client | Sizin uygulamanız |
| Authorization server | Google, GitHub ya da kendi kimlik sağlayıcınız *(Auth0, Keycloak...)* |
| Resource server | Erişilmek istenen API *(örneğin Google Calendar API)* |

> [!NOTE]
>
> OAuth bir **yetkilendirme** protokolüdür: "bu uygulama şu API'ye şu kapsamda erişebilir" der. Kullanıcının kim olduğunu söylemez. Kimlik doğrulama için OIDC gerekir.

## Authorization Code Akışı

Bugün tarayıcıdan başlayan her OAuth girişi için önerilen akış budur:[^2][^3]

1. Uygulama kullanıcıyı authorization server'ın giriş sayfasına yönlendirir.
2. Kullanıcı orada giriş yapar ve istenen izinleri *(scope)* onaylar.
3. Authorization server kullanıcıyı `redirect_uri` adresine kısa ömürlü bir **authorization code** ile geri gönderir.
4. Uygulama bu kodu authorization server'a gönderip karşılığında **access token** alır.
5. Uygulama access token ile API'ye istek atar.

İlk yönlendirme bir URL'dir:

```text
https://auth.example.com/authorize
  ?response_type=code
  &client_id=shop-web
  &redirect_uri=https://shop.example.com/callback
  &scope=openid profile email
  &state=af0ifjsldkj
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
```

Geri dönüş de bir URL'dir:

```text
https://shop.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

Kod tek başına işe yaramaz; token'a çevrilmesi gerekir. `state` değeri, dönen yanıtın sizin başlattığınız akışa ait olduğunu kontrol etmek içindir *(CSRF koruması)*.[^3]

## PKCE

**PKCE** *(Proof Key for Code Exchange, "piksi" diye okunur)*, authorization code'u ele geçiren birinin onu token'a çevirmesini engeller.[^4]

1. Uygulama rastgele bir `code_verifier` üretir ve saklar.
2. Bunun SHA-256 hash'ini `code_challenge` olarak ilk yönlendirmeye ekler.
3. Kodu token'a çevirirken orijinal `code_verifier`'ı gönderir. Authorization server hash'leri karşılaştırır.

Kodu yolda yakalayan saldırganın elinde `code_verifier` yoktur, bu yüzden kodu kullanamaz.[^5] Web Crypto API ile üretimi birkaç satırdır:

```ts
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createCodeVerifier() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(digest));
}
```

`createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")` çağrısı, RFC 7636'daki örnekle aynı sonucu verdi: `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`.[^5] Gerçek projede bunu kendiniz yazmazsınız; auth kütüphanesi yapar. Yine de bir kütüphanenin PKCE kullandığından emin olun.

## Artık Kullanılmayan Akışlar

OAuth 2.0 güvenlik önerilerini toplayan RFC 9700 *(Ocak 2025)* bazı eski akışları açıkça bırakır:[^3]

| Akış | Durum |
| :-- | :-- |
| Implicit *(`response_type=token`)* | Kullanmayın; token URL'de döner ve sızabilir |
| Resource Owner Password Credentials | Kullanılmamalı *(MUST NOT)*; uygulama yine kullanıcının parolasını görür |
| Authorization code + PKCE | Tarayıcı ve mobil uygulamalar dahil her istemci için önerilen akış |

RFC 9700 ayrıca `redirect_uri`'nin tam eşleşmeyle kontrol edilmesini ve access token'ın belirli bir API'ye *(audience)* bağlanmasını ister.[^3] Bu değişiklikleri tek belgede toplayan OAuth 2.1 hâlâ taslak aşamasında.[^6]

## OpenID Connect

OIDC, OAuth'un üzerine ince bir kimlik katmanı ekler. Akış aynıdır; farkı, `scope` içinde `openid` istenmesi ve yanıtta access token'ın yanında bir **ID token** gelmesidir.[^7][^8]

ID token bir JWT'dir *(JWT'yi [Oturum, cookie ve JWT](/academy/auth-security/sessions-cookies-and-jwt) dersinde gördük)*. İçinde kimin, ne zaman ve hangi uygulama için giriş yaptığı yazar:[^8]

```json
{
  "iss": "https://auth.example.com",
  "sub": "248289761001",
  "aud": "shop-web",
  "exp": 1792323192,
  "iat": 1792319592,
  "nonce": "n-0S6_WzA2Mj",
  "email": "ayse@example.com"
}
```

| Claim | Anlamı |
| :-- | :-- |
| `iss` | Token'ı üreten kimlik sağlayıcı |
| `sub` | Kullanıcının o sağlayıcıdaki kalıcı kimliği; e-posta değişse de değişmez |
| `aud` | Token'ın hangi uygulama *(`client_id`)* için üretildiği |
| `nonce` | İsteği ID token'a bağlar; tekrar oynatma saldırısını önler |

Kullanıcıyı veritabanınızda e-postayla değil, `iss` + `sub` ikilisiyle eşleştirin.[^8]

### Access Token ve ID Token

İki token sık karıştırılır. oauth.net'teki kural kısa: ID token API'ye gönderilmez, access token'ı da istemci okumaz.[^9]

| | Access token | ID token |
| :-- | :-- | :-- |
| Kimin için | API *(resource server)* | Uygulamanız *(client)* |
| Ne söyler | "Bu istek şu kapsamda yetkili" | "Bu kullanıcı şu anda giriş yaptı" |
| Formatı | Sağlayıcıya göre değişir; istemci için opak | Her zaman JWT |

## Token Nerede Durmalı

Ağustos 2026'da yayımlanan RFC 10017, tarayıcı uygulamaları için üç mimari tarif eder ve bunları güvenlik sırasına koyar.[^10] Belgenin yazarları arasında [Aaron Parecki](https://aaronparecki.com/) ve [Philippe De Ryck](https://pragmaticwebsecurity.com/about) de var.

| Mimari | Nasıl çalışır | Öneri |
| :-- | :-- | :-- |
| Backend for Frontend *(BFF)* | OAuth akışını sunucu yürütür; token'lar sunucuda kalır, tarayıcıda yalnızca `HttpOnly` oturum cookie'si olur | İş uygulamaları ve kişisel veri işleyen uygulamalar için güçlü şekilde önerilir |
| Token-mediating backend | Token'ı sunucu alır ama access token'ı tarayıcıya verir | Yalnızca BFF mümkün değilse |
| Tarayıcıda OAuth istemcisi | Tüm akış ve token'lar tarayıcıda | Belgede anlatılan saldırıların hepsine açık |

Gerekçe basit: sayfada çalışan kötü niyetli bir script, uygulamanın kendi kodu ile aynı yetkilere sahiptir. Token tarayıcıdaysa onu çalabilir ya da yenisini alabilir.[^10] [!nextjs] Next.js gibi sunucusu olan bir framework'te BFF zaten doğal yapıdır. Auth.js ya da Better Auth gibi kütüphaneler OAuth akışını sunucuda yürütür ve tarayıcıya yalnızca oturum cookie'si verir.

> [!TIP]
>
> Kural olarak: OAuth akışını sunucuda yürütün, tarayıcıya access token vermeyin, kullanıcıyı ilk derste gördüğünüz `HttpOnly` cookie ile tanıyın.

## Kendin Dene

- Giriş yaparken DevTools > **Network** sekmesini açık tutun ve "Google ile giriş" yapan bir sitede `authorize` isteğini bulun. `response_type`, `scope` ve `state` parametrelerine bakın; PKCE kullanan sitelerde `code_challenge` da görürsünüz.
- Yukarıdaki `createCodeChallenge` fonksiyonunu tarayıcı konsolunda çalıştırıp RFC 7636'daki örnek değeri elde edin.
- Kendi kimlik sağlayıcınızın `/.well-known/openid-configuration` adresini açın; `authorization_endpoint`, `token_endpoint` ve desteklenen `code_challenge_methods_supported` alanlarını bulun.

## Detaylı Öğrenmek İçin

- **Video:** [David Neal](https://reverentgeek.com/), "An Illustrated Guide to OAuth and OpenID Connect" *(16 dk)*; akışın çizimlerle anlatımı.[^2]
- **Konuşma:** [Aaron Parecki](https://aaronparecki.com/), "Why Do We Really Need OAuth?" *(OWASP NZ 2022)*; OAuth'un çözdüğü sorun ve bugünkü akışlar.[^1]
- **Resmi doküman:** RFC 10017, OAuth 2.0 for Browser-Based Applications; BFF ve tarayıcıdaki saldırı senaryoları.[^10]
- **Resmi doküman:** RFC 9700, OAuth 2.0 Security Best Current Practice.[^3]

## Kaynaklar

1. [Aaron Parecki](https://aaronparecki.com/): [Why Do We Really Need OAuth?](https://www.youtube.com/watch?v=wlUCF4Y9T6k) *(talk)* — OWASP NZ 2022; parola paylaşımı sorunu ve OAuth'un ortaya çıkışı.
2. [David Neal](https://reverentgeek.com/): [An Illustrated Guide to OAuth and OpenID Connect](https://developer.okta.com/blog/2019/10/21/illustrated-guide-to-oauth-and-oidc) *(article)* — Rollerin ve authorization code akışının adım adım anlatımı, `openid` scope'u ve ID token; [video sürümü](https://www.youtube.com/watch?v=t18YB3xDfXI).
3. [RFC 9700: Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700) *(doc)* — PKCE zorunluluğu, implicit ve password grant'in bırakılması, tam eşleşen `redirect_uri`, `state` ve audience kısıtlaması.
4. [oauth.net: PKCE](https://oauth.net/2/pkce/) *(doc)* — `code_verifier` ve `code_challenge`, PKCE'nin engellediği saldırılar.
5. [RFC 7636: Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636) *(doc)* — S256 dönüşümü, `code_verifier` uzunluğu ve authorization code yakalama saldırısı.
6. [IETF Datatracker: The OAuth 2.1 Authorization Framework](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) *(doc)* — Taslağın güncel sürümü ve durumu.
7. [OpenID Foundation: How OpenID Connect Works](https://openid.net/developers/how-connect-works/) *(doc)* — OIDC'nin OAuth 2.0 üzerindeki kimlik katmanı, ID token ve UserInfo.
8. [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) *(doc)* — ID token tanımı, zorunlu claim'ler, `nonce` ve `openid` scope'u.
9. [oauth.net: ID Tokens vs Access Tokens](https://oauth.net/id-tokens-vs-access-tokens/) *(article)* — ID token'ın API'ye gönderilmemesi, access token'ın istemci tarafından okunmaması.
10. [RFC 10017: OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc10017) *(doc)* — BFF, token-mediating backend ve tarayıcı istemcisi mimarileri; kötü niyetli JavaScript senaryoları.
