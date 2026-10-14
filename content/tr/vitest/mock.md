---
title: "Mock"
description: "vi.fn, vi.mock ve MSW ile API mock'u."
lastVerified: "2026-10-14"
translationKey: "vitest/mock"
---

## Mock nedir?

Mock, gerçek bir bağımlılığın yerine geçen test kopyasıdır. Testin kontrolünü elinize verir. Gerçek bir ağ isteği, gerçek bir analitik servisi veya gerçek bir zamanlayıcı kullanmazsınız.

### Neyi mock'lamalı?

> [!DO]
>
> - Ağ istekleri (API çağrıları).
> - Analitik ve loglama servisleri.
> - Tarayıcıda olmayan veya yan etkisi olan API'ler (`window.open`, `navigator.sendBeacon`).
> - Zaman (`setTimeout`, `Date`).

> [!DONT]
>
> - Kendi alt component'lerinizi. Kullanıcı bunları ekranda gerçek halleriyle görür.
> - Test ettiğiniz component'in kendisini.
> - React veya Testing Library fonksiyonlarını.

## vi.fn: sahte fonksiyon

`vi.fn()` çağrıları kaydeden bir fonksiyon üretir. Callback prop'larını test etmek için kullanılır. Önceki adımlarda `onAddToCart` ve `onApply` için kullandınız.

| Kod | Anlamı |
| --- | --- |
| `vi.fn()` | Boş sahte fonksiyon. `undefined` döner. |
| `vi.fn().mockReturnValue(5)` | Her çağrıda `5` döner. |
| `vi.fn().mockResolvedValue(data)` | `Promise.resolve(data)` döner. Async fonksiyonlar için. |
| `vi.fn().mockRejectedValue(new Error("hata"))` | Reddedilen Promise döner. |

Bu tablodaki dönüş değerleri için bkz. [^1]

```tsx
const loadProducts = vi.fn().mockResolvedValue(products);

render(<ProductList loadProducts={loadProducts} onAddToCart={vi.fn()} />);
await screen.findAllByRole("article");

expect(loadProducts).toHaveBeenCalledTimes(1);
```

| Kontrol | Anlamı |
| --- | --- |
| `toHaveBeenCalled()` | En az bir kez çağrıldı. |
| `toHaveBeenCalledTimes(n)` | Tam `n` kez çağrıldı. |
| `toHaveBeenCalledWith(...)` | Bu argümanlarla en az bir kez çağrıldı. |
| `not.toHaveBeenCalled()` | Hiç çağrılmadı. |

## vi.mock: modülü mock'lama

Ürün butonu, her tıklamada analitik olayı gönderir:

```tsx
import { trackEvent } from "./analytics";
import type { Product } from "./types";

type AddToCartButtonProps = {
  product: Product;
  onAdd: (product: Product) => void;
};

export function AddToCartButton({ product, onAdd }: AddToCartButtonProps) {
  function handleClick() {
    onAdd(product);
    trackEvent("add_to_cart", { productId: product.id });
  }

  return (
    <button type="button" onClick={handleClick}>
      Sepete ekle
    </button>
  );
}
```

`trackEvent` fonksiyonu `navigator.sendBeacon` çağırır. jsdom bu API'yi sunmaz. Mock olmadan test hata verir. Modülü mock'layın:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToCartButton } from "./AddToCartButton";
import { trackEvent } from "./analytics";
import type { Product } from "./types";

vi.mock(import("./analytics"));

const keyboard: Product = {
  id: 2,
  name: "Mekanik Klavye",
  price: 2199,
  inStock: true,
};

