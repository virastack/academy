---
title: "Suspense ve hata sınırları"
description: "Yükleme durumu, use ile Promise okuma ve hata sınırı."
lastVerified: "2026-10-21"
translationKey: "react/suspense-and-error-boundaries"
---

## Yükleme durumunu ağaçta tanımlamak

Her component'te `isLoading` state'i tutup spinner göstermek yerine React'e *"bu bölüm hazır olana kadar şunu göster"* dersiniz. Bu sınıra **Suspense boundary** denir:[^1]

```tsx
<Suspense fallback={<ProductSkeleton />}>
  <ProductDetails id={productId} />
</Suspense>
```

İçerideki herhangi bir component henüz hazır değilse React en yakın boundary'nin `fallback`'ini gösterir, hazır olunca içeriği açar. Bir boundary'yi şunlar bekletir:[^1]

- `lazy` ile yüklenen component kodu.
- `use` ile okunan bir Promise; Server Components'ten gelen veri ya da Suspense destekleyen bir framework ve kütüphane *(ör. TanStack Query'nin `useSuspenseQuery`'si)* dahil.
- `precedence` verilmiş bir stylesheet.

> [!WARNING]
>
> Suspense, Effect içinde çekilen veriyi **algılamaz**. `useEffect` + `setState` ile veri çekiyorsanız boundary hiçbir şey beklemez.[^1]

## use ile promise okumak

`use`, bir Promise'in değerini render sırasında okur. Promise bekliyorsa component *askıya alınır* ve Suspense devreye girer; reddedilirse en yakın Error Boundary'ye gider.[^2]

```tsx
import { Suspense, use } from "react";

const cache = new Map<string, Promise<Product>>();

export function fetchProduct(id: string) {
  let promise = cache.get(id);
  if (!promise) {
    promise = fetch(`/api/products/${id}`).then((r) => r.json() as Promise<Product>);
    cache.set(id, promise);
  }
  return promise;
}

function ProductDetails({ id }: { id: string }) {
  const product = use(fetchProduct(id));
  return <h1>{product.name}</h1>;
}
```

En önemli kural: Promise **cache'lenmeli**. Render içinde `use(fetch(...))` yazarsanız her render yeni bir Promise oluşturur ve fallback sürekli tekrar görünür.[^2]

Yukarıdaki `Map`, kuralı göstermek için yeterli ama gerçek bir cache değildir: hatalı isteği tekrar denemez, veriyi tazelemez, hiçbir şeyi silmez. React dokümanı da Promise'leri framework'ün ya da Suspense destekli bir kütüphanenin yönetmesini önerir.[^2][^1] Pratikte `use`'u çoğunlukla Next.js'te Server Component'in client component'e geçirdiği Promise'i okurken ya da bir kütüphanenin içinde görürsünüz.

## Boundary'ler nereye konur

Boundary'ler bir tasarım kararıdır. React dokümanının önerisi: her component'i ayrı ayrı sarmayın; kullanıcının görmesini beklediği yükleme sırasını tasarlayın ve boundary'leri ona göre yerleştirin.[^1]

```tsx
<Suspense fallback={<PageSkeleton />}>
  <ProductHeader id={id} />
  <ProductGallery id={id} />
  <Suspense fallback={<ReviewsSkeleton />}>
    <Reviews id={id} />
  </Suspense>
</Suspense>
```

Başlık ve galeri birlikte açılır; yorumlar daha yavaşsa sayfayı bekletmez, kendi iskeletini gösterir. Her parça ayrı bir boundary'de olsaydı ekran parça parça "patlayarak" dolardı *(popcorn UI)*.

**Waterfall'a dikkat.** React 19'da bir component askıya alındığında React fallback'i hemen gösterir, kardeşleri sonra hazırlar. [TkDodo](https://tkdodo.eu/), bu değişiklikle aynı boundary'deki kardeşlerin kendi verisini render sırasında başlattığı kodlarda isteklerin paralel değil sıralı gidebildiğini anlatıyor.[^3] React ekibinin önerisi aynı: veriyi component'in derininde değil, olabildiğince erken başlatın; route loader'da, sunucuda ya da ebeveynde.[^4]

**Zaten görünen içeriği gizlemeyin.** Kullanıcı bir sekmeye tıkladığında sayfanın yerini aniden iskelet alıyorsa güncellemeyi `startTransition` ile yapın; React eski içeriği gösterirken yenisini arka planda hazırlar. Router'lar navigasyonu zaten transition olarak yapar.[^1]

## Kod bölme: lazy

Bir component'i ancak gerektiğinde yüklemek için `lazy` kullanılır; yüklenirken en yakın Suspense'in fallback'i görünür:[^5]

```tsx
import { lazy, Suspense } from "react";

const SizeGuide = lazy(() => import("./SizeGuide.tsx"));

{isGuideOpen && (
  <Suspense fallback={<Spinner />}>
    <SizeGuide />
  </Suspense>
)}
```

`lazy` her zaman component dışında, modül seviyesinde çağrılır. Ne zaman bölmeye değdiğini [Bundle boyutu](/academy/performance-accessibility/bundle-size) dersi anlatıyor.

## Error Boundary

Render sırasında fırlatılan bir hata, bir **Error Boundary** yoksa tüm uygulamayı boş ekrana çevirir. Error Boundary bugün hâlâ yalnızca class component olarak yazılabilir; React dokümanı bunun yerine `react-error-boundary` paketini önerir.[^6]

```command
npm install react-error-boundary
```

