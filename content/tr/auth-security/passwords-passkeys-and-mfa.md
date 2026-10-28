---
title: "Parola, passkey ve 2FA"
description: "Giriş formu, parolanın sunucuda saklanması, passkey ve iki adımlı doğrulama."
lastVerified: "2026-10-18"
translationKey: "auth-security/passwords-passkeys-and-mfa"
---

Kullanıcı kimliğini kanıtlamak için üç tür şey kullanabilir: **bildiği** bir şey *(parola)*, **sahip olduğu** bir şey *(telefon, güvenlik anahtarı)* ya da **kendisi olan** bir şey *(parmak izi, yüz)*.[^1] Bu derste parolayla başlayıp iki adımlı doğrulamaya ve parolanın yerini almaya başlayan passkey'lere geçeceğiz.

> [!NOTE]
>
> Bu dersteki kodlar Node 22 üzerinde `@node-rs/argon2@2.2.2` ve `@simplewebauthn/browser` / `@simplewebauthn/server` 14 sürümleriyle, Chromium'un sanal authenticator'ü kullanılarak denendi.

## Giriş formu

Tarayıcı ve parola yöneticisi formunuzu ancak doğru işaretlerseniz tanır. `autocomplete` değerleri bu yüzden önemlidir:[^2][^3]

```html
<form action="/login" method="post">
  <label for="email">E-posta</label>
  <input id="email" name="email" type="email" autocomplete="username" required />

  <label for="password">Parola</label>
  <input
    id="password"
    name="password"
    type="password"
    autocomplete="current-password"
    required
  />

  <button type="submit">Sign in</button>
</form>
```

| Değer | Nerede |
| :-- | :-- |
| `username` | E-posta ya da kullanıcı adı alanı |
| `current-password` | Giriş formundaki parola |
| `new-password` | Kayıt ve parola değiştirme formu; tarayıcı güçlü parola önerebilir |
| `one-time-code` | SMS, e-posta ya da uygulamadan gelen tek kullanımlık kod |