test("ürünü ekler ve analitik olayı gönderir", async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddToCartButton product={keyboard} onAdd={onAdd} />);

  await user.click(screen.getByRole("button", { name: "Sepete ekle" }));

  expect(onAdd).toHaveBeenCalledWith(keyboard);
  expect(trackEvent).toHaveBeenCalledWith("add_to_cart", { productId: 2 });
});
```

Fabrika fonksiyonu vermezseniz Vitest özgün modülü yükler ve dışa aktardığı her şeyi otomatik olarak mock'lar. Metotlar `undefined` döner.[^2] `import("./analytics")` biçimi yolun yazım hatasını TypeScript'e doğrulatır. Dosya taşınırsa yol ile tipler birlikte güncellenir.[^2]

> [!WARNING]
>
> Vitest `vi.mock` çağrısını dosyanın başına taşır (hoisting). Çağrıyı nereye yazarsanız yazın, import'lardan önce çalışır. Bu yüzden çağrıyı dosyanın **en üst seviyesine** yazın. Mock'un `fabrika` fonksiyonunda dosyadaki diğer değişkenleri kullanamazsınız.[^2]

> [!TIP]
>
> Vitest varsayılan olarak her testten önce mock çağrı geçmişini temizler (`clearMocks`). Bu yüzden bir testteki çağrı sayısı diğer testi etkilemez.[^3]

<details>
<summary>spyOn ve restoreAllMocks</summary>

- `vi.spyOn(nesne, "metot")` mevcut bir metodu izler. Örnek: `vi.spyOn(window, "open").mockImplementation(() => null)`. Böylece "Paylaş" butonunun yeni pencere açtığını test edersiniz.
- `vi.restoreAllMocks()` yalnızca `vi.spyOn` ile oluşturulan spy'ları orijinal haline döndürür. Otomatik mock'lanan modülleri etkilemez.[^4]
- Spy'ı her testten sonra geri almak için `afterEach(() => vi.restoreAllMocks())` yazın.

</details>

## MSW: ağ isteğini mock'lama

Ürünler API'den gelir. `fetch` fonksiyonunu elle mock'lamak yerine MSW ([Mock Service Worker](https://mswjs.io)) kullanın.[^5] MSW ağ isteğini yakalar ve sahte yanıt döner.[^6][^7] Uygulama kodunuz gerçek `fetch` kullanmaya devam eder.

Önce API çağrısını yazın:

```ts
import type { Product } from "./types";

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("https://api.magaza.test/products");

  if (!response.ok) {
    throw new Error("Ürünler yüklenemedi.");
  }

  return response.json();
}
```

> [!WARNING]
>
> Testte `fetch("/products")` gibi göreli URL kullanmayın. Node ortamında göreli URL çözümlenemez ve istek başarısız olur. Tam URL kullanın.

Paketi kurun:[^8]

```command
npm install -D msw
```

Varsayılan yanıtları `src/mocks/handlers.ts` dosyasında tanımlayın. `http` ve `HttpResponse` MSW 3'te `msw/http` yolundan gelir:[^9]

```ts
import { http, HttpResponse } from "msw/http";
import type { Product } from "../types";

export const products: Product[] = [
  { id: 1, name: "Kablosuz Kulaklık", price: 1299, oldPrice: 1499, inStock: true },
  { id: 2, name: "Mekanik Klavye", price: 2199, inStock: true },
  { id: 3, name: "Oyuncu Faresi", price: 899, inStock: false },
];

export const handlers = [
  http.get("https://api.magaza.test/products", () =>
    HttpResponse.json(products),
  ),
];
```

Sunucuyu `src/mocks/server.ts` dosyasında oluşturun:

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

Sunucuyu `src/vitest.setup.ts` dosyasında başlatın:

```ts
import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

| Satır | Görevi |
| --- | --- |
| `onUnhandledFrame: "error"` | Handler'ı olmayan istek hata verir. Gerçek API'ye yanlışlıkla istek atmazsınız.[^10] |
| `resetHandlers()` | Bir testte eklenen geçici handler'ları siler. Testler birbirini etkilemez. |

> [!NOTE]
>
> MSW 2.x kullanıyorsanız seçeneğin adı `onUnhandledRequest` ve `http` ile `HttpResponse` doğrudan `msw` paketinden import edilir.[^9]

Artık `fetchProducts` fonksiyonunu doğrudan kullanın:

