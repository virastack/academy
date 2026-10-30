---
title: "Loglama"
description: "Yapılandırılmış log, ne loglanır, ne loglanmaz."
lastVerified: "2026-10-22"
translationKey: "production/logging"
---

## Log neden var?

Canlıda hata ayıklayıcı yok, `console.log`'u görecek bir terminal yok. Bir kullanıcı "dün öğleden sonra siparişim iptal olmadı" dediğinde elinizdeki tek kanıt loglardır. İyi bir log, sorulmadan önce cevabı kaydetmiş olandır: kim, ne zaman, ne yaptı, sonuç ne oldu.

## Loglar bir akıştır

Twelve-Factor ilkeleri logu dosya olarak değil, **olay akışı** olarak tanımlar. Uygulama log dosyası açmaz, döndürmez, nereye gideceğini bilmez; her olayı tek satır olarak `stdout`'a yazar. Akışı toplamak, birleştirmek ve bir arama sistemine göndermek çalışma ortamının işidir.[^1]

Bu, [!docker] ve bulut platformlarıyla birebir uyuşur: `docker logs` konteynerin `stdout`'unu okur, platformlar aynı akışı kendi log arayüzlerine taşır. Uygulamanızda dosyaya yazan bir logger ayarlamanıza gerek yoktur.

## Yapılandırılmış log

İnsan için yazılmış bir log satırı:

```text
Kullanıcı yonetici@example.com SP-1001 siparişini iptal etti
```

Aynı olay, makine için:

```json
{"level":30,"time":1792639224970,"service":"order-panel","env":"production","version":"a1b2c3d","event":"order_cancelled","orderId":"SP-1001","userId":"u1","msg":"Order cancelled"}
```

İkincisinde "son bir saatte `order_cancelled` olaylarını say", "`version` a1b2c3d olan hataları getir" gibi sorgular yazabilirsiniz. Log arama sistemleri JSON alanlarını ayrı ayrı indeksler.

> [!TIP]
>
> Her olaya sabit bir `event` adı verin *(`login_failed`, `order_cancelled`)*. Mesaj metni zamanla değişir; olay adı değişmezse kayıtlı sorgular ve uyarılar bozulmaz.

## pino ile logger

pino, Node.js için hızlı bir JSON logger'dır. [!nextjs] onu sunucu paketlerinden ayrı tutulan *(bundle'lanmayan)* paketler listesinde varsayılan olarak tanır; ek ayar gerekmez.[^2]

```command
npm install pino
```

```ts
// lib/logger.ts
import "server-only";
import pino from "pino";
import { getEnv } from "./env";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  base: { service: "order-panel", env: getEnv().APP_ENV, version: getEnv().APP_VERSION },
  redact: {
    paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
    censor: "[redacted]",
  },
});
```

- `level` hangi seviyenin altının yazılmayacağını belirler. Ortam değişkeninden gelir; canlıda `info`, sorun ararken geçici olarak `debug` *(bkz. [Ortam değişkenleri](/academy/production/environment-variables))*.
- `base` her satıra eklenen alanlardır. `version` sayesinde bir hatanın hangi deploy'la başladığı tek sorguyla görünür.
- `redact` aşağıda.

Kullanım: ilk argüman alanlar, ikincisi mesaj.

```ts
logger.info({ event: "login_succeeded", userId: user.id }, "Sign-in succeeded");
logger.warn({ event: "login_failed", email }, "Sign-in failed");
logger.error({ event: "request_error", err: error, digest }, "An error occurred while handling the request");
```

`err` alanına bir `Error` verdiğinizde pino onu `type`, `message` ve `stack` alanlarına ayırır.

## Seviyeler

| Seviye | Ne zaman | Örnek |
| :-- | :-- | :-- |
| `error` | Bir istek ya da iş başarısız oldu, biri bakmalı | Yakalanmamış sunucu hatası, ödeme servisine ulaşılamadı |
| `warn` | Beklenmeyen ama uygulamanın atlattığı durum | Başarısız giriş, tekrar denemeyle geçen bir dış istek |
| `info` | Önemli iş olayları | Sunucu başladı, sipariş iptal edildi |
| `debug` | Sorun ararken gereken ayrıntı | Bir sorgunun parametreleri, ara değerler |

Canlıda `debug` kapalı olmalıdır; hem gürültü hem maliyettir. `error` seviyesi uyarı kurallarının kaynağıdır, bu yüzden beklenen durumları *(geçersiz form gönderimi gibi)* `error` olarak yazmayın.

