---
title: "Kurulum ve devtools"
description: "QueryClient, şaşırtan varsayılanlar, Devtools ve ESLint eklentisi."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/setup-and-devtools"
---

## Kurulum

[React](/academy/react/setup-and-tooling) rehberindeki gibi bir [!vite] projesi açın ve paketi ekleyin:[^1]

```command
npm install @tanstack/react-query
```

Paket React 18 ve sonrasıyla çalışır. TypeScript tarafında son iki yılda çıkan sürümleri destekler; şu an TypeScript 5.7 ve sonrası.[^1][^2]

## QueryClient ve provider

Cache, bir `QueryClient` örneğinin içinde yaşar. Bu örneği uygulamanın tepesinde `QueryClientProvider` ile verirsiniz; altındaki her component aynı cache'e erişir:[^1]

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

`QueryClient`'ı component'in dışında oluşturun. Component içinde `new QueryClient()` yazarsanız her render'da cache sıfırlanır. Component içinde oluşturmanız gerekiyorsa *(ör. testler, sunucu)* `useState(() => new QueryClient())` kullanın.[^3]

> [!DONT]
>
> - Provider'ı Context gibi düşünüp her sayfaya ayrı bir `QueryClientProvider` koymak. Uygulamada tek bir `QueryClient` olur; cache'i tüm sayfalar paylaşır.[^3]

## Şaşırtan varsayılanlar

TanStack Query hiçbir ayar yapmadan çalışır ama varsayılanları **veriyi güncel tutmaya** göre seçilmiştir, istek sayısını azaltmaya göre değil.[^4][^5] İlk kullanımda şaşırtan davranışların çoğu bunlardan gelir:[^4]

| Varsayılan | Değer | Ne demek |
| :-- | :-- | :-- |
| `staleTime` | `0` | Cache'teki veri hemen "eski" sayılır |
| Otomatik yenileme | Mount, sekmeye dönüş, internet geri gelince | Eski veri bu anlarda arka planda yenilenir |
| `gcTime` | 5 dakika | Hiçbir component kullanmayan veri 5 dakika sonra silinir |
| `retry` | 3, artan bekleme ile | Hata ekranı gösterilmeden önce istek 3 kez daha denenir |
| Structural sharing | Açık | Veri değişmediyse aynı referans korunur |

[TkDodo](https://tkdodo.eu/)'nun hatırlattığı ilk nokta: `staleTime: 0` olsa bile `queryFn` her render'da çalışmaz. Beklemediğiniz bir istek gördüyseniz büyük ihtimalle sekmeye geri döndünüz.[^5] Geliştirirken DevTools ile uygulama arasında gidip gelmek de sekme değişikliği sayılır. v5'ten beri yalnızca `visibilitychange` olayı dinlendiği için bu eskisinden daha seyrektir.[^5]

İkinci nokta: hata ekranı üç tekrar bitene kadar gelmez. Geliştirirken "hata neden geç görünüyor" sorusunun cevabı budur.[^4] Testlerde `retry: false` ayarı için [Provider ve hook testi](/academy/vitest/provider-and-hook) dersine bakın.

Varsayılanları tüm uygulama için `defaultOptions` ile değiştirirsiniz. En sık değiştirilen `staleTime`'dır:[^4][^6]

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 dakika boyunca istek atma
    },
  },
});
```

`staleTime` ve `gcTime` farkı [Cache ve stale time](/academy/tanstack-query/cache-and-stale-time) dersinin konusu.

## Devtools

Devtools ayrı bir pakettir. Cache'teki her sorguyu, anahtarını, durumunu ve verisini gösterir; mutation'ları da izler:[^7]

```command
npm install @tanstack/react-query-devtools
```

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>;
```

Ekranın köşesine bir TanStack logosu gelir; tıklayınca panel açılır. Panel yalnızca `NODE_ENV === "development"` olduğunda bundle'a girer; production build'den kendiliğinden çıkar.[^7] Chrome, Firefox ve Edge için aynı paneli tarayıcının DevTools'una ekleyen eklentiler de var.[^7]

TkDodo Devtools'u öğrenmenin en hızlı yolu olarak önerir: bir sorgunun ne zaman `fresh`, ne zaman `stale`, ne zaman `inactive` olduğunu canlı görürsünüz.[^6] Panelden bir sorguyu elle yenileyebilir, geçersiz kılabilir ya da hata durumuna sokabilirsiniz.

## ESLint eklentisi

Doküman kurulumla birlikte resmi lint eklentisini de önerir. Gözden kaçan hataların çoğunu yazarken yakalar:[^1][^8]

```command
npm install -D @tanstack/eslint-plugin-query
```

