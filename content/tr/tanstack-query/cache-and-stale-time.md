---
title: "Cache ve stale time"
description: "Stale-while-revalidate, staleTime ile gcTime farkı, yenileme tetikleyicileri, polling, initialData ve placeholderData."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/cache-and-stale-time"
---

## Stale-While-Revalidate

TanStack Query'nin cache modeli HTTP'deki **stale-while-revalidate** fikrine dayanır: elinizde veri varsa, eski olsa bile hemen gösterin; arka planda yenisini getirin, gelince değiştirin.[^1] Kullanıcı yükleme ekranı yerine son bilinen veriyi görür, ekran birkaç yüz milisaniye sonra kendiliğinden güncellenir.

Bunu iki ayar yönetir: verinin ne zaman eskidiğini söyleyen `staleTime` ve kullanılmayan verinin ne zaman silineceğini söyleyen `gcTime`.

## staleTime ve gcTime

| Ayar | Varsayılan | Ne zaman devreye girer | Sonuç |
| :-- | :-- | :-- | :-- |
| `staleTime` | `0` | Veri geldikten sonra | Süre dolana kadar veri **taze**; süre dolunca **eski** |
| `gcTime` | 5 dakika | Son component kaldırıldıktan sonra | Süre dolunca veri bellekten silinir |

