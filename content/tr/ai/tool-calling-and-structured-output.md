---
title: "Tool Calling ve Structured Output"
description: "Modelin fonksiyon çağırması, Zod şemasıyla yapılandırılmış çıktı ve kullanıcı onayı."
lastVerified: "2026-10-15"
translationKey: "ai/tool-calling-and-structured-output"
---

Model yalnızca metin üretmez. İki şey daha yapabilir: bir fonksiyonu çağırmak istemek (tool calling) ve çıktısını bir şemaya uydurmak (structured output). Tool calling'de model, tanımladığınız fonksiyonu girdisiyle birlikte çağırmak ister, SDK fonksiyonu çalıştırır ve sonucu modele geri verir.[^1] Frontend'de bunun karşılığı şunlar: modelin sipariş durumunu gerçek servisten sorgulaması, geri alınamaz bir işlemden önce kullanıcıya sorması, serbest metinden form alanlarını çıkarması.

> [!NOTE]
>
> Bu rehberdeki kodlar `ai@7.0.140` ve `@ai-sdk/react@4.0.143` ile çalıştırıldı. Route, `useChat` ve akış kurulumu için önce [AI SDK ve Streaming Sohbet](/academy/ai/ai-sdk-and-streaming-chat) rehberine bakın. Örnekler bir e-ticaret sipariş asistanı üzerinden gider.

Araçlar `execute` fonksiyonunun olup olmamasına ve onay gerekip gerekmediğine göre üçe ayrılır:

| Araç türü | `execute` | Kim çalıştırır | Örnek |
| --- | --- | --- | --- |
| Sunucu aracı | Var | Sunucu, model çağırınca | `getOrderStatus` |
| İstemci aracı | Yok | Arayüz, kullanıcı etkileşimiyle[^1][^2] | `pickSize` |
| Onaylı araç | Var, ayrıca `toolApproval` | Sunucu, kullanıcı onayladıktan sonra[^2] | `cancelOrder` |

## Araç tanımlama

```ts
// app/assistant/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const tools = {
  getOrderStatus: tool({
    description: 'Bir siparişin kargo durumunu döndürür.',
    inputSchema: z.object({
      orderId: z.string().describe('Sipariş numarası, örn. TR-1042'),
    }),
    execute: async ({ orderId }) => ({
      orderId,
      status: 'kargoda',
      eta: '2026-10-18',
    }),
  }),

  cancelOrder: tool({
    description: 'Bir siparişi iptal eder. Geri alınamaz.',
    inputSchema: z.object({ orderId: z.string() }),
    execute: async ({ orderId }) => {
      // Gerçekte: await orderService.cancel(orderId)
      return { orderId, cancelled: true };
    },
  }),
};
```

