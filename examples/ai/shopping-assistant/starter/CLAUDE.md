# AI alışveriş asistanı

- Next.js (App Router), TypeScript, AI SDK (`ai`, `@ai-sdk/react`), Zod. Başka kütüphane ekleme.
- Model varsayılan olarak `src/lib/fake-model.ts` içindeki sahte modeldir. Anahtar gerekmez. `src/lib/model.ts` ve `fake-model.ts` dosyalarını değiştirme.
- Araçlar `src/lib/tools.ts` içinde: `searchProducts` ve `addToCart`. `addToCart` her zaman kullanıcı onayı ister, adet 1–5 arasıdır.
- Araç çıktısına ürünün yalnızca `id`, `name`, `category`, `price`, `inStock` alanlarını koy. `description` modele gitmez.
- Sepet kullanıcıya göredir (`x-user-id` başlığı). Hata mesajının iç ayrıntısı modele sızmaz.
- Asistan metni düz metin olarak gösterilir. `dangerouslySetInnerHTML` ve markdown render etme.
- Rate limit, girdi sınırı ve `maxOutputTokens` `src/lib/chat-handler.ts` içindedir.
- İş bitmeden `npm test` çalıştır. Hepsi geçmeden bitti deme.