```js
// eslint.config.js
import pluginQuery from "@tanstack/eslint-plugin-query";

export default [
  ...pluginQuery.configs["flat/recommended"],
  // diğer ayarlar
];
```

`recommended` setindeki kurallar:[^8][^9]

| Kural | Neyi yakalar |
| :-- | :-- |
| `exhaustive-deps` | `queryFn`'in kullandığı ama `queryKey`'e eklenmemiş değişken |
| `stable-query-client` | Her render'da yeniden oluşturulan `QueryClient` |
| `no-rest-destructuring` | `const { data, ...rest } = useQuery()`; render optimizasyonunu bozar |
| `no-unstable-deps` | `useQuery` sonucunu olduğu gibi bir hook'un bağımlılık dizisine koymak |
| `no-void-query-fn` | Değer döndürmeyen `queryFn` |
| `infinite-query-property-order`, `mutation-property-order` | Tip çıkarımını bozan seçenek sırası |

`flat/recommended-strict` buna `prefer-query-options` kuralını ekler; sorgu ayarlarını `queryOptions` ile yazmaya zorlar.[^8]

Vite şablonu ESLint yerine [Oxlint](https://oxc.rs) ve bir `.oxlintrc.json` ile gelir. Eklenti Oxlint'in JS plugin desteğiyle de çalışır; bu destek şu an alfa aşamasında. JSON dosyası eklentinin hazır setini içe aktaramaz, kuralları tek tek yazarsınız:[^8]

```json
// .oxlintrc.json
{
  "plugins": ["react", "typescript", "oxc"],
  "jsPlugins": ["@tanstack/eslint-plugin-query"],
  "rules": {
    "react/rules-of-hooks": "error",
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/stable-query-client": "error",
    "@tanstack/query/no-rest-destructuring": "warn",
    "@tanstack/query/no-unstable-deps": "error",
    "@tanstack/query/infinite-query-property-order": "error",
    "@tanstack/query/mutation-property-order": "error"
  }
}
```

`no-void-query-fn` tip bilgisine ihtiyaç duyar; Oxlint bunu JS eklentilerine henüz vermediği için listede yok.[^8]

## Sürümü sabitlemek

Tip düzeltmeleri **patch** sürümlerinde çıkar; doküman bunları kırıcı değişiklik saymaz. Bu yüzden paketi belirli bir patch sürümüne sabitlemeyi ve güncellerken tiplerin değişebileceğini beklemeyi önerir.[^2] Lock dosyası *(`package-lock.json`, `pnpm-lock.yaml`)* commit'lenmişse bu zaten sağlanır.

## Kendin dene

- `QueryClient`'ı `App` component'inin içine taşıyın. ESLint ya da Oxlint hangi kuralla uyarıyor?
- Bir sorgu yazın ve Devtools'u açın. Başka bir sekmeye geçip dönün; sorgunun durumu nasıl değişiyor?
- `queryFn`'i her zaman hata fırlatan bir fonksiyona çevirin. Hata ekranı kaç saniye sonra geliyor? `retry: false` ile tekrar deneyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Important Defaults"; her varsayılanın nasıl değiştirileceği ve `staleTime: 'static'` ile `Infinity` farkı.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Practical React Query"; varsayılanların açıklaması, Devtools ve custom hook önerisi.[^6]
- **Resmi doküman:** "ESLint Plugin Query"; her kuralın doğru ve yanlış örnekleri.[^8]

## Kaynaklar

1. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Paket kurulumu, React 18+ uyumluluğu ve ESLint eklentisi önerisi.
2. [TanStack Query: TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript) *(doc)* — Desteklenen TypeScript sürümleri ve sürümü patch seviyesinde sabitleme önerisi.
3. [TanStack Query: stable-query-client](https://tanstack.com/query/latest/docs/eslint/stable-query-client) *(doc)* — `QueryClient`'ı render dışında ya da `useState` ile oluşturmak.
4. [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) *(doc)* — `staleTime`, `gcTime`, `retry`, otomatik yenileme ve structural sharing.
5. [TkDodo](https://tkdodo.eu/): [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager) *(article)* — 20 Ağustos 2021. Stale-while-revalidate ve yenilemenin tetiklendiği anlar.
6. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — 16 Kasım 2020. Varsayılanların açıklaması, `staleTime` ve `gcTime` farkı, Devtools.
7. [TanStack Query: Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools) *(doc)* — Kurulum, floating ve embedded mod, production'da yükleme ve tarayıcı eklentileri.
8. [TanStack Query: ESLint Plugin Query](https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query) *(doc)* — Flat config, strict set ve Oxlint kurulumu.
9. [TanStack Query: no-rest-destructuring](https://tanstack.com/query/latest/docs/eslint/no-rest-destructuring) *(doc)* — Rest destructuring'in izlenen property optimizasyonunu bozması.
