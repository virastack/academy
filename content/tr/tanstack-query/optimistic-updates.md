---
title: "Optimistic update"
description: "variables ve cache ile iyimser güncelleme, geri alma ve eşzamanlılık."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/optimistic-updates"
---

## Ne Zaman Gerekir

**Optimistic update**, mutation'ın başarılı olacağını varsayıp sonucu sunucudan cevap gelmeden göstermektir. Cevap gelince gerçek veriyle değiştirirsiniz; hata olursa geri alırsınız.[^1]

[TkDodo](https://tkdodo.eu/) bu tekniğin fazla kullanıldığını düşünür. Önerdiği iki koşul:[^2]

- Mutation **nadiren** başarısız olmalı. Geri alma kullanıcı için kötü bir deneyimdir.
- Anında geri bildirim **gerçekten** gerekmeli. Favori butonu, yapılacaklar kutucuğu gibi küçük değişiklikler iyi adaylardır.

Kapanan bir dialog ya da başka sayfaya yönlendiren bir form iyimser yapılırsa hata durumunda geri almak çok zordur. Sunucunun mantığını istemcide taklit etmek de kolay değildir: yeni eklenen kaydın id'si nereden gelecek, sıralı listede nereye girecek?[^2] Çoğu durumda butonu devre dışı bırakıp yükleme göstermek yeter.

Doküman iki yol önerir: arayüz üzerinden ve cache üzerinden.[^1]

## Arayüz Üzerinden: variables

En basit yol cache'e hiç dokunmamaktır. Mutation sürerken `variables` hâlâ elinizdedir; geçici bir satır olarak gösterirsiniz:[^1]

```tsx
function ReviewList({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const reviews = useQuery(reviewQueries.list(productId));

  const addReview = useMutation({
    mutationFn: (text: string) => postReview(productId, text),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: reviewQueries.list(productId).queryKey }),
  });

  return (
    <ul>
      {reviews.data?.map((review) => <li key={review.id}>{review.text}</li>)}
      {addReview.isPending && <li style={{ opacity: 0.5 }}>{addReview.variables}</li>}
      {addReview.isError && (
        <li>
          {addReview.variables}{" "}
          <button onClick={() => addReview.mutate(addReview.variables)}>Tekrar dene</button>
        </li>
      )}
    </ul>
  );
}
```

`onSettled` invalidation'ın Promise'ini döndürdüğü için mutation, yenilenen liste gelene kadar `pending` kalır. Böylece soluk satır kaybolduğu anda gerçek satır yerini alır. Hata olursa `variables` silinmez; "Tekrar dene" butonu aynı değeri yeniden gönderir.[^1] Geri alma kodu yazmanız gerekmez.

Mutation ile liste farklı component'lerdeyse mutation'a bir `mutationKey` verin ve listede `useMutationState` ile okuyun:[^1]

```ts
const pendingReviews = useMutationState({
  filters: { mutationKey: ["add-review", productId], status: "pending" },
  select: (mutation) => mutation.state.variables as string,
});
```

`useMutationState` bir dizi döndürür; aynı anda birden fazla yorum gönderiliyor olabilir.[^1]

## Cache Üzerinden: onMutate

İyimser değer ekranın birden fazla yerinde görünecekse *(liste, sayaç, detay)* cache'i doğrudan güncelleyin. Kalıp dört adımdır:[^1]

```ts
useMutation({
  mutationFn: toggleFavorite,
  onMutate: async (productId: number, context) => {
    const queryKey = productQueries.detail(productId).queryKey;

    // 1. Uçuştaki istekleri iptal et; iyimser değerin üstüne yazmasınlar
    await context.client.cancelQueries({ queryKey });

    // 2. Geri almak için şimdiki değeri sakla
    const previous = context.client.getQueryData(queryKey);

    // 3. İyimser değeri yaz
    context.client.setQueryData(queryKey, (old) =>
      old ? { ...old, isFavorite: !old.isFavorite } : old,
    );

    return { previous, queryKey };
  },
  // 4a. Hata olursa geri al
  onError: (_error, _productId, onMutateResult, context) => {
    if (onMutateResult) {
      context.client.setQueryData(onMutateResult.queryKey, onMutateResult.previous);
    }
  },
  // 4b. Her durumda sunucuyla eşitle
  onSettled: (_data, _error, productId, _onMutateResult, context) =>
    context.client.invalidateQueries({ queryKey: productQueries.detail(productId).queryKey }),
});
```

`onMutate`'in döndürdüğü nesne diğer callback'lere `onMutateResult` olarak gelir. `context.client` aynı `QueryClient`'tır; component içinde `useQueryClient()` çağırmanıza gerek kalmaz.[^1][^3] `queryOptions`'tan gelen anahtarı kullandığınız için `getQueryData` ve `setQueryData`'nın tipi de doğru çıkar.

## İki Yolun Karşılaştırması

| | `variables` ile | Cache ile |
| :-- | :-- | :-- |
| Kod miktarı | Az | Fazla |
| Geri alma | Gerekmez | `onError`'da elle |
| İyimser değer nerede görünür | Yalnızca mutation'ı okuyan yerde | Sorguyu kullanan her yerde |
| Ne zaman | Değer tek bir yerde görünüyorsa | Birden fazla ekran parçası etkileniyorsa |

Doküman da aynı sonuca varır: tek bir yer için `variables`, birden fazla yer için cache.[^1]

## Eşzamanlı Mutation'lar

Kullanıcı favori butonuna art arda üç kez basarsa üç mutation aynı anda çalışır. TkDodo burada bir **tutarsızlık penceresi** tarif eder: ilk mutation bitip invalidation başlattığında, ikinci mutation henüz bitmemişse ve yenileme ondan hızlı gelirse arayüz bir anlığına eski değere döner.[^4]

İki önlem bu titremeyi giderir:[^4]

- `onMutate`'te `cancelQueries`: mutation başladığında uçuştaki sorgular iptal edilir.
- `onSettled`'da yalnızca **son** mutation invalidation yapar. Kendi mutation'ınız hâlâ sayıldığı için kontrol `=== 1` ile yapılır:

```ts
useMutation({
  mutationKey: ["toggle-favorite"],
  mutationFn: toggleFavorite,
  onSettled: (_data, _error, productId, _onMutateResult, context) => {
    if (context.client.isMutating({ mutationKey: ["toggle-favorite"] }) === 1) {
      return context.client.invalidateQueries({
        queryKey: productQueries.detail(productId).queryKey,
      });
    }
  },
});
```

Bu kontrolü `useIsMutating` hook'u ile değil, `isMutating` ile o anda yapın; hook'un değeri callback'te eski kalabilir.[^4]

## React'in useOptimistic'i ile Farkı

React 19'un `useOptimistic`'i bir Action süresince React state'ine geçici değer yazar *(bkz. [Actions ve async güncellemeler](/academy/react/actions))*. Server state'iniz TanStack Query cache'indeyse iyimser değeri de orada tutun; aynı verinin iki ayrı iyimser kopyası senkron dışı kalabilir.

## Kendin Dene

- Favori butonunu önce iyimser olmadan yazın ve API'ye 1 saniye gecikme ekleyin. Butona basınca ne hissediyorsunuz?
- `variables` yolunu bir yorum listesine uygulayın. API'yi her üçüncü istekte hata verecek şekilde değiştirin ve "Tekrar dene"yi deneyin.
- Cache yolunu kurun, `cancelQueries` satırını silin. Sekmeye dönüp hemen butona basarak titremeyi yakalamaya çalışın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Optimistic Updates"; `variables`, `useMutationState` ve cache ile geri alma örnekleri.[^1]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Concurrent Optimistic Updates in React Query"; tutarsızlık penceresi, iptal ve sınırlı invalidation.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Mastering Mutations in React Query"; iyimser güncellemenin ne zaman gerekmediği.[^2]

## Kaynaklar

1. [TanStack Query: Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) *(doc)* — Arayüz ve cache yolu, `useMutationState`, geri alma ve hangisinin ne zaman kullanılacağı.
2. [TkDodo](https://tkdodo.eu/): [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) *(article)* — 9 Ekim 2021. İyimser güncellemenin fazla kullanılması ve zor geri alınan durumlar.
3. [TanStack Query: Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) *(doc)* — Callback imzaları, `onMutateResult` ve `context.client`.
4. [TkDodo](https://tkdodo.eu/): [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) *(article)* — 28 Nisan 2025. Tutarsızlık penceresi, `cancelQueries` ve `isMutating` ile sınırlı invalidation.