```tsx
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary
  fallbackRender={({ resetErrorBoundary }) => (
    <div role="alert">
      <p>Product could not be loaded.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
  resetKeys={[productId]}
>
  <Suspense fallback={<ProductSkeleton />}>
    <ProductDetails id={productId} />
  </Suspense>
</ErrorBoundary>
```

`resetKeys` değiştiğinde *(kullanıcı başka ürüne geçtiğinde)* boundary kendini sıfırlar.[^7] Error Boundary'yi de Suspense gibi tasarıma göre yerleştirin: yorumlar hata verdiğinde ürün sayfası çökmemeli.

Error Boundary her hatayı yakalamaz. Event handler'larda ve render bittikten sonra çalışan asenkron kodda fırlatılan hatalar onun dışındadır.[^6] Bunları ya state'e yazıp gösterin ya da `useErrorBoundary`'nin `showBoundary` fonksiyonuyla boundary'ye iletin.[^7] [Kent C. Dodds](https://kentcdodds.com/) bu paketi ve `showBoundary` kalıbını ayrı bir yazıda anlatıyor.[^8] `startTransition` içindeki Action'larda fırlatılan hatalar ise istisnadır, Error Boundary'ye gider; bunu bir sonraki derste göreceksiniz.[^9]

> [!DONT]
>
> - JSX'i `try/catch` ile sarmak. Render hatası orada yakalanmaz; `eslint-plugin-react-hooks`'un `error-boundaries` kuralı bunu uyarır.[^10]

## Yalnızca tarayıcıda render

Server rendering kullanan bir uygulamada bazı component'ler sunucuda anlamlı bir şey üretemez *(`localStorage`, kullanıcının saat dilimi)*. React 19.3 bunun için `use(browser())` ekledi: component sunucuda askıya alınır, HTML'e en yakın Suspense'in fallback'i girer, tarayıcıda normal render olur. Eskiden kullanılan `mounted` state'i + Effect kalıbının yerini alır.[^11] Vite ile yazılan bir SPA'da sunucu render'ı olmadığı için buna ihtiyacınız olmaz.

## Kendin dene

- `ProductDetails`'te `use(fetchProduct(id))` yerine `use(fetch(...).then(...))` yazın ve ne olduğunu izleyin.
- Sahte API'ye 2 saniye gecikme ekleyin. Yorumları önce aynı boundary'de, sonra ayrı bir boundary'de deneyin.
- API'nin hata döndürmesini sağlayın; Error Boundary olmadan ve varken sayfayı karşılaştırın.
- "Tekrar dene" butonu neden hep aynı hatayı veriyor? *(İpucu: cache.)* Hatalı Promise'i cache'ten silen bir düzeltme yazın.

## Detaylı öğrenmek için

- **Resmi doküman:** `<Suspense>` referansı; boundary'leri birlikte ya da iç içe açmak, eski içeriği göstermek ve navigasyonda sıfırlamak.[^1]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun React 19'daki Suspense değişikliğini anlattığı "A Drama in 3 Acts" yazısı.[^3]
- **Video:** [Ricky Hanlon](https://github.com/rickhanlonii)'ın "Async React" konuşması; Suspense, transition ve optimistic state'in birlikte nasıl çalıştığı *(React Conf 2025, 1. gün)*.[^12]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un `react-error-boundary` yazısı.[^8]

## Kaynaklar

1. [React: Suspense](https://react.dev/reference/react/Suspense) *(doc)* — Suspense'i neyin etkinleştirdiği, Effect'teki verinin algılanmaması, boundary yerleşimi ve transition ile eski içeriği gösterme.
2. [React: use](https://react.dev/reference/react/use) *(doc)* — Promise okuma, cache'lenmemiş Promise uyarısı ve Error Boundary ile hata gösterme.
3. [TkDodo](https://tkdodo.eu/): [React 19 and Suspense - A Drama in 3 Acts](https://tkdodo.eu/blog/react-19-and-suspense-a-drama-in-3-acts) *(article)* — 16 Haziran 2024. Kardeşlerin önceden render edilmemesi ve paralel isteklerin sıralı hâle gelmesi.
4. [React: Build a React App from Scratch, Data Fetching](https://react.dev/learn/build-a-react-app-from-scratch#data-fetching) *(doc)* — Component içinde veri çekmenin waterfall'a yol açması; router loader'da ya da sunucuda önceden çekme önerisi.
5. [React: lazy](https://react.dev/reference/react/lazy) *(doc)* — Component kodunu ilk render'da yüklemek ve modül seviyesinde tanımlamak.
6. [React: Component, Catching rendering errors with an Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) *(doc)* — Error Boundary'nin class gerektirmesi, yakalamadığı hatalar ve `react-error-boundary` önerisi.
7. [react-error-boundary](https://github.com/bvaughn/react-error-boundary) *(repo)* — `fallbackRender`, `resetKeys` ve `useErrorBoundary`. Sürüm 6.1 ile kontrol edildi.
8. [Kent C. Dodds](https://kentcdodds.com/): [Use react-error-boundary to handle errors in React](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react) *(article)* — 20 Temmuz 2020. Paketin kullanımı ve event handler hatalarını boundary'ye iletmek.
9. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Transition içindeki hataların Error Boundary ile gösterilmesi.
10. [React: error-boundaries lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/error-boundaries) *(doc)* — Çocuk component hataları için `try/catch` yerine Error Boundary.
11. [React: browser](https://react.dev/reference/react-dom/browser) *(doc)* — React 19.3'teki `use(browser())`; sunucuda askıya alma ve Suspense şartı.
12. [Ricky Hanlon: Async React Part I (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=10907s) *(video)* — 1. gün yayını. Transition, Suspense ve optimistic güncellemelerle async bir arayüz.