[Sam Dutton](https://samdutton.com/)'ın giriş formu rehberindeki diğer öneriler: girişi ayrı bir `<form>` içinde tutun, parolayı göster/gizle düğmesi ekleyin ve e-postayı ya da parolayı iki kez yazdırmayın.[^2]

> [!DONT]
>
> - Parola alanında yapıştırmayı engellemeyin.
> - Parola yöneticisinin doldurmasını bozan rastgele `id` ya da `name` değerleri kullanmayın.

NIST ve OWASP ikisi de parola yöneticilerine ve yapıştırmaya izin verilmesini ister.[^4][^5]

## Parola kuralları

ABD'nin dijital kimlik standardı NIST SP 800-63B-4, Temmuz 2025'te son halini aldı. "Bir büyük harf, bir sembol" gibi alışık olduğumuz kuralların çoğunu kaldırıyor:[^4]

| Kural | NIST'in söylediği |
| :-- | :-- |
| En kısa uzunluk | Parola tek başına kullanılıyorsa 15 karakter; 2FA ile birlikteyse 8 |
| En uzun uzunluk | En az 64 karaktere izin verin |
| Karakter zorunluluğu | Büyük harf, rakam, sembol gibi kurallar koymayın |
| Periyodik değişiklik | Zorlamayın; yalnızca parola sızdıysa değiştirtin |
| Kara liste | Yeni parolayı sık kullanılan ve sızmış parolalarla karşılaştırın |

OWASP'ın Authentication Cheat Sheet'i de aynı eşikleri kullanır.[^5] [Pilcrow](https://pilcrowonpaper.com/) daha esnek: en az 8–10 karakter, karmaşıklık kuralı yok, sızmış parola kontrolü var.[^6]

### Sızmış parola kontrolü

[Troy Hunt](https://www.troyhunt.com/)'ın Have I Been Pwned servisi, sızıntılarda görülmüş parolaları anahtar gerektirmeyen bir API ile sunar. Parolayı göndermezsiniz: SHA-1 hash'inin yalnızca ilk 5 karakterini gönderir, dönen listede geri kalanını ararsınız *(k-anonymity)*.[^7]

```ts
import { createHash } from "node:crypto";

export async function isPwnedPassword(password: string) {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { "Add-Padding": "true" },
  });
  const body = await response.text();

  return body
    .split(/\r?\n/)
    .some((line) => line.startsWith(suffix) && !line.endsWith(":0"));
}
```

`Add-Padding` yanıta sayısı `0` olan sahte satırlar ekler; ağı izleyen biri yanıt boyutundan hash'i tahmin edemez. Bu satırları atlamanız gerekir.[^7]

## Parolayı sunucuda saklamak

Parola veritabanına **asla** düz metin ya da geri çözülebilir şekilde *(encryption)* yazılmaz. Tek yönlü ve kasıtlı olarak yavaş bir **hash** fonksiyonundan geçirilir. Her parolaya rastgele bir **salt** eklenir; böylece aynı parolalar farklı hash üretir ve hazır tablolarla *(rainbow table)* kırılamaz.[^8]

| Algoritma | OWASP önerisi |
| :-- | :-- |
| Argon2id | İlk tercih; en az 19 MiB bellek, 2 iterasyon, 1 paralellik |
| scrypt | Argon2id yoksa |
| bcrypt | Yalnızca eski sistemlerde; parolanın ilk 72 byte'ını kullanır |

```ts
import { hash, verify } from "@node-rs/argon2";

const passwordHash = await hash(password);
// $argon2id$v=19$m=19456,t=2,p=1$s7yr5VbPNOMtc2PzyrKZOA$Mo9MjWu2...

const isValid = await verify(passwordHash, attempt);
```

`@node-rs/argon2`'nin varsayılanları OWASP'ın önerdiği değerlerle aynı çıktı *(`m=19456` KiB = 19 MiB, `t=2`, `p=1`)*. Salt kütüphane tarafından üretilir ve hash metninin içine yazılır.

> [!TIP]
>
> Parola işlemlerini kendiniz yazmak zorunda değilsiniz. Bir auth kütüphanesi bunları hazır getirir; seçenekler Next.js'te auth dersinde.

### Kaba kuvvet ve hata mesajları

Parola kontrol eden her uç noktaya **rate limit** koyun. OWASP başarısız deneme sayacını IP adresine değil hesaba bağlamayı önerir. Hesabı tamamen kilitlemek ise saldırganın kullanıcıyı dışarıda bırakmasına yol açabilir.[^5] [Pilcrow](https://pilcrowonpaper.com/) başlangıç noktası olarak kullanıcı başına dakikada bir denemeyi önerir.[^6]

OWASP, giriş hatasında hesabın var olup olmadığını belli etmeyen tek bir mesaj ister: "Email or password is incorrect." Aksi halde saldırgan hangi e-postaların kayıtlı olduğunu öğrenir *(user enumeration)*.[^5]

## İki adımlı doğrulama

Parola sızsa bile saldırganın girememesi için ikinci bir faktör istenir *(2FA ya da MFA)*. Seçenekler eşit derecede güvenli değildir:[^1]

| Yöntem | Not |
| :-- | :-- |
| SMS kodu | Kolay ama zayıf; SIM swap ve oltalamaya açık. NIST bunu "kısıtlı" sayar |
| Authenticator uygulaması *(TOTP)* | 30 saniyede bir değişen kod; ucuz ve yaygın, ama kod hâlâ sahte siteye girilebilir |
| Passkey ya da güvenlik anahtarı | Oltalamaya dayanıklı; anahtar cihazdan çıkmaz |

2FA kurulurken kullanıcıya tek kullanımlık **kurtarma kodları** verin. OWASP, 2FA'yı atlatmaya ya da sıfırlamaya yarayan akışların da saldırganın hedefi olduğunu hatırlatır.[^1]

## Passkey

Passkey, parolanın yerini alan ve cihazda saklanan bir anahtardır. Kullanıcı parmak izi, yüz ya da cihaz PIN'iyle kilidini açar.[^9] Arkasında tarayıcıların **Web Authentication API** *(WebAuthn)* standardı vardır:[^10]

1. Kayıt sırasında cihaz bir anahtar çifti üretir. **Özel anahtar** cihazda kalır, **açık anahtar** sunucuya kaydedilir.
2. Girişte sunucu rastgele bir **challenge** gönderir. Cihaz bunu özel anahtarla imzalar.
3. Sunucu imzayı açık anahtarla doğrular.

Sunucu yalnızca açık anahtarı tuttuğu için veritabanı sızsa bile bununla giriş yapılamaz. İmza sitenin alan adına bağlıdır; sahte bir giriş sayfası geçerli bir imza alamaz.[^10] Testte, `localhost` için kaydedilen passkey'i `127.0.0.1` adresinden kullanmaya çalışınca tarayıcı daha imza aşamasına gelmeden `SecurityError` verdi.

Passkey'ler Apple, Google ya da parola yöneticisi hesabı üzerinden cihazlar arasında senkronize edilir; senkronize eden servis özel anahtarı göremez.[^9]

### Formda passkey

Kullanıcının alışkanlığını bozmamak için passkey'i mevcut giriş formuna eklemek en kolay yoldur. Kullanıcı adı alanına `webauthn` değeri eklenince tarayıcı, otomatik doldurma listesinde kayıtlı passkey'leri de gösterir *(conditional UI)*:[^11][^3]

```html
<input id="email" name="email" autocomplete="username webauthn" />
```

WebAuthn'ın ham API'si binary veriyle uğraştırır. [!react] tarafında SimpleWebAuthn gibi bir kütüphane bu işi kısaltır:[^12]

```ts
import { startAuthentication } from "@simplewebauthn/browser";

const optionsJSON = await fetch("/api/passkey/login-options").then((res) =>
  res.json(),
);

const response = await startAuthentication({
  optionsJSON,
  useBrowserAutofill: true,
});

await fetch("/api/passkey/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(response),
});
```

Challenge'ı üretmek ve gelen imzayı doğrulamak her zaman sunucunun işidir *(`@simplewebauthn/server`)*. Tarayıcı yalnızca cihazla sunucu arasında aracılık eder.

> [!WARNING]
>
> Kullanıcı tüm cihazlarını kaybedebilir. Passkey eklemek, hesabı kurtarma yolunu düşünmeyi gerektirir: ikinci bir passkey, kurtarma kodları ya da doğrulanmış e-posta.[^1]

## Kendin dene

- Kendi giriş formunuza doğru `autocomplete` değerlerini ekleyin ve tarayıcının parola önerisini kayıt formunda görün.
- [webauthn.io](https://webauthn.io/) demo sitesinde bir passkey oluşturup onunla giriş yapın; ardından passkey'in tarayıcınızın ya da işletim sisteminizin parola yöneticisinde nasıl göründüğüne bakın.
- `isPwnedPassword("password123")` çağırıp sonucu görün; sonra uzun ve rastgele bir parola deneyin.

## Detaylı öğrenmek için

- **Rehber:** [Pilcrow](https://pilcrowonpaper.com/)'un auth kitabındaki "Passwords" ve "Passkeys" sayfaları.[^6]
- **Resmi doküman:** OWASP Password Storage ve Multifactor Authentication cheat sheet'leri.[^8][^1]
- **Konuşma:** Clemens Hübner, "Passwordless future: WebAuthn and Passkeys in practice" *(WeAreDevelopers World Congress 2023, 32 dk)*; SMS ve TOTP'nin zayıflıkları, WebAuthn'ın çalışma şekli ve kurtarma akışları.[^13]
- **Resmi doküman:** passkeys.dev; passkey'i mevcut bir siteye ekleme rehberi.[^9]

## Kaynaklar

1. [OWASP: Multifactor Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) *(doc)* — Faktör türleri; SMS, TOTP, güvenlik anahtarı ve passkey'in artı ve eksileri; kurtarma kodları.
2. [Sam Dutton](https://samdutton.com/): [Sign-in form best practices](https://web.dev/articles/sign-in-form-best-practices) *(article)* — `autocomplete` değerleri, ayrı form, parola göster/gizle ve tekrar yazdırmama.
3. [MDN: HTML attribute autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) *(doc)* — `username`, `current-password`, `new-password`, `one-time-code` ve `webauthn` değerleri.
4. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) *(doc)* — Parola uzunluğu, karakter kuralı ve periyodik değişiklik yasağı, kara liste, yapıştırma ve parola yöneticisi.
5. [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) *(doc)* — Parola uzunluğu, yapıştırmaya izin, genel hata mesajı ve kaba kuvvete karşı önlemler.
6. [Pilcrow](https://pilcrowonpaper.com/): [Passwords](https://auth.pilcrowonpaper.com/passwords) *(article)* — Uzunluk, sızmış parola kontrolü, Argon2id ve rate limit önerileri.
7. [Have I Been Pwned: Pwned Passwords API](https://haveibeenpwned.com/API/v3#PwnedPasswords) *(doc)* — Hash'in ilk 5 karakteriyle arama, API anahtarı gerekmemesi ve `Add-Padding`.
8. [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) *(doc)* — Hash ile şifreleme farkı, salt, Argon2id, scrypt ve bcrypt parametreleri.
9. [passkeys.dev: What are passkeys?](https://passkeys.dev/docs/intro/what-are-passkeys/) *(doc)* — Passkey'in tanımı, siteye özel olması ve senkronizasyon.
10. [MDN: Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) *(doc)* — Anahtar çifti, challenge ile kayıt ve giriş adımları, alan adına bağlı imza.
11. [Eiji Kitamura: Sign in with a passkey through form autofill](https://web.dev/articles/passkey-form-autofill) *(article)* — `autocomplete="username webauthn"` ve `mediation: "conditional"`.
12. [SimpleWebAuthn: @simplewebauthn/browser](https://simplewebauthn.dev/docs/packages/browser) *(doc)* — `startRegistration`, `startAuthentication` ve `useBrowserAutofill`.
13. [Clemens Hübner: Passwordless future: WebAuthn and Passkeys in practice](https://www.wearedevelopers.com/videos/810-passwordless-future-webauthn-and-passkeys-in-practice) *(video)* — WeAreDevelopers World Congress 2023; parola ve 2FA zayıflıkları, WebAuthn ve passkey'lerin pratikte kullanımı.
