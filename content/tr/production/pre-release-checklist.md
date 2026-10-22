---
title: "Yayın öncesi kontrol listesi"
description: "Canlıya çıkmadan önce kod ve build, yapılandırma, güvenlik başlıkları, hata ve log, performans ve erişilebilirlik, SEO ve operasyon başlıklarında bakılacaklar; yayın günü ve sonrası için kısa bir plan."
lastVerified: "2026-10-22"
translationKey: "production/pre-release-checklist"
---

## Neden Liste?

Yayın günü stresli bir gündür ve stres altında en bariz adım unutulur. Pilotlar her kalkıştan önce, binlerce kez uçtukları uçakta bile kontrol listesini okur. Liste bilgi vermez, **unutmayı** önler.

Bu ders bir kontrol listesidir. Her madde bu rehberdeki bir derse ya da [!nextjs]'in kendi production kontrol listesine dayanır.[^1] Listeyi deponuza bir pull request şablonu ya da `RELEASE.md` olarak kopyalayın ve projenize göre düzenleyin.

## Kod ve Build

- [ ] `next build` yerelde ve CI'da hatasız tamamlanıyor. Next.js dokümanı yayından önce yerelde build alıp `next start` ile production'a yakın bir ortamda denemenizi önerir.[^1]
- [ ] Lint ve tip kontrolü CI'da zorunlu; `main`'e birleştirme bu kontrollerin geçmesine bağlı *(bkz. [CI/CD](/academy/production/cicd))*.
- [ ] Uçtan uca testler production build'e karşı çalışıyor *(bkz. [Playwright](/academy/playwright))*.
- [ ] Bağımlılıklar kilit dosyasından kuruluyor *(`npm ci`)*; `npm audit` çıktısındaki kritik açıklar incelendi.
- [ ] Build çıktısındaki route tablosu beklendiği gibi: statik olması gereken sayfalar `○`, isteğe bağlı olanlar `ƒ` ya da `◐`.

## Yapılandırma

- [ ] Bütün ortam değişkenleri açılışta doğrulanıyor; eksik bir değer sunucuyu açılırken durduruyor *(bkz. [Ortam değişkenleri](/academy/production/environment-variables))*.
- [ ] `.env*` dosyaları `.gitignore`'da; yalnızca `.env.example` depoda.[^1]
- [ ] `NEXT_PUBLIC_` ile başlayan hiçbir değişken secret taşımıyor.
- [ ] Canlı ortamın anahtarları önizleme ortamınınkilerden ayrı.
- [ ] Birden fazla sunucu çalışacaksa `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` ve `deploymentId` ayarlı *(bkz. [Deploy seçenekleri](/academy/production/deployment-options))*.

## Güvenlik

- [ ] Her Server Action ve Route Handler kendi içinde kimlik ve yetki kontrolü yapıyor. Next.js dokümanı yalnızca proxy'ye ya da sayfa düzeyindeki kontrole güvenmemenizi söyler *(bkz. [Yetkilendirme ve roller](/academy/auth-security/authorization-and-roles))*.[^1]
- [ ] Temel güvenlik başlıkları gönderiliyor ve `X-Powered-By` kapalı:

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

| Başlık | Ne yapar |
| :-- | :-- |
| `X-Content-Type-Options: nosniff` | Tarayıcının içerik türünü tahmin etmesini engeller; geçerli tek değeri budur[^2] |
| `X-Frame-Options: DENY` | Sitenin başka bir sitede `iframe` içinde açılmasını engeller *(clickjacking)*. Next.js dokümanı bunun yerini CSP'nin `frame-ancestors` yönergesinin aldığını belirtir[^2] |
| `Referrer-Policy` | Başka siteye geçerken ne kadar adres bilgisi gönderileceğini belirler[^2] |
| `Permissions-Policy` | Kamera, mikrofon gibi tarayıcı API'lerini kapatır[^2] |
| `X-Powered-By` | Next.js varsayılan olarak ekler; sunucunun ne kullandığını ilan etmenin faydası yok[^3] |

- [ ] Site yalnızca HTTPS ile sunuluyorsa `Strict-Transport-Security` başlığı ekli. Bu başlık tarayıcıya siteyi bundan sonra yalnızca HTTPS ile açmasını söyler; HTTPS'e tam geçmeden eklemeyin.[^2]
- [ ] Content Security Policy değerlendirildi. Next.js dokümanı CSP'yi XSS, clickjacking ve kod enjeksiyonuna karşı önerir; kurulumu nonce gerektirdiği için ayrı bir çalışmadır.[^1][^4]
- [ ] Docker imajı root olmayan kullanıcıyla çalışıyor ve imajda secret yok.

> [!TIP]
>
> Başlıkları test edin. Bu rehberin projesinde bir Playwright testi `request.get("/login")` ile başlıkları okur ve `x-powered-by`'ın olmadığını doğrular. Bir yapılandırma değişikliği başlıkları sessizce kaldırırsa test düşer.

## Hatalar ve Loglar

