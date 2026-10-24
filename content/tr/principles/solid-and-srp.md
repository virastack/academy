---
title: "SOLID ve SRP"
description: "Sorumlulukların ayrılması ve bağımlılık yönetimi, React örnekleriyle."
lastVerified: "2026-10-23"
translationKey: "principles/solid-and-srp"
---

SOLID, nesne yönelimli tasarımdan gelen beş prensip. Frontend geliştirici olarak sınıf yazmıyor olabilirsiniz, ama fikirler [!react] component'lerine ve hook'larına da uyuyor. Bu rehber en çok işe yarayan ikisine odaklanıyor: SRP ve DIP.

## SOLID bir bakışta

[Robert C. Martin](https://blog.cleancoder.com) bu ilkelerin bugün de geçerli olduğunu savunuyor.[^1] Aşağıdaki tablo her birini tek cümleyle özetliyor.

| Harf | İlke | Kısaca |
| --- | --- | --- |
| **S** | Single Responsibility | Bir fonksiyonun, sınıfın ya da component'in yalnızca tek bir sorumluluğu, yani değişmek için tek bir nedeni olmalıdır[^2] |
| **O** | Open-Closed | Mevcut kodu değiştirmeden yeni davranış eklenebilmeli. Martin'e göre sade kod hem açık hem kapalıdır[^3][^1] |
| **L** | Liskov Substitution | Alt tip, üst tipin yerine geçebilmeli. Arayüzü kullananı şaşırtan uygulama `if`/`switch` çoğaltır[^1] |
| **I** | Interface Segregation | İstemci kullanmadığı şeye bağımlı olmamalı. Martin'e göre en çok derlemeli dillerde önemli[^1] |
| **D** | Dependency Inversion | Üst seviye kurallar alt seviye ayrıntılara bağımlı olmamalı[^1] |

Bu rehber SRP ve DIP'i açıyor. Diğerleri için tablo yeterli.

## SRP: Tek değişme nedeni

Martin'e göre bir modülün değişmesi için tek bir nedeni olmalı. "Neden" ise insanlardan gelir: modül tek bir kişiden ya da tek bir iş işlevine hizmet eden gruptan değişiklik istemeli.[^2] Örneğinde `Employee` sınıfı üç yöneticiye hizmet ediyor: maaş hesabı mali işlerden, saat raporu operasyondan, kayıt veritabanı teknolojiden gelen isteklere bağlı. Biri kendi isteğiyle koda dokunduğunda diğerinin bağlı olduğu yöntem bozulabilir.[^2]

"Bir fonksiyon tek bir şey yapar" demek değil bu. Hata düzeltmeleri ve refactoring "neden" sayılmaz, çünkü onlar programın değil geliştiricinin işi.[^2]

## React'te SRP

Bir component hem veri çekip hem fiyatı biçimlendirip hem listeyi çiziyorsa üç değişme nedeni var: API değişir, fiyat formatı değişir, tasarım değişir.

```tsx
// ❌ Üç sorumluluk tek yerde
function ProductList() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((res) => res.json()),
  })
  return products.map((p) => (
    <li key={p.id}>{p.name}: {p.price.toFixed(2)} TL</li>
  ))
}
```

```tsx
// ✅ Her parçanın bir sebebi var

// products.api.ts: yalnızca API'yi bilir
export async function getProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error(`Products request failed: ${res.status}`)
  return res.json()
}

// format-price.ts: yalnızca fiyat biçimini bilir
export const formatPrice = (price: number) => `${price.toFixed(2)} TL`

// use-products.ts: veriyi component'e sunar
export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: getProducts })
}

// ProductList.tsx: yalnızca çizer
function ProductList() {
  const { data: products = [] } = useProducts()
  return products.map((p) => (
    <li key={p.id}>{p.name}: {formatPrice(p.price)}</li>
  ))
}
```

Veriyi ham `useEffect` ve `fetch` ile çekmedik. React dokümanına göre temizleme mantığı olmayan bir Effect'te yanıtlar sırasız gelebilir ve eski bir yanıt yenisinin üstüne yazabilir. Doküman önce framework'ün yerleşik veri çekme yolunu önerir. Framework yoksa temizleme mantığı olan bir özel hook yazmayı ya da ekosistemdeki hazır çözümleri kullanmayı söyler.[^4] Bu akademide hazır çözüm olarak [TanStack Query](/academy/tanstack-query) anlatılıyor.

Custom hook mantığı paylaşır, state'i değil: her çağrı kendi state'ini alır.[^5] Dokümana göre Effect yazdığınızda onu amaca uygun adlı bir hook'a sarmak niyeti ve veri akışını açık gösterir. Aynı yerde şu uyarı da var: her tekrarı hook'a çıkarmak gerekmez, tek bir `useState`'i sarmak çoğu zaman gereksiz.[^5]

Component'i ne zaman böleceğiniz [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde, tekrar etmiyoruz.

## Bağımlılık yönetimi: DIP

Martin'e göre üst seviye iş kuralları alt seviye ayrıntılara bağlı olmamalı, bağımlılık soyutlamalara doğru akmalı.[^1] Brett Schuchert'in anlatımında DIP, *dependency injection* ve *inversion of control* ile aynı şey değil. Konu, kodunuzun hangi soyutlama seviyesindeki mesajlara bağlı olduğu.[^6]

Frontend'de: component `fetch('/api/products')` çağırıyorsa URL'ye, HTTP'ye ve cevabın şekline bağlı. `useProducts()` çağırıyorsa yalnızca "ürünler" kavramına bağlı. Veri kaynağı değişse component değişmez.

Schuchert'in örneğinde veri, domain diliyle konuşan bir *repository* arkasına saklanıyor. Depolama bir bellek içi yapı, NoSQL ya da REST servisi olabiliyor, çünkü arayüz SQL'den söz etmiyor.[^6] Yukarıdaki `useProducts` aynı rolü oynuyor.

> [!TIP]
>
> Test yazarken fark edeceksiniz: component bir hook'a bağlıysa, testte yalnızca o hook'u değiştirmeniz yeter.

## Ne zaman gerekmez?

> [!CAUTION]
>
> SOLID bir kontrol listesi değil, soru sorma biçimi.
>
> - **Her fonksiyonu tek satıra bölmeyin.** SRP'de ölçü satır sayısı değil, değişme nedeni sayısı.[^2] Aynı sebeple değişen iki şey aynı yerde kalabilir.
> - **Tek kullanımlık hook yazmayın.** Dokümana göre biraz tekrar sorun değil.[^5]
> - **Hiç değişmeyecek bir bağımlılığı soyutlamayın.** Tek bir backend'iniz var ve değişmeyecekse bir katman daha eklemek yalnızca dosya sayısını artırır. Bu rehberin önerisi: soyutlamayı ikinci kaynak gerçekten geldiğinde ekleyin.

## Kaynaklar

1. [Robert C. Martin: Solid Relevance](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html) *(article)* — Beş ilkenin bugünkü geçerliliği: SRP, OCP, LSP, ISP ve DIP. 18 Ekim 2020.
2. [Robert C. Martin: The Single Responsibility Principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) *(article)* — Tek değişme nedeni, nedenin insanlardan (iş işlevinden) gelmesi, `Employee` örneği ve hata düzeltmelerinin "neden" sayılmaması. 8 Mayıs 2014.
3. [Robert C. Martin: The Open-Closed Principle](https://blog.cleancoder.com/uncle-bob/2014/05/12/TheOpenClosedPrinciple.html) *(article)* — Davranışı mevcut kodu değiştirmeden eklemek ve bağımlılıkların içe doğru akması. 12 Mayıs 2014.
4. [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) *(doc)* — "Fetching data" bölümü: temizleme mantığı olmayan Effect'te yarış durumu, framework'ün yerleşik veri çekmesi ve özel hook.
5. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(doc)* — Hook'ların mantığı paylaşıp state'i paylaşmadığı, Effect'i hook'a sarma ve her tekrarı çıkarmama uyarısı.
6. [Brett L. Schuchert: The Dependency Inversion Principle in the Wild](https://martinfowler.com/articles/dipInTheWild.html) *(article)* — DIP'in dependency injection ve inversion of control'den farkı, domain kavramına bağımlılık ve repository örneği. Mayıs 2013.