[TkDodo](https://tkdodo.eu/)'nun özeti: veri tazeyken **her zaman yalnızca cache'ten** gelir, ağa istek gitmez. Eskiyse yine cache'ten gelir ama belirli anlarda arka planda yenilenir.[^1][^2] `gcTime`'a nadiren dokunursunuz; değiştirmek istediğiniz neredeyse her zaman `staleTime`'dır.[^2] `gcTime` v5'ten önce `cacheTime` adını taşıyordu; eski yazılarda bu adı görürsünüz.[^2]

Bir sorgunun hayatı, doküman örneğinin kısaltılmış haliyle:[^3]

1. `["products"]` kullanan bir component açılır. Cache boştur; yükleme gösterilir, istek atılır, sonuç cache'e yazılır.
2. Aynı anahtarı kullanan ikinci bir component açılır. Veri cache'ten **anında** gelir. `staleTime: 0` olduğu için arka planda bir istek daha atılır.
3. İki component de kapanır. Sorgu **inactive** olur ve 5 dakikalık `gcTime` sayacı başlar.
4. 5 dakika dolmadan component tekrar açılırsa veri cache'ten gelir, arka planda yenilenir.
5. 5 dakika içinde kimse kullanmazsa veri silinir. Sonraki açılış yükleme ekranıyla başlar.

## staleTime Seçmek

`staleTime: 0` varsayılanı veriyi güncel tutmaya göre seçilmiştir, istek sayısına göre değil. İlk kez kullanan herkesin sorduğu soru budur: *"Veriyi iki saniye önce çektim, neden yine istek gidiyor?"*[^1] Cevap koşullu açılan ikinci bir component'tir; kütüphane onu yeni bir mount olarak görür ve eski veriyi yeniler.

Çözüm otomatik yenilemeyi kapatmak ya da veriyi props'la taşımak değil, verinin ne kadar süre geçerli sayılacağını söylemektir:[^1]

```ts
// Tüm uygulama için
new QueryClient({
  defaultOptions: { queries: { staleTime: 30 * 1000 } },
});

// Bir sorgu için
queryOptions({
  queryKey: ["categories"],
  queryFn: fetchCategories,
  staleTime: 10 * 60 * 1000, // kategoriler nadiren değişir
});
```

Kaba bir rehber:

| Veri | Örnek `staleTime` |
| :-- | :-- |
| Saniyeler içinde değişir *(stok, sohbet)* | `0` ya da birkaç saniye |
| Dakikalar içinde değişir *(ürün listesi)* | 30 saniye ile birkaç dakika |
| Neredeyse hiç değişmez *(kategori, ülke listesi)* | `Infinity` |
| Uygulama açıkken asla değişmez *(açılışta gelen feature flag, yetkiler)* | `'static'` |

`Infinity` ile `'static'` arasında bir fark var: `Infinity` olan bir sorgu `invalidateQueries` ile yine yenilenir; `'static'` olan yenilenmez.[^4]

## Yenileme Ne Zaman Olur

Eski bir sorgu üç anda arka planda yenilenir:[^4]

| Tetikleyici | Ayar | Anlamı |
| :-- | :-- | :-- |
| Yeni bir component sorguyu kullanmaya başlar | `refetchOnMount` | Ekrana yeni gelen veri güncel olsun |
| Kullanıcı sekmeye geri döner | `refetchOnWindowFocus` | E-postasından dönen kullanıcı güncel veri görsün |
| İnternet bağlantısı geri gelir | `refetchOnReconnect` | Kopukluk sırasında değişeni yakala |

TkDodo'nun en sevdiği tetikleyici sekmeye dönüştür. Geliştirirken "fazla" görünür çünkü sürekli sekme değiştirirsiniz; production'da ise uzun süre başka sekmede kalmış bir kullanıcının dönüşüdür.[^1] Bu bayrakları kapatmak yerine `staleTime` ile ayarlamak önerilen yoldur.[^4]

Veriyi düzenli aralıklarla yenilemek için `refetchInterval` kullanın. Bu ayar `staleTime`'dan bağımsız çalışır:[^4][^5]

```ts
useQuery({
  ...orderQueries.status(orderId),
  // sipariş teslim edilene kadar her 5 saniyede bir
  refetchInterval: (query) =>
    query.state.data?.status === "delivered" ? false : 5000,
});
```

`false` döndürmek polling'i durdurur. Sekme arka plana geçince polling de varsayılan olarak durur; arka planda da sürmesi için `refetchIntervalInBackground: true` verin.[^5]

## initialData ve placeholderData

Bazen sorgu açıldığında elinizde gösterilecek bir şey vardır. İki seçenek farklı davranır:[^6][^7]

| | `initialData` | `placeholderData` |
| :-- | :-- | :-- |
| Cache'e yazılır mı | Evet; gerçek veri sayılır | Hayır; yalnızca o component görür |
| `staleTime`'a uyar mı | Evet; tazeyse istek atılmaz | Hayır; her zaman gerçek veri istenir |
| Arka plan hatasında | Veri kalır, `error` dolar | Veri kaybolur, `data` `undefined` olur |
| Ne için | Başka bir sorgudan gelen gerçek veri | Gerçek veri gelene kadar gösterilecek iskelet ya da önceki sonuç |

TkDodo'nun tercihi: bir sorguyu başka bir sorgudan doldururken `initialData`, diğer her şey için `placeholderData`.[^7] Ürün listesinden detay sayfasına geçerken liste verisini başlangıç olarak kullanmak tipik bir örnek:[^6]

```ts
const queryClient = useQueryClient();

useQuery({
  ...productQueries.detail(id),
  initialData: () =>
    queryClient
      .getQueryData(productQueries.list(category).queryKey)
      ?.find((product) => product.id === id),
  initialDataUpdatedAt: () =>
    queryClient.getQueryState(productQueries.list(category).queryKey)?.dataUpdatedAt,
});
```

`initialDataUpdatedAt`, başlangıç verisinin ne zaman çekildiğini söyler. Liste `staleTime`'dan eskiyse detay arka planda yenilenir; yoksa istek atılmaz.[^6] `placeholderData`'nın sayfalamadaki kullanımı [Sayfalama ve sonsuz liste](/academy/tanstack-query/pagination-and-infinite-lists) dersinde.

## Kendin Dene

- `staleTime: 0` ile bir listeyi açın, başka bir sayfaya gidip geri dönün. Devtools'ta sorgu hangi durumlardan geçiyor?
- Aynı denemeyi `staleTime: 60 * 1000` ile tekrarlayın. Network sekmesinde fark ne?
- Bir component'i kapatın ve Devtools'ta sorgunun `inactive` olduğunu görün. `gcTime: 5000` verip 5 saniye sonra ne olduğuna bakın.
- Bir sipariş durumu ekranına `refetchInterval` ekleyin. Sahte API üçüncü istekte `delivered` dönsün; polling duruyor mu?

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "React Query as a State Manager"; stale-while-revalidate, akıllı yenilemeler ve `staleTime` ayarlamak.[^1]
- **Resmi doküman:** "Caching Examples"; bir sorgunun mount, inactive ve garbage collection adımları.[^3]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "Placeholder and Initial Data in React Query"; iki seçeneğin cache ve observer düzeyindeki farkı.[^7]

## Kaynaklar

1. [TkDodo](https://tkdodo.eu/): [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager) *(article)* — 20 Ağustos 2021. Stale-while-revalidate, yenileme tetikleyicileri ve `staleTime`.
2. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — 16 Kasım 2020. `staleTime` ve `gcTime` farkı, `cacheTime`'ın yeni adı.
3. [TanStack Query: Caching Examples](https://tanstack.com/query/latest/docs/framework/react/guides/caching) *(doc)* — Bir sorgunun adım adım cache yaşam döngüsü.
4. [TanStack Query: Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults) *(doc)* — Varsayılan değerler, `'static'` ile `Infinity` farkı ve `refetchInterval`.
5. [TanStack Query: Polling](https://tanstack.com/query/latest/docs/framework/react/guides/polling) *(doc)* — `refetchInterval` ve arka planda yenileme.
6. [TanStack Query: Initial Query Data](https://tanstack.com/query/latest/docs/framework/react/guides/initial-query-data) *(doc)* — `initialData`, `staleTime` ve cache'ten başlangıç verisi ile `initialDataUpdatedAt`.
7. [TkDodo](https://tkdodo.eu/): [Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query) *(article)* — 9 Ağustos 2021. Cache ve observer düzeyi, arka plan hataları ve hangisinin ne zaman kullanılacağı.