- [ ] `app/error.tsx` ve `app/global-error.tsx` var. Next.js'in kontrol listesi tüm uygulama için erişilebilir bir hata ekranı önerir.[^1]
- [ ] Özel bir 404 sayfası var *(`not-found.tsx`)*.
- [ ] Sunucu hataları `onRequestError` ile bir servise ya da loglara gidiyor; kullanıcıya gösterilen hata kodu loglarda aranabiliyor *(bkz. [Hata izleme](/academy/production/error-monitoring))*.
- [ ] Source map'ler hata izleme servisine yükleniyor.
- [ ] Hata izleme hattı gerçekten denendi: bilerek bir hata fırlatıldı ve kayıt servise ulaştı.
- [ ] Loglar JSON, `stdout`'a yazılıyor ve her satırda sürüm ile ortam var *(bkz. [Loglama](/academy/production/logging))*.
- [ ] Parola, token, cookie ve kart bilgisi loglara yazılmıyor; `redact` ayarlı.
- [ ] Uyarılar tanımlı ve her biri eyleme dönüştürülebilir.

## Performans ve Erişilebilirlik

- [ ] Lighthouse gizli pencerede çalıştırıldı. Next.js dokümanı bunun bir simülasyon olduğunu ve gerçek kullanıcı verisiyle *(Core Web Vitals)* birlikte okunması gerektiğini hatırlatır.[^1]
- [ ] Core Web Vitals ölçülüyor; `useReportWebVitals` ya da platformun analitik aracı.
- [ ] Paket boyutu incelendi; beklenmedik büyük bir bağımlılık yok.
- [ ] Görseller `next/image`, yazı tipleri `next/font` ile.
- [ ] Erişilebilirlik taraması ve klavye testi yapıldı *(bkz. [Erişilebilirlik ve görsel testler](/academy/playwright/accessibility-and-visual-tests))*.

## SEO ve Paylaşım

- [ ] Her sayfanın başlığı ve açıklaması var; sosyal paylaşım görseli tanımlı *(bkz. [Metadata ve SEO](/academy/nextjs/metadata-and-seo))*.
- [ ] `robots.txt` ve site haritası canlı adresi gösteriyor; önizleme ortamı arama motorlarına kapalı.
- [ ] Hata izleme ve deneme sayfaları *(`/debug` gibi)* canlıda kapalı.

## Operasyon

- [ ] Sağlık kontrolü uç noktası var ve sürüm bilgisi dönüyor.
- [ ] Sunucu `SIGTERM` ile temiz kapanıyor; platformun bekleme süresi 10-30 saniye.[^5]
- [ ] Streaming, aradaki ters vekil ve yük dengeleyicide tamponlanmıyor.[^5]
- [ ] **Geri alma planı** yazılı: bir önceki sürüme nasıl dönülür, kim karar verir, ne kadar sürer? Plan denenmedikçe plan değildir.
- [ ] Riskli özellikler bir flag arkasında ve kapatılabilir durumda *(bkz. [Feature flag ve yayın stratejisi](/academy/production/feature-flags-and-release-strategy))*.
- [ ] Veritabanı değişiklikleri eski ve yeni sürümle aynı anda çalışabilir.
- [ ] Alan adı, TLS sertifikası ve yönlendirmeler *(`www`'dan köke ya da tersi)* hazır.

## Yayın Günü

1. Yayını ekibin çalıştığı bir saatte yapın; cuma akşamı değil.
2. Deploy'dan sonra sağlık uç noktasıyla doğru sürümün çalıştığını doğrulayın.
3. Kritik akışları elle bir kez deneyin: giriş, ana işlem, ödeme.
4. İlk bir saat hata izleme panelini ve hata oranını izleyin. Yeni bir hata türü çıktıysa geri alma kararını erken verin.
5. Riskli özellikleri flag ile kademeli açın.

## Yayından Sonra

- Hangi maddenin atlandığını ya da hangi sorunun listede olmadığını not edin ve listeyi güncelleyin. Liste yaşayan bir belgedir.
- İşini bitiren yayın flag'lerini silmek için bir iş kaydı açın.
- Bir sorun yaşandıysa suçlu aramadan bir değerlendirme yazın: ne oldu, nasıl fark edildi, neden olmuştu, bir daha olmaması için ne değişiyor?

## Kendin Dene

- Bu listeyi projenizin `.github/pull_request_template.md` dosyasına kopyalayın ve uymayan maddeleri silin.
- `curl -I` ile canlı sitenizin başlıklarına bakın. Hangi güvenlik başlıkları eksik?
- Geri alma planınızı yazın ve bir önizleme ortamında deneyin. Ne kadar sürdü?

## Detaylı Öğrenmek İçin

- **Resmi doküman:** Next.js, "Production Checklist"; otomatik optimizasyonlar ve yayından önce bakılacaklar.[^1]
- **Resmi doküman:** Next.js, "headers"; güvenlik başlıkları ve örnek değerler.[^2]
- **Resmi doküman:** Next.js, "Self-Hosting"; kendi sunucunuzda kapanış, streaming ve birden fazla sunucu.[^5]

## Kaynaklar

1. [Next.js: Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) *(doc)* — Geliştirme sırasında ve yayından önce bakılacaklar: hata ekranları, Server Action güvenliği, ortam değişkenleri, CSP, Lighthouse ve paket analizi.
2. [Next.js: headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers) *(doc)* — `headers()` yapılandırması ve güvenlik başlıkları: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
3. [Next.js: poweredByHeader](https://nextjs.org/docs/app/api-reference/config/next-config-js/poweredByHeader) *(doc)* — `X-Powered-By` başlığını kapatmak.
4. [Next.js: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) *(doc)* — Nonce ile CSP kurulumu.
5. [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting) *(doc)* — Kapanış ve bekleme süresi, streaming ve ters vekil.