- **`description`:** Model aracı ne zaman çağıracağına buna bakarak karar verir.[^1] "Geri alınamaz" gibi uyarıları buraya yazın. [Matt Pocock](https://www.mattpocock.com)'un eğitiminde de bu alan, modele aracı ne için kullanacağını söyleyen alan olarak anlatılıyor.[^3]
- **`inputSchema`:** Zod şemasıdır. Model şemayı görür, SDK gelen girdiyi bu şemaya göre doğrular.[^1] Alanlara `.describe()` ile ipucu ekleyebilirsiniz. Açıklama modele giden şemada `description` olarak yer alır.
- **`execute`:** Doğrulanmış girdiyle çağrılır. Döndürdüğünüz değer modele geri verilir.
- **`steps`:** `generateText` sonucunda her adımın `toolCalls` ve `toolResults` alanları bulunur. Pocock bunu hata ayıklama için öneriyor.[^3] İki adımlı sahte bir akışta `result.steps[0].toolCalls` çağrının adını ve girdisini, `toolResults` de `execute`'un döndürdüğü değeri verdi.

## Route: araç döngüsü

```ts
// app/api/assistant/route.ts
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { tools } from '../../assistant/tools';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    instructions: 'Sipariş asistanısın. Sipariş iptali istenirse cancelOrder aracını çağır.',
    messages: await convertToModelMessages(messages),
    tools,
    toolApproval: { cancelOrder: 'user-approval' },
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

Bir adım (step), modelin bir kez üretmesi ve çağırdığı yerel araçların çalıştırılmasıdır.[^1] Araç sonucu modele döner ve model ikinci adımda bunu yorumlar.

> [!WARNING]
>
> `stopWhen` vermezseniz döngü tek adımda biter.[^1] Araç çalışır ama model sonucu yorumlayacağı ikinci adıma geçmez: `text` boş kalır ve `finishReason` `tool-calls` olur. Araç kullanan her route'a `stopWhen: isStepCount(n)` ekleyin. Eski öğreticilerdeki `stepCountIs(n)` hâlâ çalışır ama güncel dokümandaki adı `isStepCount`'tır.

### Hatalar

| Durum | Ne olur |
| --- | --- |
| Model şemaya uymayan girdi gönderir | Hata fırlatılmaz, `tool-error` parçası oluşur ve döngü sürer |
| `execute` hata fırlatır | Aynı şekilde `tool-error` olur, model bir tur daha çalışıp durumu açıklayabilir[^1] |

`tool-error` arayüzde `output-error` durumu olarak görünür. Ayrıntısı aşağıdaki istemci bölümünde.

> [!WARNING]
>
> `execute` içinde fırlattığınız hatanın mesajı modele olduğu gibi gider (`Error: ...`). Arayüze ise varsayılan olarak yalnızca `An error occurred.` gider ve bunu `toUIMessageStream({ onError })` ile değiştirebilirsiniz.[^2] Yani arayüzün maskelenmesi modele sızmayı engellemez. Hatayı loglayıp genel bir mesajla yeniden fırlatın:

```ts
execute: async ({ orderId }) => {
  try {
    return await fetchOrderStatus(orderId);
  } catch (error) {
    console.error('[getOrderStatus]', error); // gerçek hata yalnızca sunucu logunda
    throw new Error('Sipariş servisine şu an ulaşılamıyor.');
  }
},
```

## İstemci: aracı arayüzde göstermek

Araç çağrıları `message.parts` içinde `tool-<araç adı>` türünde parçalar olarak gelir. Her parça bir `state` taşır ve arayüzü bu duruma göre çizersiniz:[^2]

| `state` | Anlamı |
| --- | --- |
| `input-streaming` | Model girdiyi hâlâ üretiyor |
| `input-available` | Girdi hazır, araç bekliyor veya çalışıyor |
| `approval-requested` | Araç kullanıcı onayı bekliyor |
| `approval-responded` | Onay kararı alındı |
| `output-available` | Araç sonucu üretti |
| `output-error` | Araç hata verdi |
| `output-denied` | Çağrı reddedildi |

Doküman, onay gerektirmeyen araçlarda bile tüm durumların ele alınmasını öneriyor.[^2] Parça ve durum tiplerinin çıkarımı için `UIMessage`'a araçlarınızı verin:

```ts
// app/assistant/types.ts
import type { InferUITools, UIMessage } from 'ai';
import type { tools } from './tools';

export type AssistantMessage = UIMessage<never, never, InferUITools<typeof tools>>;
```

```tsx
// app/assistant/parts.tsx
import type { ChatAddToolApproveResponseFunction } from 'ai';
import type { AssistantMessage } from './types';

export function MessageParts({
  message,
  onApproval,
}: {
  message: AssistantMessage;
  onApproval: ChatAddToolApproveResponseFunction;
}) {
  return (
    <>
      {message.parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <p key={i}>{part.text}</p>;

          case 'tool-getOrderStatus':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return <p key={i}>Sipariş sorgulanıyor…</p>;
              case 'output-available':
                return <p key={i}>{part.output.orderId}: {part.output.status}</p>;
              case 'output-error':
                return <p key={i}>Sipariş sorgulanamadı.</p>;
              default:
                return null;
            }

          case 'tool-cancelOrder':
            switch (part.state) {
              case 'approval-requested':
                return (
                  <div key={i}>
                    <p>{part.input.orderId} numaralı sipariş iptal edilsin mi?</p>
                    <button onClick={() => onApproval({ id: part.approval.id, approved: true })}>
                      Evet, iptal et
                    </button>
                    <button onClick={() => onApproval({ id: part.approval.id, approved: false })}>
                      Vazgeç
                    </button>
                  </div>
                );
              case 'output-available':
                return <p key={i}>Sipariş iptal edildi.</p>;
              case 'output-denied':
                return <p key={i}>İptal edilmedi.</p>;
              case 'output-error':
                return <p key={i}>İptal işlemi başarısız oldu.</p>;
              default:
                return null;
            }

          default:
            return null;
        }
      })}
    </>
  );
}
```

`part.state` daraltması sayesinde `part.input`, `part.output` ve `part.approval` her durumda doğru tipte gelir.

## Kullanıcı onayı

Onay, modelin geri alınamaz veya maliyetli bir aracı kullanıcıya sormadan çalıştırmasını engeller. Sunucuda `toolApproval` ile hangi aracın onay istediğini belirtirsiniz (route'taki `toolApproval: { cancelOrder: 'user-approval' }` satırı). İstemcide iki şey gerekir: bir onay arayüzü ve `sendAutomaticallyWhen`.[^2]

```tsx
// app/assistant/panel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
import { MessageParts } from './parts';
import type { AssistantMessage } from './types';

