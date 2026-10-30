---
title: "Generative UI"
description: "Tool sonucunu component olarak gösterme, yükleme ve hata durumları."
lastVerified: "2026-10-15"
translationKey: "ai/generative-ui"
---

Generative UI'da model arayüz kodu üretmez. Bir aracı çağırır, aracın döndürdüğü düz veri de sizin React bileşeninize prop olarak geçer.[^1] Model "ne gösterilecek"e karar verir, "nasıl görüneceği" sizin tasarım sisteminizde kalır. Builder.io yazısı da aynı yönü savunuyor: araç çağrıları hazır bileşenlere eşlenmeli, her istekte sıfırdan kod üretmek yavaş ve kırılgan.[^2] Sonuç düz veri olduğu için kaydedilebilir ve sonra aynı bileşenle yeniden çizilebilir.

> [!NOTE]
>
> Bu rehberdeki kodlar `ai@7.0.140` ve `@ai-sdk/react@4.0.143` ile çalıştırıldı; bileşenler jsdom'da React 19.3 ile render edildi. Araç tanımı, `stopWhen` ve onay akışı için [Tool Calling ve Structured Output](/academy/ai/tool-calling-and-structured-output), `useChat` ve route kurulumu için [AI SDK ve Streaming Sohbet](/academy/ai/ai-sdk-and-streaming-chat) rehberine bakın. Eski öğreticilerdeki `streamUI` ve `createStreamableUI` AI SDK RSC paketine aittir. Doküman o paketi deneysel olarak işaretliyor ve production için AI SDK UI'yı öneriyor.[^3]

## Bir aracın arayüze yolculuğu

Bir araç çağrısı, `message.parts` içindeki tek bir parça olarak gelir. Parça ilerledikçe `state` alanı değişir:[^4]

| Adım | `state` | Arayüzde |
| --- | --- | --- |
| Model girdiyi üretiyor | `input-streaming` | İskelet, kısmi girdiyle beslenir |
| Girdi hazır, araç çalışıyor | `input-available` | İskelet |
| Araç ara sonuç veriyor (isteğe bağlı) | `output-available` ve `preliminary: true` | Ara durum |
| Araç bitti | `output-available` | Bileşen |
| Araç hata verdi | `output-error` | Hata kartı |

AI SDK 5.0'dan beri araç çağrısı akışı varsayılan olarak açık. Bu yüzden girdi tamamlanmadan `input-streaming` parçalarında görünür.[^4]

## Araç ve bileşen

```ts
// app/genui/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { orderService } from './orders'; // sizin servis katmanınız

export const tools = {
  getOrderStatus: tool({
    description: 'Shows the shipping status of an order as a card.',
    inputSchema: z.object({
      orderId: z.string().describe('The order number, e.g. TR-1042'),
    }),
    outputSchema: z.object({
      orderId: z.string(),
      status: z.enum(['hazirlaniyor', 'kargoda', 'teslim-edildi']),
      eta: z.string().nullable(),
    }),
    execute: ({ orderId }) => orderService.getStatus(orderId),
  }),
};
```

Araç sonucu ile bileşen prop'ları arasındaki sözleşme budur: bileşen, aracın döndürdüğü değerle aynı prop'ları alır.[^1] `outputSchema` bu sözleşmeyi tipe çevirir, böylece `part.output` bileşene doğrudan açılabilir. Bu rehberde `orderService.getStatus`'un `{ orderId, status, eta }` döndürdüğünü varsayıyoruz.

```tsx
// app/genui/components.tsx
import { Component, type ReactNode } from 'react';
import type { Order } from './orders';

const STATUS: Record<Order['status'], string> = {
  hazirlaniyor: 'Preparing',
  kargoda: 'Kargoda',
  'teslim-edildi': 'Teslim edildi',
};

export function OrderCard({ orderId, status, eta }: Order) {
  return (
    <div data-ui="order-card">
      <strong>{orderId}</strong> · {STATUS[status].toUpperCase()}
      {eta && <span> · tahmini teslimat {eta}</span>}
    </div>
  );
}

export function OrderCardSkeleton({ orderId }: { orderId?: string }) {
  return (
    <div data-ui="skeleton" aria-busy="true">
      {orderId ? `${orderId} sorgulanıyor…` : 'Querying the order…'}
    </div>
  );
}

export function ToolError({ children }: { children: ReactNode }) {
  return (
    <div data-ui="tool-error" role="alert">
      {children}
    </div>
  );
}

// Bileşen beklenmedik bir çıktıyla çökerse yalnızca o kart düşer, sohbet çalışmaya devam eder.
export class ToolBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[ToolBoundary]', error);
  }
  render() {
    return this.state.failed ? <ToolError>This result cannot be shown.</ToolError> : this.props.children;
  }
}
```

## Parçaya göre render

Araç adlarından mesaj tipi çıkarılır, böylece `part.type` ve `part.state` daraltması her durumda doğru prop tiplerini verir:

```ts
// app/genui/types.ts
import type { InferUITools, UIMessage } from 'ai';
import type { tools } from './tools';

export type GenMessage = UIMessage<never, never, InferUITools<typeof tools>>;
```

