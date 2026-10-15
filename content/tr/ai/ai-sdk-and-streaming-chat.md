---
title: "AI SDK ve Streaming Sohbet"
description: "useChat, streamText, model sağlayıcısı seçimi ve akan yanıtı arayüze yansıtma."
lastVerified: "2026-10-15"
translationKey: "ai/ai-sdk-and-streaming-chat"
---

Yapay zeka yanıtının tamamını beklemek yerine, model ürettikçe parça parça göstermek sohbet arayüzünün temelidir: kullanıcı yanıtı hazır olur olmaz görmeye başlar.[^1] AI SDK bu işi ikiye böler. Sunucuda `streamText` modeli çağırır, istemcide `useChat` gelen akışı mesaj durumuna çevirir.[^1]

> [!NOTE]
>
> Bu rehberdeki kodlar `ai@7.0.140` ve `@ai-sdk/react@4.0.143` ile çalıştırıldı; ikisi de 15 Ekim 2026'da npm'deki `latest` sürümdü.[^2] Eski öğreticilerdeki `input`, `handleSubmit` ve `append` gibi alanlar `useChat`'in döndürdüğü nesnede artık yok. Karşılıkları rehberin sonundaki tabloda.

| Parça | Nerede | Ne yapar |
| --- | --- | --- |
| `streamText` | Sunucu | Modeli çağırır ve yanıtı akış olarak üretir |
| `toUIMessageStream` + `createUIMessageStreamResponse` | Sunucu | Akışı `useChat`'in anladığı mesaj parçalarına ve HTTP yanıtına çevirir |
| `DefaultChatTransport` | İstemci | Mesajları varsayılan olarak `/api/chat` adresine POST eder[^1] |
| `useChat` | İstemci | `messages`, `status` ve `error` durumunu tutar[^1] |

## Kurulum

```bash
pnpm add ai @ai-sdk/react
```

Sağlayıcı paketleri (`@ai-sdk/anthropic` gibi) yalnızca modeli AI Gateway yerine doğrudan sağlayıcıdan çağıracaksanız gerekir. Bunu aşağıdaki "Model sağlayıcısı seçimi" bölümünde göreceksiniz.

## Sunucu: streamText ile route handler