```tsx
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { fetchProducts } from "./fetch-products";
import { server } from "./mocks/server";
import { ProductList } from "./ProductList";

test("API'den gelen ürünleri gösterir", async () => {
  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findAllByRole("article")).toHaveLength(3);
});

test("API boş liste dönerse boş durum gösterir", async () => {
  server.use(
    http.get("https://api.magaza.test/products", () => HttpResponse.json([])),
  );

  render(<ProductList loadProducts={fetchProducts} onAddToCart={vi.fn()} />);

  expect(await screen.findByText("Ürün bulunamadı.")).toBeInTheDocument();
});
```

`server.use` yeni handler'ı mevcut handler'ların önüne ekler. Bu handler `resetHandlers` çağrılana kadar kalır.[^11] `afterEach` içindeki `resetHandlers` çağrısı bu yüzden gereklidir.

> [!TIP]
>
> Aynı handler'ları tarayıcıda geliştirme ortamı için de kullanabilirsiniz. Bu konu bu rehberin kapsamı dışındadır.

## Hangisini kullanmalıyım?

| Durum | Araç |
| --- | --- |
| Callback prop'u | `vi.fn()` |
| Analitik, logger, tarayıcı API'si | `vi.mock` veya `vi.spyOn` |
| API çağrısı | MSW |
| `setTimeout`, `Date` | Fake timers.[^12] |

## Kendin dene

API 500 hatası döndürdüğünde ne olur? Bunu test edin:

- `server.use` ile `https://api.magaza.test/products` adresine `new HttpResponse(null, { status: 500 })` döndüren bir handler ekleyin.
- `ProductList` bileşenini `fetchProducts` ile render edin.
- `findByRole("alert")` ile **Ürünler yüklenemedi.** mesajını doğrulayın.

1. [Vitest: Mock Functions](https://vitest.dev/api/mock) *(doc)* — `mockReturnValue`, `mockResolvedValue` ve `mockRejectedValue` davranışı.
2. [Vitest: Mocking Modules](https://vitest.dev/guide/mocking/modules) *(doc)* — `vi.mock` hoisting'i, otomatik mock kuralları ve `import()` biçimi.
3. [Vitest: clearMocks](https://vitest.dev/config/clearmocks) *(doc)* — Her testten önce `vi.clearAllMocks()` çağrısı ve varsayılan değer.
4. [Vitest: vi](https://vitest.dev/api/vi) *(doc)* — `vi.spyOn`, `vi.restoreAllMocks` ve `mockImplementation` davranışı.
5. [Kent C. Dodds: Stop mocking fetch](https://kentcdodds.com/blog/stop-mocking-fetch) *(article)* — Kod örnekleri MSW v1 ve Jest kullanır. Ağ sınırını mock'lama fikri bu dersle aynıdır.
6. [Vitest: Mocking Requests](https://vitest.dev/guide/mocking/requests) *(doc)* — MSW kurulumu, `onUnhandledRequest` ve sunucu yaşam döngüsü.
7. [Artem Zakharchenko: Mock Service Worker 2.0](https://gitnation.com/contents/a-sneak-peek-into-mock-service-worker-20) *(video)* — MSW'nin isteği yakalayıp sahte yanıt dönme mantığı. Konuşma 2.0 sürümünü anlatır.
8. [MSW: Quick start](https://mswjs.io/docs/quick-start) *(doc)* — Kurulum, handler tanımı, `setupServer` ve Vitest setup dosyası.
9. [MSW: Migrating from 2.x to 3.x](https://mswjs.io/docs/migrations/2.x-to-3.x) *(doc)* — `msw/http` import yolu, `onUnhandledFrame` adı ve Node 22 gereksinimi.
10. [MSW: server.listen()](https://mswjs.io/docs/api/setup-server/listen) *(doc)* — `onUnhandledFrame` seçeneği ve `"error"` stratejisi.
11. [MSW: server.use()](https://mswjs.io/docs/api/setup-server/use) *(doc)* — Çalışma anında handler ekleme ve kalıcılığı.
12. [Vitest: Mocking](https://vitest.dev/guide/mocking) *(doc)* — Zaman mock'lama ve `vi.useFakeTimers` ile `Date`'in değişmesi.