```tsx
// app/genui/message-parts.tsx
import { getToolName, isToolUIPart } from 'ai';
import { OrderCard, OrderCardSkeleton, ToolBoundary, ToolError } from './components';
import type { GenMessage } from './types';

export function MessageParts({ message, live }: { message: GenMessage; live: boolean }) {
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
                // Akış kesilirse (ör. stop) bu durumlar sonsuza dek kalır.
                return live ? (
                  <OrderCardSkeleton key={i} orderId={part.input?.orderId} />
                ) : (
                  <ToolError key={i}>The query could not be completed.</ToolError>
                );
              case 'output-available':
                return (
                  <ToolBoundary key={i}>
                    <OrderCard {...part.output} />
                  </ToolBoundary>
                );
              case 'output-error':
                return <ToolError key={i}>The order details could not be fetched.</ToolError>;
              default:
                return null;
            }

          default:
            // Bu istemcinin tanımadığı araçlar sessizce kaybolmasın.
            return isToolUIPart(part) ? (
              <pre key={i} data-ui="unknown-tool">
                {getToolName(part)}
              </pre>
            ) : null;
        }
      })}
    </>
  );
}
```

- **İskelet, kısmi girdiyle beslenir:** `input-streaming`'de `part.input` kısmidir ve alanlar yarım gelebilir. Etiket önce "Querying the order…", sonra `TR`, sonra `TR-1042` olur. Kısmi değeri yalnızca etiket için kullanın, işlem için kullanmayın.
- **`ToolBoundary`:** Çıktı bileşeni çökerse yalnızca o kart düşer. Nedenini aşağıdaki "Kaydedilen mesajlar" bölümünde göreceksiniz.
- **`default` kolu:** `isToolUIPart` statik ve dinamik araç parçalarını yakalar. Bu kol olmazsa client'ın tanımadığı bir araç hiçbir şey çizmez ve parça sessizce kaybolur.

## Yükleme durumları

Yükleme göstergesi tasarımı için Cloudscape Design System kılavuzu işe yarar. İçerik (liste, tablo, kod bloğu) akarken içeriğin geleceği yerde yükleme çubuğu ve yanında yükleme metni göstermeyi, 1 saniyeden kısa beklemelerde yükleme durumu göstermemeyi (titreme yapar) ve göstergeyi görünür bir metinle eşlemeyi öneriyor.[^5] Bu rehberdeki iskelet de "Querying the order…" metniyle gelir.

### Ara sonuçlar

`execute`'u async generator yaparsanız her `yield` bir ara sonuç olur ve son `yield` kesin sonuç sayılır.[^6]

```ts
trackShipment: tool({
  description: 'Fetches the shipping events step by step.',
  inputSchema: z.object({ orderId: z.string() }),
  outputSchema: z.object({ stage: z.enum(['carrier', 'done']), message: z.string() }),
  async *execute({ orderId }) {
    yield { stage: 'carrier' as const, message: 'Querying the carrier…' };
    const order = await orderService.getStatus(orderId);
    yield { stage: 'done' as const, message: `${order.orderId}: ${order.status}` };
  },
}),
```

Client'ta ara sonuç da `output-available` olarak gelir. Ayırt etmek için `part.preliminary` bayrağına bakın: ara sonuçta `true`, kesin sonuçta `false` olur. Ekranda sıra şöyle akar: iskelet, "Querying the carrier…" (ara sonuç), "TR-5: kargoda" (kesin sonuç).

```tsx
case 'tool-trackShipment':
  if (part.state === 'output-available') {
    return (
      <p key={i} data-preliminary={String(part.preliminary === true)}>
        {part.output.message}
      </p>
    );
  }
  return part.state === 'output-error' ? (
    <ToolError key={i}>The shipping events could not be fetched.</ToolError>
  ) : live ? (
    <OrderCardSkeleton key={i} />
  ) : (
    <ToolError key={i}>The query could not be completed.</ToolError>
  );
```

### Takılı kalan yükleme

> [!WARNING]
>
> `stop()` çağrılırsa araç parçası `input-streaming`'de kalır, `status` ise `ready`'ye döner. Parça kendiliğinden hata ya da sonuç durumuna geçmez. Mesajı kaydedip sonra yüklerseniz iskelet sonsuza dek döner. İskeleti yalnızca akış sürerken ve yalnızca son mesajda gösterin.

Bunu `status`'tan türetilen `live` bayrağı sağlar (`MessageParts`'taki `live` prop'u):

```tsx
// app/genui/chat.tsx (form önceki rehberdeki gibi)
const { messages, sendMessage, status } = useChat<GenMessage>({
  id,
  messages: initialMessages,
  transport: new DefaultChatTransport({ api: '/api/genui' }),
});
const live = status === 'submitted' || status === 'streaming';

return messages.map((message, index) => (
  <MessageParts key={message.id} message={message} live={live && index === messages.length - 1} />
));
```

## Hata durumları

