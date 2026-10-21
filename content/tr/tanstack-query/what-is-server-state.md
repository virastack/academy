---
title: "Server state nedir"
description: "Sunucu verisi ile client state farkı, useEffect ile veri çekmenin hataları ve TanStack Query'nin ne zaman gerekmediği."
lastVerified: "2026-10-21"
translationKey: "tanstack-query/what-is-server-state"
---

## Bu Rehber Ne Anlatıyor

[!tanstack-query] dokümanı İngilizce ve kapsamlı. Bu rehber onu tekrar etmiyor. Her derste konuyu kısaca özetleyip kütüphanenin maintainer'larının önerilerini ve yaygın hataları topluyor. Sürüm: TanStack Query v5.104 *(Ekim 2026)*. React 18 ve sonrasıyla çalışır.[^1][^2]

Ön koşul, [React](/academy/react) rehberindeki [State](/academy/react/state) ve [Effect](/academy/react/effects) dersleri. Örnekler Vite ile kurulmuş bir React projesinde ilerler; Next.js'e özgü kısım [Next.js ile prefetch](/academy/tanstack-query/prefetch-with-nextjs) dersinde.

> [!NOTE]
>
> Kütüphanenin eski adı **React Query**. Blog yazılarında ve konuşmalarda iki ad da geçer; aynı kütüphaneden söz edilir.[^1]

## Server State Nedir

Bir component'in ekranda gösterdiği verinin iki kaynağı olabilir. **Client state** yalnızca tarayıcıda yaşar: modal açık mı, hangi sekme seçili. **Server state** ise başka bir yerde durur ve siz onun yalnızca bir kopyasını görürsünüz. Doküman server state'i dört özellikle tanımlar:[^1]

- Sizin kontrol etmediğiniz bir yerde saklanır.
- Okumak ve yazmak için asenkron API gerekir.
- Başkaları da değiştirebilir; siz haberdar olmazsınız.
- Dikkat etmezseniz uygulamanızdaki kopyası eskir.

Sepetteki ürün sayısı client state'tir. Ürünün stok adedi server state'tir: siz sayfaya bakarken başka bir müşteri son ürünü satın alabilir.

## useEffect ile Veri Çekmek Neden Yetmez

İlk akla gelen çözüm `useEffect` içinde `fetch`'tir:

```tsx
function ProductList({ category }: { category: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`/api/products?category=${category}`)
      .then((response) => response.json())
      .then((data) => setProducts(data));
  }, [category]);

  return <ul>{products.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

TanStack Query'nin ana maintainer'ı [Dominik Dorfmeister](https://tkdodo.eu/) *(TkDodo)*, bu kalıptaki on satırda beş hata sayar:[^3]

| Hata | Ne olur |
| :-- | :-- |
| Yarış durumu *(race condition)* | Kategori hızlı değişince geç gelen eski cevap yenisinin üstüne yazar |
| Yükleme durumu yok | Kullanıcı istek sürerken hiçbir şey görmez |
| Boş durum belirsiz | `[]` ile başlamak "henüz veri yok" ile "hiç ürün yok"u ayırt ettirmez |
| Eski veri ve hata kalır | Kategori değişince önceki kategorinin hatası ya da verisi ekranda kalır |
| Strict Mode'da iki istek | Geliştirmede Effect iki kez çalışır |

Hepsini düzeltmek için cleanup'ta bir `ignore` bayrağı, ayrı `isLoading` ve `error` state'leri ve kategori değişince sıfırlama gerekir. React dokümanı da Effect içinde veri çekmeyi tarif ederken bu yüzden bir framework'ü ya da bir veri kütüphanesini önerir.[^4] TkDodo sonucu tek cümleyle özetler: *"Veri çekmek kolay. Asenkron state yönetimi değil."*[^3]

## TanStack Query Ne Yapar

TanStack Query bir veri çekme kütüphanesi değildir; `fetch`'i yine siz yazarsınız. Kütüphane, o `fetch`'in sonucunu bir **anahtarla** cache'ler ve uygulamanın her yerinde tutarlı biçimde paylaşır:[^1][^3]

```tsx
import { useQuery } from "@tanstack/react-query";

function ProductList({ category }: { category: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      const response = await fetch(`/api/products?category=${category}`);
      if (!response.ok) throw new Error("Products could not be loaded");
      return response.json() as Promise<Product[]>;
    },
  });

  if (isPending) return <p>Yükleniyor...</p>;
  if (error) return <p>Hata: {error.message}</p>;

  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Yukarıdaki beş hata burada yok. Veri anahtara *(`category`)* göre saklandığı için yarış durumu oluşmaz; yükleme ve hata durumu hazır gelir; aynı anahtara giden istekler, Strict Mode'unki dahil, tek isteğe indirilir.[^3] Bunlara ek olarak kütüphane şunları da üstlenir:[^1]

- Aynı veriyi isteyen birden fazla component'i tek isteğe indirmek.
- Eskiyen veriyi arka planda yenilemek *(sekmeye dönünce, internet geri gelince)*.
- Kullanılmayan veriyi bir süre sonra bellekten silmek.
- Sayfalama, sonsuz liste ve iyimser güncelleme gibi kalıplar.

## Client State Nerede Kalır

TanStack Query bir **server state** kütüphanesidir. Redux ya da [!zustand] gibi client state kütüphanelerinin yerini almaz, onlarla birlikte çalışır. Doküman bir örnekle gösterir: global store'daki `projects`, `teams`, `tasks` ve `users` TanStack Query'ye taşındığında geriye çoğu zaman yalnızca `themeMode` ve `sidebarStatus` kalır.[^5]