export default function Assistant() {
  const { messages, addToolApprovalResponse } = useChat<AssistantMessage>({
    transport: new DefaultChatTransport({ api: '/api/assistant' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  return messages.map(message => (
    <MessageParts key={message.id} message={message} onApproval={addToolApprovalResponse} />
  ));
}
```

Akış şöyle işler:

- **Onay beklerken:** Parça `approval-requested` olur. `execute` henüz çalışmamıştır ve model akışı orada durur.
- **Onaylanırsa:** `addToolApprovalResponse({ id, approved: true })` sonrası `execute` çalışır, parça `output-available` olur ve model ikinci adımda sonucu yorumlar.
- **Reddedilirse:** Parça `output-denied` olur, `execute` hiç çalışmaz. Model reddi `execution-denied` sonucu olarak görür. `reason` verirseniz bu metin de modele gider.[^1]
- **Onaysız araçlar:** `toolApproval`'da olmayan araçlar (`getOrderStatus` gibi) doğrudan çalışır.

> [!WARNING]
>
> `sendAutomaticallyWhen` olmadan onaydan sonra hiçbir şey olmaz: parça `approval-responded`'da kalır, `execute` çalışmaz ve model ikinci kez çağrılmaz.[^2] Ya bu seçeneği verin ya da onaydan sonra elle `sendMessage` çağırın.

Her çağrıyı onaya bağlamak yerine duruma göre karar verebilirsiniz. Fonksiyon `'user-approval'` dönerse onay istenir, `undefined` dönerse araç doğrudan çalışır:[^1]

```ts
toolApproval: {
  cancelOrder: async ({ orderId }) => (orderId.startsWith('VIP') ? 'user-approval' : undefined),
},
```

> [!NOTE]
>
> Eski öğreticilerdeki `tool({ needsApproval: true })` deprecated. Onay artık `generateText` ve `streamText` seviyesinde `toolApproval` ile verilir.[^1]

> [!DONT]
>
> Yetki kontrolünü onay butonuna bırakmayın. Onay kararı istemcide verilir. Kullanıcının o siparişin sahibi olduğunu `execute` içinde sunucu tarafında doğrulamıyorsanız onay bir güvenlik önlemi değildir.

> [!DO]
>
> Onayı "kullanıcı bunu gerçekten istiyor mu?" sorusu için, yetkiyi ise sunucuda kontrol edin. Hassas araçlar için doküman `experimental_toolApprovalSecret` seçeneğini öneriyor: sunucu, onayı kendisinin verdiğini doğrular. Seçenek deneysel olduğu için bu rehberdeki örneklerde çalıştırılmadı.[^2]

## İstemci araçları

Kullanıcıdan bir seçim almak istediğinizde aracı `execute` olmadan tanımlayın. Çağrı sunucuda çalışmaz, arayüze düşer ve kullanıcı seçince sonucu siz geri verirsiniz.[^1][^2]

```ts
pickSize: tool({
  description: 'Kullanıcıya beden seçtirir.',
  inputSchema: z.object({ options: z.array(z.string()).describe('Seçilebilir bedenler') }),
  outputSchema: z.string(), // execute yok: addToolOutput'un tipini bu belirler
}),
```

```tsx
type SizeMessage = UIMessage<never, never, InferUITools<typeof clientTools>>;

const { messages, addToolOutput } = useChat<SizeMessage>({
  transport: new DefaultChatTransport({ api: '/api/assistant' }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
});

// message.parts.map içinde:
if (part.type !== 'tool-pickSize' || part.state !== 'input-available') return null;
return (
  <div key={`${message.id}-${i}`}>
    {part.input.options.map(size => (
      <button
        key={size}
        onClick={() => addToolOutput({ tool: 'pickSize', toolCallId: part.toolCallId, output: size })}
      >
        {size}
      </button>
    ))}
  </div>
);
```

- **`outputSchema`:** `execute` olmayan araçta bunu vermezseniz `output` tipi `undefined` olur ve `addToolOutput` derlenmez.
- **`sendAutomaticallyWhen`:** Burada `lastAssistantMessageIsCompleteWithToolCalls` kullanılır. Tüm araç sonuçları hazır olunca model otomatik olarak devam eder.[^2]
- **`await` etmeyin:** `onToolCall` içinde `addToolOutput`'u `await` ederseniz kilitlenme olabilir. Buton gibi bir olay işleyicisinde sorun yoktur.[^2]

## Structured output

Araç gerekmeden, yalnızca çıktının biçimi önemliyse `output` kullanın. Aşağıdaki örnek bir destek mesajını sınıflandırır:

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const ticketSchema = z.object({
  intent: z.enum(['siparis_durumu', 'iade', 'diger']),
  orderId: z.string().nullable(),
  urgent: z.boolean(),
});

export async function classify(text: string) {
  const { output } = await generateText({
    model: 'anthropic/claude-sonnet-5.5',
    output: Output.object({ schema: ticketSchema }),
    prompt: text,
  });
  return output; // { intent: 'siparis_durumu' | 'iade' | 'diger'; orderId: string | null; urgent: boolean }
}
```

`output` şemadan tip çıkarımıyla gelir ve şemaya göre doğrulanır.[^4] Beş çıktı türü var:[^4]

| Çıktı | Ne verir |
| --- | --- |
| `Output.object({ schema })` | Şemaya uyan tek nesne |
| `Output.array({ element })` | Şemaya uyan elemanlar dizisi (`minItems`, `maxItems` ile) |
| `Output.choice({ options })` | Verdiğiniz seçeneklerden biri |
| `Output.json()` | Yalnızca geçerli JSON, yapı doğrulanmaz |
| `Output.text()` | Düz metin, `output` verilmezse varsayılan |

- **Şemaya uymayan çıktı:** `NoObjectGeneratedError` fırlatılır. Hata nesnesindeki `text`, modelin ham çıktısını verir ve hata ayıklamak için işinize yarar.[^4]
- **Araçla birlikte:** Çıktıyı üretmek de bir adım sayılır. `stopWhen` yetmezse `result.output`'a erişmek `NoOutputGeneratedError` fırlatır.[^4]
- **Eski API:** `generateObject` ve `streamObject` deprecated. Yerine `generateText` ve `streamText` ile `output` kullanın.

### Akan structured output

`streamText` ile aynı `output` ayarı akış olarak çalışır:

```ts
import { Output, streamText } from 'ai';
import { z } from 'zod';

const recipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  minutes: z.number(),
});

export async function streamRecipe() {
  const result = streamText({
    model: 'anthropic/claude-sonnet-5.5',
    output: Output.object({ schema: recipeSchema }),
    prompt: 'Mercimek çorbası tarifi ver.',
  });

  for await (const partial of result.partialOutputStream) {
    console.log(partial); // { title?: string; ingredients?: string[]; minutes?: number }
  }

  return await result.output; // şemaya göre doğrulanmış son hâl
}
```

- **Yarım değerler:** `partialOutputStream` her an eldeki parçalı nesneyi verir. Doğrulanmadığı için `ingredients: ['mercimek', 's']` gibi yarım değerler içerebilir.[^4] Bunu yalnızca önizleme için kullanın, kaydetmek veya işlemek için `await result.output`'u bekleyin.
- **Eleman eleman:** `Output.array` ile `elementStream` yalnızca tamamlanmış ve doğrulanmış elemanları verir.[^4] Liste türü sonuçları ekrana kart kart eklemek için uygundur.
- **İstemcide:** Akan nesneyi doğrudan hook'a bağlamak için `@ai-sdk/react` içinde `useObject` var.[^4]

### Şema açıklamaları ve sınırları

Zod alanlarına yazdığınız `.describe()` metni modele giden JSON şemasında `description` olarak yer alır. [Matt Pocock](https://www.mattpocock.com) bu ipucunun özellikle alan adları açıklayıcı olmadığında işe yaradığını söylüyor. Örneği `generateObject` ile yazılmış ve sayfa Ocak 2025'te güncellenmiş. Kavram `Output.object` için de geçerli, API ise eski.[^5]

Sağlayıcı şemanın tamamını desteklemeyebilir. JSONSchemaBench'in (Ocak 2025) 10.000 gerçek JSON şemasıyla yaptığı karşılaştırmada OpenAI ve Gemini'nin şema kapsaması en düşük çıktı. Yazarlar bunu "daha muhafazakâr" bir stratejiye, yani şema özelliklerinin yalnızca bir alt kümesinin desteklenmesine bağlıyor.[^6]

Format kısıtı akıl yürütmeyi de etkileyebilir. Tam ve arkadaşlarının çalışması, JSON gibi format kısıtlarının LLM'lerin akıl yürütme performansını anlamlı biçimde düşürdüğünü, kısıt sıkılaştıkça düşüşün büyüdüğünü bildiriyor (Ağustos 2024).[^7] Bu tek bir çalışma.

> [!TIP]
>
> Şemayı gerçek sağlayıcıda bir çağrıyla deneyin. Muhakeme gerektiren görevlerde `Output.object` ile serbest metin sürümünü kendi örneklerinizle karşılaştırıp doğruluğun düşüp düşmediğine bakın.

## Hangisini seçmeli?

| İhtiyaç | Yol |
| --- | --- |
| Model gerçek bir sistemden veri alsın veya yan etki yaratsın | Sunucu aracı |
| Kullanıcıdan seçim veya bilgi alınsın | İstemci aracı (`execute` yok) |
| Geri alınamaz veya maliyetli işlem | Sunucu aracı ve `toolApproval` |
| Cevap bir şemaya uyan veri olsun (sınıflandırma, form doldurma) | `Output.object` |
| Cevap önceden belli seçeneklerden biri olsun | `Output.choice` |

Model seçerken araç çağırma doğruluğunu Berkeley Function Calling Leaderboard'da karşılaştırabilirsiniz. Sayfaya göre V3 çok turlu etkileşimleri ekledi, V4 "holistic agentic evaluation" olarak tanımlanıyor ve sayfa 12 Nisan 2026'da güncellenmiş.[^8]

## Eski öğreticilerle karşılaştırma

| Eski öğreticide gördüğünüz | Güncel karşılığı |
| --- | --- |
| `generateObject`, `streamObject` | `generateText`, `streamText` ile `output: Output.object(...)` |
| `parameters:` | `inputSchema:` |
| `maxSteps: 5` | `stopWhen: isStepCount(5)` |
| `stepCountIs(5)` | `isStepCount(5)` (eski ad takma ad olarak duruyor) |
| `needsApproval` (araç içinde) | `toolApproval` (çağrı seviyesinde) |
| `addToolResult` | `addToolOutput` |
| `message.toolInvocations` | `message.parts` içinde `tool-<araç adı>` parçaları |

## Kendin dene

1. `getOrderStatus` aracını ekleyin ve önce `stopWhen` vermeden deneyin: araç çalışır ama yanıt metni boş kalır. Sonra `stopWhen: isStepCount(5)` ekleyip farkı görün.
2. `cancelOrder` için `toolApproval` ekleyin, `sendAutomaticallyWhen`'i bilerek çıkarıp onaydan sonra akışın neden durduğunu gözlemleyin. Sonra geri ekleyin.
3. `execute` içinden bir hata fırlatın ve arayüzde neyin göründüğüne bakın. Sonra hatayı loglayıp genel mesajla yeniden fırlatın.
4. Serbest metinden form alanlarını çıkaran bir `Output.object` yazın. Şemaya uymayan bir çıktıyı bilerek üretip `NoObjectGeneratedError`'ı yakalayın ve `error.text`'i loglayın.

## Kaynaklar

1. [AI SDK: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) *(doc)* — `tool()`, `inputSchema`, `stopWhen`, hata davranışı ve `toolApproval`.
2. [AI SDK: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) *(doc)* — `useChat`'te araç parçaları ve durumları, `addToolOutput`, onay arayüzü ve `sendAutomaticallyWhen`.
3. [Matt Pocock (AI Hero): Tool Calls with Vercel AI SDK](https://www.aihero.dev/tool-calls-with-vercel-ai-sdk) *(article)* — `tool()`, `description` ve `steps` ile hata ayıklama. Sayfa 7 Ocak 2025'te güncellenmiş.
4. [AI SDK: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) *(doc)* — `Output.object`, `Output.array`, `Output.choice`, akış ve hata türleri.
5. [Matt Pocock (AI Hero): Structured Outputs with Vercel AI SDK](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk) *(article)* — Zod şeması ve `describe` ile alan ipuçları. Sayfa 5 Ocak 2025'te güncellenmiş.
6. [Geng ve ark.: JSONSchemaBench](https://arxiv.org/abs/2501.10868) *(research)* — 10.000 gerçek JSON şemasında kısıtlı çözümleme çerçevelerinin ve sağlayıcıların kapsaması.
7. [Tam ve ark.: Let Me Speak Freely?](https://arxiv.org/abs/2408.02442) *(research)* — Format kısıtlarının LLM akıl yürütme performansına etkisi.
8. [Berkeley Function Calling Leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) *(research)* — Araç çağırma doğruluğunu ölçen sıralama, V4.