| Durum | Nereden gelir | Arayüz çözümü |
| --- | --- | --- |
| `output-error` | `execute` hata verdi ya da model şemaya uymayan girdi gönderdi | Sabit, anlaşılır bir hata kartı |
| Bileşen çökmesi | Çıktı bileşenin beklediği şekilde değil | `ToolBoundary` |
| Tanınmayan araç | Client bu aracı bilmiyor | `default` koldaki yedek kart |
| Akış yarıda kesildi | `stop()` | `live` bayrağı |

- **`output-error`:** Doküman `part.errorText`'i gösteriyor.[^1] `toUIMessageStream`'e `onError` vermezseniz bu metin `An error occurred.` olur, verirseniz sizin metniniz gelir.[^4] Şemaya uymayan girdide `part.input` modelin ham, geçersiz girdisidir ve tipine güvenilmemelidir. Bileşene vermeyin.
- **Bileşen çökmesi:** Kayıtlı çıktı bileşenin beklediği şekilde değilse (ör. `status` enum'unda artık olmayan bir değer) `STATUS[status].toUpperCase()` hata fırlatır. `ToolBoundary` olmadan bu hata tüm sohbeti düşürür. Sınır varsa yalnızca o kart "This result cannot be shown." olur ve mesajın metni görünmeye devam eder.

> [!DONT]
>
> Ham hata metnini ya da hata nesnesini kullanıcıya göstermeyin. `execute`'tan gelen mesajlar sunucuya ait iç bilgiler taşıyabilir.

> [!DO]
>
> Araç başına sabit, anlaşılır bir mesaj yazın ("The order details could not be fetched.") ve ayrıntıyı sunucuda loglayın.

## Kaydedilen mesajlar

Araç parçaları düz veri olduğu için mesajları kaydedip sonra `useChat`'in `messages` seçeneğiyle geri yükleyebilirsiniz. Kaydederken `useChat` biçimini (`UIMessage`) saklayın, `ModelMessage` değil, çünkü arayüzün ihtiyaç duyduğu alanları korur.[^7]

Bileşenler ve şemalar zamanla değişir, eski kayıtlar yeni şemalara uymayabilir. Yüklerken `validateUIMessages` ile geçmişi güncel araç şemalarına göre doğrulayın. Uymayan mesajlarda `TypeValidationError` fırlatılır:[^7]

```ts
// app/genui/load-chat.ts
import { TypeValidationError, validateUIMessages } from 'ai';
import { tools } from './tools';
import type { GenMessage } from './types';

export async function loadValidated(stored: unknown[]): Promise<GenMessage[]> {
  try {
    return await validateUIMessages<GenMessage>({ messages: stored, tools });
  } catch (error) {
    if (TypeValidationError.isInstance(error)) {
      console.error('Stored messages do not match the current schemas', error);
      return []; // ya da mesajları taşıyın veya süzün
    }
    throw error;
  }
}
```

İki koruma birbirini tamamlar: `validateUIMessages` sunucuda geçmişi yüklerken şema uyuşmazlığını yakalar, `ToolBoundary` ise yine de ekrana ulaşan beklenmedik bir çıktının tüm sohbeti düşürmesini engeller.

## Kendin dene

1. `getOrderStatus` aracını ve `OrderCard`'ı kurun. `orderService.getStatus` içine yapay bir gecikme koyup iskeletin kısmi girdiyle nasıl dolduğunu izleyin.
2. `live` bayrağını çıkarın, yanıt akarken `stop()` çağırıp iskeletin takılı kaldığını görün. Sonra `live`'ı geri ekleyin.
3. Kayıtlı bir mesajda `status` değerini enum dışı bir değerle değiştirin. Önce `ToolBoundary`'nin, sonra `validateUIMessages`'ın bunu nasıl yakaladığını karşılaştırın.
4. `trackShipment` aracını ekleyin ve `part.preliminary` ile ara sonuçtan kesin sonuca geçişi ekranda gösterin.

## Kaynaklar

1. [AI SDK: Generative User Interfaces](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) *(doc)* — Araç sonucunun bileşene prop olarak geçmesi ve `tool-<ad>` parçalarının render edilmesi.
2. [Builder.io: Designing generative UI in an agent-native world](https://www.builder.io/blog/designing-generative-ui-in-an-agent-native-world) *(article)* — Araç çağrılarını hazır bileşenlere eşleme ve her istekte kod üretmenin maliyeti (26 Mayıs 2026).
3. [AI SDK: RSC Overview](https://ai-sdk.dev/docs/ai-sdk-rsc/overview) *(doc)* — AI SDK RSC'nin deneysel durumu ve AI SDK UI önerisi.
4. [AI SDK: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage) *(doc)* — Araç parçası durumları, kısmi girdi akışı ve hata mesajı maskeleme.
5. [Cloudscape Design System: Generative AI loading states](https://cloudscape.design/patterns/genai/genai-loading-states/) *(doc)* — İşleme ve akış aşamaları, yükleme göstergesi, 1 saniyeden kısa beklemeler ve erişilebilirlik.
6. [AI SDK: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) *(doc)* — Ara sonuçlar için async generator `execute`.
7. [AI SDK: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) *(doc)* — Mesajları kaydetme, `messages` seçeneği ve `validateUIMessages`.
