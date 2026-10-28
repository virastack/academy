# AI shopping assistant

- Next.js (App Router), TypeScript, the AI SDK (`ai`, `@ai-sdk/react`), Zod. Do not add another library.
- The model is the fake model in `src/lib/fake-model.ts` by default. No key is needed. Do not change `src/lib/model.ts` or `fake-model.ts`.
- The tools are in `src/lib/tools.ts`: `searchProducts` and `addToCart`. `addToCart` always asks for the user's approval, and the quantity is between 1 and 5.
- Put only the product's `id`, `name`, `category`, `price` and `inStock` fields into the tool output. `description` does not go to the model.
- The cart is per user (the `x-user-id` header). The internal detail of an error message does not leak to the model.
- The assistant's text is shown as plain text. Do not use `dangerouslySetInnerHTML` and do not render markdown.
- The rate limit, the input limit and `maxOutputTokens` are in `src/lib/chat-handler.ts`.
- Run `npm test` before you finish. Do not say you are done until they all pass.