## Bağlamı taşımak: Alt logger

Bir istek boyunca yazılan her satıra aynı alanları *(istek kimliği, kullanıcı)* eklemek için `child` kullanın:[^3]

```ts
const requestLogger = logger.child({ requestId: crypto.randomUUID(), userId: user.id });

requestLogger.info({ event: "order_cancel_requested", orderId }, "Cancellation requested");
requestLogger.info({ event: "order_cancelled", orderId }, "Order cancelled");
```

İki satır da `requestId` ve `userId` taşır. Loglarda bir istek kimliğini aratınca o isteğin bütün hikâyesini sırayla görürsünüz.

## Ne loglanır?

OWASP'ın loglama rehberi güvenlik açısından mutlaka kaydedilmesi gereken olayları sıralar. Frontend ve Next.js uygulamasına düşenler:[^4]

- Kimlik doğrulama başarıları ve **başarısızlıkları**: tekrar eden başarısız girişler kaba kuvvet ve kimlik bilgisi doldurma *(credential stuffing)* saldırılarının erken işaretidir.
- Yetkilendirme başarısızlıkları: izleyici rolündeki birinin iptal isteği atması *(bkz. [Yetkilendirme ve roller](/academy/auth-security/authorization-and-roles))*.
- Girdi doğrulama hataları: geçersiz parametreler. OWASP bunları saldırı kanıtı değil, şüpheli olay olarak değerlendirmeyi söyler; hatalı bir client de aynı izi bırakır.
- Oturum yönetimi hataları: değiştirilmiş bir oturum cookie'si, doğrulanamayan bir token.
- Uygulama hataları ve sistem olayları: başlama, kapanma, yapılandırma hataları.

Bu rehberin projesinde giriş Server Action'ı iki olayı yazar:

```ts
// app/actions.ts
const user = findUser(email, password);
if (!user) {
  // Parolayı asla loglamayın. E-posta, tekrar eden denemeleri fark etmek için yeterlidir.
  logger.warn({ event: "login_failed", email }, "Sign-in failed");
  return { error: "Email or password is incorrect.", email };
}

logger.info({ event: "login_succeeded", userId: user.id }, "Sign-in succeeded");
```

## Ne loglanmaz?

OWASP'a göre şunlar loglara doğrudan yazılmamalı; çıkarılmalı, maskelenmeli, özetlenmeli *(hash)* ya da şifrelenmelidir:[^4]

- Oturum kimlikleri *(gerekirse özetini yazın)*
- Erişim token'ları
- Parolalar
- Veritabanı bağlantı dizeleri
- Şifreleme anahtarları ve diğer secret'lar
- Banka ve kart bilgileri
- Sağlık bilgisi, kimlik numarası gibi hassas kişisel veriler
- Kullanıcının toplanmasına izin vermediği veriler

> [!CAUTION]
>
> Log sistemi genellikle uygulama veritabanından çok daha fazla kişiye açıktır ve çok daha uzun saklanır. Loga yazılan bir parola, şifrelenmiş veritabanındaki tüm korumayı boşa çıkarır.

En sık yapılan hata bilinçli değildir: bir nesnenin tamamını loglamak. `logger.info({ request })` cookie başlıklarını, `logger.info({ body })` parolayı yazar. pino'nun `redact` seçeneği verilen yollardaki değerleri yazmadan önce değiştirir:[^5]

```ts
redact: {
  paths: ["password", "*.password", "cookie", "*.cookie", "headers.cookie", "*.headers.cookie"],
  censor: "[redacted]",
},
```

```ts
logger.info({ user: { email: "a@example.com", password: "x" }, headers: { cookie: "session=..." } });
```

```json
{"user":{"email":"a@example.com","password":"[redacted]"},"headers":{"cookie":"[redacted]"}}
```

`*` tek seviyeyi temsil eder; `*.password` `user.password`'ü yakalar ama `a.b.password`'ü yakalamaz. Tire içeren anahtarlar köşeli parantezle yazılır: `headers["set-cookie"]`.[^5] `redact` bir güvenlik ağıdır, alışkanlığın yerini tutmaz: loglayacağınız alanları tek tek seçin.

> [!NOTE]
>
> Next.js geliştirme modunda Server Function çağrılarını argümanlarıyla birlikte terminale yazar.[^6] Bu yalnızca `next dev`'de olur ve `logging.serverFunctions: false` ile kapatılabilir. `logging` ayarlarının hiçbiri production build'i etkilemez.