```ts
// app/api/chat/route.ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'Kısa ve net cevap veren bir asistansın.',
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

- **`UIMessage[]`:** İstemci, `parts` taşıyan UI mesajları gönderir. `convertToModelMessages` bunları modelin anladığı biçime çevirir. Fonksiyon asenkron olduğu için `await` gerekir.[^1]
- **`instructions`:** Sistem talimatıdır. Eski adı `system`; v7'de `system` hâlâ çalışır ama deprecated.
- **`result.stream`:** Modelin ürettiği parçaların akışıdır. `toUIMessageStream` onu UI mesaj parçalarına, `createUIMessageStreamResponse` da SSE yanıtına çevirir.
- **`maxDuration`:** Next.js'te akışın kesilmeden sürebileceği süreyi saniye olarak belirler.[^1] Başka bir çatı kullanıyorsanız kendi karşılığını kullanın.

> [!WARNING]
>
> Eski öğreticilerde `result.toUIMessageStreamResponse()` görürsünüz. v7'de metot çalışıyor ama deprecated ve bir sonraki major sürümde kaldırılacak. Yeni kodda yukarıdaki iki yardımcıyı kullanın.

## İstemci: useChat

```tsx
// app/chat.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <>
      {messages.map(message => (
        <div key={message.id}>
          {message.role === 'user' ? 'Sen: ' : 'AI: '}
          {message.parts.map((part, index) =>
            part.type === 'text' ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      {error && (
        <button type="button" onClick={() => regenerate()}>
          Tekrar dene
        </button>
      )}

      {busy && (
        <button type="button" onClick={() => stop()}>
          Durdur
        </button>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
        />
        <button type="submit" disabled={status !== 'ready'}>
          Gönder
        </button>
      </form>
    </>
  );
}
```

- **Input sizin state'iniz:** `useChat` input'u yönetmez. Doküman da `useState` kullanıyor.[^1]
- **`message.parts`:** Mesajı `content` ile değil `parts` ile render edin. Parçalar metin, araç çağrısı ve araç sonucu gibi farklı türleri taşır.[^1] Asistan mesajı akış sırasında `step-start` gibi metin olmayan parçalar da içerir, bu yüzden `part.type`'a bakıp tanımadığınızı yok sayın.
- **`sendMessage({ text })`:** Kullanıcı mesajını ekler ve isteği gönderir.

`status` dört değerden birini alır:[^1]

| `status` | Anlamı | Arayüzde |
| --- | --- | --- |
| `submitted` | İstek gitti, akış henüz başlamadı | Spinner veya "yazıyor" göstergesi |
| `streaming` | Parçalar geliyor | Metin büyür, Durdur butonu görünür |
| `ready` | Yanıt tamamlandı | Gönder butonu aktif |
| `error` | İstek başarısız oldu | Hata mesajı ve Tekrar dene |

> [!TIP]
>
> Cloudscape Design System, "işleniyor" ile "akıyor" aşamalarını ayırır: model henüz çıktı vermediyse sohbet balonunda yükleme göstergesi gösterin, metin akmaya başladıktan sonra da yanıt bitene kadar görünür bir gösterge bırakın, çünkü akış yavaşlarsa kullanıcı yanıtın sürdüğünü anlamalıdır. 1 saniyeden kısa beklemelerde yükleme durumu göstermeyin, titreme yapar.[^3] `submitted` birinci aşamaya, `streaming` ikinciye denk gelir. Yukarıdaki `Chat` bileşeni 1 saniyelik bu gecikmeyi uygulamıyor.

## Durdurma, yeniden üretme ve hata

```tsx
<button
  type="button"
  onClick={() => stop()}
  disabled={status !== 'streaming' && status !== 'submitted'}
>
  Durdur
</button>

<button
  type="button"
  onClick={() => regenerate()}
  disabled={status !== 'ready' && status !== 'error'}
>
  Yeniden üret
</button>
```

- **`stop()`:** İsteği iptal eder.[^1] O ana kadar gelen metin ekranda kalır, `status` `ready`'ye döner ve `onFinish` olayında `isAbort: true` gelir.
- **`regenerate()`:** Son asistan mesajını yeniden üretir ve onun yerine koyar.[^1]

### Hata mesajı

Sunucuda bir hata olursa istemciye varsayılan olarak gizlenmiş bir mesaj gider: `An error occurred.`[^1] Kendi mesajınızı `toUIMessageStream` içindeki `onError` ile verin:

```ts
toUIMessageStream({
  stream: result.stream,
  onError: error => {
    console.error(error); // gerçek hatayı sunucuda loglayın
    return 'Bir şeyler ters gitti. Lütfen tekrar deneyin.';
  },
});
```

İstemcide hata `useChat`'in döndürdüğü `error` nesnesinde görünür ve `status` `error` olur. `regenerate()` ile tekrar deneyebilirsiniz.[^1]

> [!DONT]
>
> `onError` içinde `error.message`'ı olduğu gibi kullanıcıya döndürmeyin. Hata mesajları sunucuya ait iç bilgiler taşıyabilir.

> [!DO]
>
> Kullanıcıya genel bir mesaj gösterin, ayrıntıyı sunucuda loglayın. Doküman da sunucudan bilgi sızmaması için genel bir mesaj öneriyor.[^1]

## Model sağlayıcısı seçimi

AI SDK, sağlayıcıları ortak bir model arayüzünün arkasına saklar. Bu yüzden `streamText` çağrınızı değiştirmeden sağlayıcı değiştirebilirsiniz.[^4] `model` alanı üç biçimde verilebilir:

| Yol | `model` değeri | Kimlik doğrulama | Ne zaman |
| --- | --- | --- | --- |
| Gateway dizesi | `'anthropic/claude-sonnet-5.5'` | `AI_GATEWAY_API_KEY`, Vercel'de OIDC[^5] | Tek anahtarla birçok sağlayıcı, istek logu, harcama limiti |
| Sağlayıcı paketi | `anthropic('claude-sonnet-5-5')` | `ANTHROPIC_API_KEY`[^6] | Sağlayıcıya doğrudan bağlanmak |
| Global varsayılan sağlayıcı | `'gpt-6-astra'` (ön eksiz) | Seçtiğiniz sağlayıcının anahtarı | Ön ek yazmadan tek sağlayıcı kullanmak |

Düz bir dize verdiğinizde AI SDK global sağlayıcıyı kullanır ve varsayılan global sağlayıcı AI Gateway'dir.[^7]

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// 1) Gateway: düz "sağlayıcı/model" dizesi
streamText({ model: 'anthropic/claude-sonnet-5.5', messages });

// 2) Sağlayıcı paketi
streamText({ model: anthropic('claude-sonnet-5-5'), messages });

// 3) Global varsayılan sağlayıcı: uygulama başlarken bir kez ayarlayın
globalThis.AI_SDK_DEFAULT_PROVIDER = openai;
streamText({ model: 'gpt-6-astra', messages });
```

> [!WARNING]
>
> Aynı model iki farklı yazılır. Gateway dizesinde sürüm numarası noktalı (`claude-sonnet-5.5`),[^1] sağlayıcı paketinde tireli (`claude-sonnet-5-5`).[^6] Kimliği, kullandığınız yola göre yazın. Model kimlikleri sık değişir, güncel listeyi sağlayıcı sayfasından kontrol edin.[^4]

> [!TIP]
>
> Modeli kullanıcı seçecekse istemciden yalnızca bir anahtar gönderin ve sunucuda izin listesiyle eşleştirin. İstemciden gelen model adını doğrudan `streamText`'e vermeyin. İstek başına ek alan göndermek için `sendMessage`'ın ikinci parametresi olan `body` kullanılır.[^1]

```tsx
sendMessage({ text: input }, { body: { model: 'claude' } });
```

```ts
const MODELS = {
  claude: 'anthropic/claude-sonnet-5.5',
  gpt: 'openai/gpt-6-astra',
} as const;

const { messages, model }: { messages: UIMessage[]; model?: string } =
  await req.json();

// `model in MODELS` kullanmayın: 'toString' gibi anahtarlar da eşleşir.
const key =
  model && Object.hasOwn(MODELS, model)
    ? (model as keyof typeof MODELS)
    : 'claude';

const result = streamText({
  model: MODELS[key],
  messages: await convertToModelMessages(messages),
});
```

## Akan yanıtı arayüze yansıtma

`parts` dizisini `part.type`'a göre render edin. Modelin düşünme (reasoning) çıktısını göstermek istiyorsanız sunucuda `sendReasoning: true` verin, istemcide `reasoning` parçasını render edin:[^1]

```ts
toUIMessageStream({ stream: result.stream, sendReasoning: true });
```

```tsx
{message.parts.map((part, i) => {
  switch (part.type) {
    case 'text':
      return <p key={i}>{part.text}</p>;
    case 'reasoning':
      return <pre key={i}>{part.text}</pre>;
    default:
      return null;
  }
})}
```

- **Render sıklığı:** `useChat` varsayılan olarak her parçada güncelleme yayınlar. `useChat({ throttle: 50 })` güncellemeleri 50 ms'de bir ile sınırlar.[^1] Eski `experimental_throttle` seçeneği deprecated.
- **Kullanım bilgisi:** Zaman damgası veya token sayısı gibi bilgileri `messageMetadata` ile sunucudan mesaja ekleyip `message.metadata` ile okuyabilirsiniz.[^1]
- **Geçmişi sunucuda tutmak:** `DefaultChatTransport`'taki `prepareSendMessagesRequest` ile yalnızca son mesajı gönderebilir, geçmişi sunucuda yükleyebilirsiniz.[^1]
- **Düz metin akışı:** Backend'iniz yalnızca düz metin akıtıyorsa `TextStreamChatTransport` kullanın. Bu transport'ta araç çağrıları ve kullanım bilgisi gelmez.[^1]

### Metni pürüzsüz akıtma

Model bazen metni iri parçalar hâlinde gönderir ve yanıt ekranda sıçrayarak büyür. `smoothStream` parçaları sunucuda kelime kelime yeniden böler:

```ts
import { smoothStream, streamText } from 'ai';

const result = streamText({
  model: 'anthropic/claude-sonnet-5.5',
  messages: await convertToModelMessages(messages),
  experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
});
```

Sahte modelde tek parçalık `Merhaba dünya bu uzun bir cümle` metni `"Merhaba "`, `"dünya "`, `"bu "` gibi altı kelime parçasına bölündü. Upstash'te geliştirici ilişkileri çalışanı bir yazar, ağ zamanlamasını ekran zamanlamasından ayırma fikrini AI SDK v5 için anlatıyor. Yerleşik `experimental_transform` yolunu "esnek değil" ve "deneysel" bulup `requestAnimationFrame` ile kendi hook'unu yazıyor.[^8] Her parçaya gecikme eklendiği için yanıtın bitişi de gecikir. Yazar bu ödünü kabul ediyor.[^8]

### Render maliyeti

Gelen her parça bir `setState` demekse React her seferinde yeniden render eder. SitePoint yazısı parçaları `useRef`'te biriktirip `requestAnimationFrame` ile kare başına bir kez state'e yazmayı öneriyor.[^9] `useChat`'in `throttle` seçeneği aynı soruna SDK içinden yaklaşır.

## Gerçek anahtar olmadan test

Route'u model parametresi alan bir fonksiyona sararsanız `ai/test` içindeki sahte modelle akışı API anahtarı ve ağ olmadan çalıştırabilirsiniz:

```ts
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

const model = new MockLanguageModelV4({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Merhaba, ' },
        { type: 'text-delta', id: 't1', delta: 'dünya!' },
        { type: 'text-end', id: 't1' },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 4, text: 4, reasoning: 0 },
          },
        },
      ],
    }),
  }),
});
```

Bu modelle route'u çağırdığınızda yanıt `text/event-stream` olarak gelir ve `x-vercel-ai-ui-message-stream: v1` başlığını taşır. Tarayıcının Ağ sekmesinde göreceğiniz akış şudur:

```text
data: {"type":"start"}

data: {"type":"start-step"}

data: {"type":"text-start","id":"t1"}

data: {"type":"text-delta","id":"t1","delta":"Merhaba, "}

data: {"type":"text-delta","id":"t1","delta":"dünya!"}

data: {"type":"text-end","id":"t1"}

data: {"type":"finish-step"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

> [!NOTE]
>
> Sahte modelin parça biçimi (`finishReason` ve `usage` alanları) model spesifikasyonu sürümüne bağlıdır. Burada `ai@7`'nin kullandığı `MockLanguageModelV4` kullanıldı. Başka bir major sürümde tip hatası alırsanız ilgili sürümün `ai/test` tiplerine bakın.

## Eski öğreticilerle karşılaştırma

| Eski öğreticide gördüğünüz | Güncel karşılığı |
| --- | --- |
| `input`, `handleInputChange`, `handleSubmit` | `useState` ve `sendMessage({ text })` |
| `append` | `sendMessage` |
| `reload` | `regenerate` |
| `message.content` | `message.parts` |
| `system:` | `instructions:` |
| `result.toUIMessageStreamResponse()` | `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })` |
| `experimental_throttle` | `throttle` |

## Kendin dene

1. Route handler ile `Chat` bileşenini kurun. Önce sahte modelle çalıştırıp Ağ sekmesinde SSE akışını inceleyin, sonra gerçek bir modele geçin.
2. `status` değerine göre spinner, Durdur ve Tekrar dene butonlarını ekleyin. Uzun bir yanıt sırasında Durdur'a basıp ekranda kalan metne ve `status`'a bakın.
3. `onError` ile genel bir hata mesajı verin. Sağlayıcı anahtarını bilerek bozup istemcide ne göründüğünü, sunucu loglarında ne göründüğünü karşılaştırın.
4. Aynı route'ta Gateway dizesinden sağlayıcı paketine geçin ve değişen tek satırı not edin. Model kimliğinin yazımının neden değiştiğine dikkat edin.

## Kaynaklar

1. [AI SDK: Chatbot](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) *(article)* — `useChat`, `status`, transport, hata, durdurma, yeniden üretme, metadata ve reasoning.
2. [npm: ai](https://www.npmjs.com/package/ai) *(article)* — Güncel sürüm ve dist-tag'ler.
3. [Cloudscape Design System: Generative AI loading states](https://cloudscape.design/patterns/genai/genai-loading-states/) *(article)* — İşleme ve akış aşamaları, yükleme göstergesi, 1 saniyeden kısa beklemeler ve erişilebilirlik.
4. [AI SDK: Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models) *(article)* — Sağlayıcı mimarisi, sağlayıcı paketleri ve model yetenekleri tablosu.
5. [Vercel: AI Gateway](https://vercel.com/docs/ai-gateway) *(article)* — Gateway ile düz dize model kullanımı, API anahtarı ve OIDC.
6. [AI SDK: Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) *(article)* — Kurulum, `ANTHROPIC_API_KEY` ve model kimlikleri.
7. [AI SDK: Provider & Model Management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) *(article)* — Global sağlayıcı ve `AI_SDK_DEFAULT_PROVIDER`.
8. [Upstash: Smooth Text Streaming in AI SDK v5](https://upstash.com/blog/smooth-streaming) *(article)* — Ağ ve ekran zamanlamasını ayırma, `smoothStream` ve özel hook yaklaşımı.
9. [SitePoint: Streaming Backends & React: Controlling the Re-render Chaos](https://www.sitepoint.com/streaming-backends-react-controlling-re-render-chaos/) *(article)* — Akışta yeniden render maliyeti, `useRef` ve `requestAnimationFrame` ile biriktirme.