| Veri | Örnek | Nerede |
| :-- | :-- | :-- |
| Server state | Ürün listesi, sipariş, kullanıcı profili | TanStack Query |
| Paylaşılan client state | Tema, sepet çekmecesi açık mı | Context ya da [Zustand](/academy/zustand) |
| Yerel UI state | Input değeri, açık menü | `useState` |
| URL state | Arama metni, sayfa numarası | Router'ın search params'ı |

TkDodo'nun kuralı: sunucudan gelen veriyi client state'e kopyalamayın. Kopyaladığınız an arka plandaki güncellemeleri kaçırırsınız ve iki gerçeği senkron tutmaya çalışırsınız.[^6] TanStack'in yaratıcısı [Tanner Linsley](https://github.com/tannerlinsley) da React Summit 2020 konuşmasında aynı noktadan başlar: global store'ların büyük kısmı aslında sunucu verisinin cache'idir.[^7]

## Ne Zaman Gerekmez

Next.js App Router gibi Server Component destekli bir framework'te veri çoğunlukla sunucuda okunur. TkDodo bu durumda açık konuşur: veri çekme ve mutation için olgun bir çözümü olan bir framework'le yeni başlıyorsanız muhtemelen TanStack Query'ye ihtiyacınız yok.[^8] Doküman da aynı öneriyi yapar: framework'ün sunduğuyla başlayın, ihtiyaç doğana kadar eklemeyin.[^9]

Kütüphane şu durumlarda hâlâ değerlidir:[^8]

- Yalnızca tarayıcıda çalışan bir SPA *(panel, iç araç)*.
- İlk sayfası sunucuda, sonraki sayfaları istemcide yüklenen sonsuz listeler.
- Polling, odaklanınca yenileme, offline çalışma gibi sürekli güncel veri isteyen ekranlar.
- React Native ya da Server Component kullanmayan projeler.

Boyut endişesi için TkDodo'nun ölçümü: `QueryClient`, `QueryClientProvider`, `useQuery` ve `useMutation` ile 10 kB'ın altında *(minify + gzip)*. npm sayfasında gördüğünüz boyut kaynak kodu ve source map'leri de içerir, tarayıcıya gitmez.[^10]

## Kendin Dene

- Yukarıdaki `useEffect` örneğinde kategoriyi hızlıca değiştirin ve DevTools'un Network sekmesinde cevapların sırasını izleyin. Ekranda hangi kategori kalıyor?
- Aynı component'i `useQuery` ile yazın ve aynı denemeyi tekrarlayın.
- Kendi projenizdeki global store'u açın. Hangi alanlar aslında sunucu verisinin kopyası?

## Detaylı Öğrenmek İçin

- **Yazı:** [TkDodo](https://tkdodo.eu/), "Why You Want React Query"; `useEffect` ile veri çekmenin beş hatası ve TanStack Query karşılığı.[^3]
- **Video:** [Tanner Linsley](https://github.com/tannerlinsley), "React Query: It's Time to Break up with your Global State!"; kütüphaneyi tanıtan React Summit 2020 konuşması.[^7]
- **Video:** [TkDodo](https://tkdodo.eu/), "React Query - The Bad Parts"; boyut, normalized cache eksikliği ve öğrenme eğrisi üzerine dürüst bir değerlendirme.[^10]
- **Yazı:** [TkDodo](https://tkdodo.eu/), "You Might Not Need React Query"; Server Component'lerden sonra kütüphanenin yeri.[^8]

## Kaynaklar

1. [TanStack Query: Overview](https://tanstack.com/query/latest/docs/framework/react/overview) *(doc)* — Server state'in özellikleri ve kütüphanenin çözdüğü sorunlar.
2. [TanStack Query: Installation](https://tanstack.com/query/latest/docs/framework/react/installation) *(doc)* — Paket kurulumu, React 18+ uyumluluğu ve tarayıcı desteği.
3. [TkDodo](https://tkdodo.eu/): [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query) *(article)* — 7 Kasım 2023. `useEffect` ile veri çekmenin beş hatası ve "async state manager" tanımı.
4. [React: useEffect](https://react.dev/reference/react/useEffect#fetching-data-with-effects) *(doc)* — Effect içinde veri çekme, yarış durumu ve framework ya da kütüphane önerisi.
5. [TanStack Query: Does TanStack Query replace Redux, MobX or other global state managers?](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state) *(doc)* — Server state taşındıktan sonra global store'da kalanlar.
6. [TkDodo](https://tkdodo.eu/): [Practical React Query](https://tkdodo.eu/blog/practical-react-query) *(article)* — 16 Kasım 2020. Client state ile server state'i ayrı tutmak ve varsayılanlar.
7. [Tanner Linsley](https://github.com/tannerlinsley): [React Query: It's Time to Break up with your Global State!](https://gitnation.com/contents/react-query-its-time-to-break-up-with-your-global-state) *(video)* — React Summit Remote Edition, Nisan 2020.
8. [TkDodo](https://tkdodo.eu/): [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query) *(article)* — 20 Mayıs 2023. Server Component'ler ve hibrit kullanım.
9. [TanStack Query: Advanced Server Rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) *(doc)* — Server Component'li yeni projelerde önce framework'ün araçlarıyla başlama önerisi.
10. [TkDodo](https://tkdodo.eu/): [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts) *(video)* — React Day Berlin, Aralık 2024. Boyut, normalized cache ve öğrenme eğrisi.