## Hata kodu ile eşleştirmek

[Hata izleme](/academy/production/error-monitoring) dersindeki `onRequestError` her sunucu hatasını `digest` alanıyla loglar. Kullanıcı ekranda gördüğü hata kodunu destek ekibine iletir, ekip loglarda `digest` ile arar:

```json
{"level":50,"event":"request_error","digest":"403643587","path":"/debug","routeType":"render","msg":"An error occurred while handling the request"}
```

Aynı fikir genelleşir: her log satırına bir istek kimliği, sürüm ve ortam eklerseniz, birbirinden bağımsız kayıtları birbirine bağlayabilirsiniz.

## Geliştirmede okunur log

JSON satırlarını terminalde okumak zordur. `pino-pretty` yalnızca okumak için bir dönüştürücüdür; uygulama yine JSON yazar:

```command
npm run dev | npx pino-pretty
```

## Loglar, metrikler ve izler

Loglar tek başına her soruyu cevaplamaz. Google'ın SRE kitabı kullanıcıya dönük bir sistemde izlenecek **dört altın sinyali** sayar: gecikme, trafik, hatalar ve doygunluk.[^7] Bunlar sayı olarak *(metrik)* tutulduğunda grafiğe dökülür ve uyarı kurulur; tek tek log satırlarından hesaplamak pahalıdır.

Bir isteğin hangi adımda yavaşladığını görmek için ise **iz** *(trace)* gerekir. Next.js kendi içini OpenTelemetry ile zaten ölçer ve dokümanı OpenTelemetry'yi önerir: sağlayıcı değiştirseniz de kodunuz değişmez. Başlamanın en kısa yolu `@vercel/otel` paketidir:[^8]

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "order-panel" });
}
```

Küçük bir proje için yapılandırılmış loglar ve bir hata izleme servisi çoğu zaman yeterlidir. Trafik büyüdükçe metrik ve iz ekleyin.

## Kendin dene

- Projenize pino ekleyin. `console.log` satırlarını `event` alanlı log çağrılarına çevirin.
- Başarısız girişleri loglayın. Aynı e-postayla art arda beş başarısız deneme yapıp loglarda nasıl göründüğüne bakın.
- `redact` olmadan bir isteğin başlıklarını loglayın ve cookie'nin açıkça yazıldığını görün. Sonra `redact` ekleyin.
- Bir Route Handler'da `logger.child` ile istek kimliği ekleyin ve aynı isteğin satırlarını filtreleyin.

## Detaylı öğrenmek için

- **Rehber:** OWASP, "Logging Cheat Sheet"; hangi olaylar, hangi alanlar, ne loglanmaz.[^4]
- **Yazı:** Heroku, "The Twelve-Factor App: Logs"; logları olay akışı olarak düşünmek.[^1]
- **Resmi doküman:** pino, "Redaction"; yol söz dizimi ve sansür seçenekleri.[^5]
- **Resmi doküman:** Next.js, "OpenTelemetry"; izleme ve `@vercel/otel`.[^8]

## Kaynaklar

1. [Heroku](https://12factor.net/): [The Twelve-Factor App: XI. Logs](https://12factor.net/logs) *(article)* — 2011, Adam Wiggins. Logları stdout'a yazılan olay akışı olarak ele almak.
2. [Next.js: serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) *(doc)* — Varsayılan olarak bundle'lanmayan paketler listesi.
3. [pino: API](https://getpino.io/#/docs/api) *(doc)* — Logger seçenekleri, seviyeler ve `logger.child()`.
4. [OWASP: Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) *(doc)* — Kaydedilmesi gereken olaylar ve loglara yazılmaması gereken veriler.
5. [pino: Redaction](https://getpino.io/#/docs/redaction) *(doc)* — `redact` yolları, joker karakter, `censor` ve `remove`.
6. [Next.js: logging](https://nextjs.org/docs/app/api-reference/config/next-config-js/logging) *(doc)* — Geliştirme modundaki fetch, Server Function ve istek logları.
7. [Google](https://sre.google/): [Site Reliability Engineering: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) *(article)* — 2016, Rob Ewaschuk. Dört altın sinyal: gecikme, trafik, hatalar, doygunluk.
8. [Next.js: OpenTelemetry](https://nextjs.org/docs/app/guides/open-telemetry) *(doc)* — Next.js'in yerleşik ölçümleri ve `@vercel/otel` ile kurulum.
