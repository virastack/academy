---
title: "State"
description: "useState, snapshot ve updater, immutable güncelleme, state'i doğru kurmak ve state türleri."
lastVerified: "2026-10-21"
translationKey: "react/state"
---

## State Nedir

**State**, bir component'in render'lar arasında hatırladığı veridir. `useState` iki şey döndürür: o anki değer ve onu güncelleyen fonksiyon. Güncelleme fonksiyonu çağrıldığında React component'i yeniden render eder.[^1]

```tsx
import { useState } from "react";

export function QuantityPicker() {
  const [quantity, setQuantity] = useState(1);

  return (
    <div>
      <button onClick={() => setQuantity(quantity - 1)}>-</button>
      <span>{quantity}</span>
      <button onClick={() => setQuantity(quantity + 1)}>+</button>
    </div>
  );
}
```

Normal bir `let` değişkeni bu işi göremez: her render fonksiyonu baştan çalıştırır ve değişkeni sıfırlar, üstelik değişkeni değiştirmek render'ı tetiklemez.[^1]

## State Bir Fotoğraftır

`setQuantity` değeri hemen değiştirmez; bir sonraki render için istek bırakır. O render'ın içindeki `quantity` sabit kalır.[^2]

```tsx
function handleAddThree() {
  setQuantity(quantity + 1);
  setQuantity(quantity + 1);
  setQuantity(quantity + 1);
  console.log(quantity); // hâlâ 1; sonuç: 2
}
```

Üç çağrı da `1 + 1` hesaplar. React aynı event'teki güncellemeleri **toplu** işler *(batching)* ve tek bir render yapar. Önceki değere göre güncelleme yapıyorsanız **updater fonksiyonu** verin:[^2]

```tsx
setQuantity((q) => q + 1); // sonuç: 4
setQuantity((q) => q + 1);
setQuantity((q) => q + 1);
```

[Josh W. Comeau](https://www.joshwcomeau.com/) bu "set ettim ama eski değeri görüyorum" durumunu yeni başlayanların en sık takıldığı hatalardan biri olarak sayar.[^3]

## Değiştirmeyin, Yenisini Verin

Obje ya da dizi tutan state'i doğrudan değiştirmeyin. React değişikliği referans karşılaştırmasıyla anlar; aynı objeyi değiştirip geri verirseniz render olmayabilir.[^4]

```tsx
// ❌ mutasyon
cart.push(product);
setCart(cart);

// ✅ yeni dizi
setCart([...cart, product]);
setCart(cart.filter((item) => item.id !== id));
setCart(cart.map((item) =>
  item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
));
```

`push`, `splice`, `sort` ve `reverse` diziyi yerinde değiştirir; `toSorted` ve `toReversed` gibi kopya döndüren karşılıklarını ya da spread'i kullanın.[^4] `eslint-plugin-react-hooks`'un `immutability` kuralı props ve state mutasyonunu yakalar.[^5]

## State'i Doğru Kurmak

Hataların çoğu state'in kendisinden değil, yanlış kurulmasından çıkar. React dokümanının beş ilkesi:[^6]

| İlke | Örnek |
| :-- | :-- |
| Birlikte değişenleri birleştirin | `x` ve `y` yerine `position` |
| Çelişkiye izin vermeyin | `isLoading` + `isError` yerine `status: "idle" \| "loading" \| "error"` |
| Hesaplanabileni tutmayın | `fullName` state değil, `firstName + lastName` |
| Kopyalamayın | Seçili ürünün kendisi değil `selectedId` |
| Derin iç içe yapıdan kaçının | Ağaç yerine düz liste ve id'ler |

Üçüncü ilke en sık bozulandır. [TkDodo](https://tkdodo.eu/) bir kod incelemesinde hep aynı kalıbı gördüğünü anlatıyor: veriden kategori listesini çıkarıp ayrı bir state'e koyan ve bir Effect ile senkron tutan kod. Sonra biri `setCategories`'i başka yerden çağırınca kategoriler veriden kopuyor. Kuralı kısa: bir state setter'ı yalnızca bir Effect içinde senkron çağrılıyorsa o state'i silin.[^7] [Kent C. Dodds](https://kentcdodds.com/) da aynı kuralı tek cümleyle söylüyor: *"State'i senkronlamayın, türetin."*[^8]

```tsx
// ❌ İki state, bir Effect
const [products, setProducts] = useState<Product[]>([]);
const [inStock, setInStock] = useState<Product[]>([]);
useEffect(() => {
  setInStock(products.filter((p) => p.stock > 0));
}, [products]);

// ✅ Bir state, bir hesap
const [products, setProducts] = useState<Product[]>([]);
const inStock = products.filter((p) => p.stock > 0);
```

Hesap pahalıysa bile önce ölçün; memoization'ı React Compiler ya da `useMemo` halleder.

## State Nerede Durur, Ne Zaman Sıfırlanır

State, onu kullanan **en yakın ortak ebeveyne** konur. İki kardeş aynı değere ihtiyaç duyuyorsa state ebeveyne çıkar ve props olarak iner.[^9] Karar tablosu ve *colocation* [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde.

React state'i component'e değil, component'in **ağaçtaki yerine** bağlar. Aynı yerde aynı tipte component render edildikçe state korunur; component kaldırılınca ya da tipi değişince silinir.[^10] Aynı yerde farklı bir kaydı gösterirken state'i sıfırlamak için `key` verin: `<ReviewForm key={product.id} />`.[^10]

## useState mi, useReducer mı?

Güncellemeler birçok yerden geliyor ve birbirine bağlıysa *(çok adımlı form, sepet)* `useReducer` mantığı tek bir saf fonksiyonda toplar ve test edilmesini kolaylaştırır.[^11] [TkDodo](https://tkdodo.eu/)'nun ölçütü: birbirinden bağımsız değişen değerler için ayrı `useState`, birlikte değişen ve birbirine bağlı parçalar için `useReducer`.[^12] Tipli bir `cartReducer` örneği [React'te tipler](/academy/typescript/types-in-react) dersinde.

## Her Veri Aynı State Değil

[Kent C. Dodds](https://kentcdodds.com/), uygulama state'ini en az iki türe ayırmayı önerir: sunucudan gelen veri *(server cache)* ve yalnızca arayüzü yöneten veri *(UI state)*. İkisini aynı yerde tutmak en büyük karmaşa kaynağıdır.[^13]

| Tür | Örnek | Nerede |
| :-- | :-- | :-- |
| UI state | Modal açık mı, seçili sekme | `useState`, gerekirse Context |
| Server state | Ürün listesi, sipariş | [TanStack Query](/academy/tanstack-query) ya da framework |
| URL state | Arama metni, filtre, sayfa | Router'ın search params'ı |
| Form state | Henüz gönderilmemiş girdiler | Form, [Formlar](/academy/forms) rehberi |
| Paylaşılan client state | Tema, sepet | Context ya da [Zustand](/academy/zustand) |

## Kendin Dene

- `QuantityPicker`'a "+3" butonu ekleyin. Önce `quantity + 1` ile, sonra updater ile yazın.
- Sepetteki bir ürünün adedini `item.quantity++` ile artırmayı deneyin ve ekranın neden güncellenmediğini açıklayın.
- `isLoading`, `isError` ve `data` tutan bir component'i tek bir `status` alanına çevirin.
- Bir ürün listesinde `filteredProducts`'ı state'ten çıkarıp render sırasında hesaplayın.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Managing State" bölümü; state yapısı, state'i yukarı taşıma ve state'i koruma/sıfırlama.[^6][^10]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun "useState pitfalls" serisi; türetilmiş state ve props'u state'e koymak.[^7]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un "Application State Management with React" yazısı; server cache ile UI state ayrımı.[^13]

## Kaynaklar

1. [React: State: A Component's Memory](https://react.dev/learn/state-a-components-memory) *(doc)* — `useState`, yerel değişkenin neden yetmediği.
2. [React: State as a Snapshot](https://react.dev/learn/state-as-a-snapshot) *(doc)* — Render içindeki state'in sabit kalması; batching ve updater için "Queueing a Series of State Updates" sayfası.
3. [Josh W. Comeau](https://www.joshwcomeau.com/): [Common Beginner Mistakes with React](https://www.joshwcomeau.com/react/common-beginner-mistakes/) *(article)* — State'i değiştirdikten hemen sonra okumak ve mutasyon hataları.
4. [React: Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state) *(doc)* — Mutasyon yapan ve yeni dizi döndüren metotlar tablosu.
5. [React: immutability lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/immutability) *(doc)* — Props ve state mutasyonunu yakalayan kural.
6. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Gruplama, çelişki, gereksiz state, kopyalama ve iç içe yapı ilkeleri.
7. [TkDodo](https://tkdodo.eu/): [Don't over useState](https://tkdodo.eu/blog/dont-over-use-state) *(article)* — 29 Ağustos 2020. Türetilmiş state ve Effect ile senkronlamanın riski.
8. [Kent C. Dodds](https://kentcdodds.com/): [Don't Sync State. Derive It!](https://kentcdodds.com/blog/dont-sync-state-derive-it) *(article)* — 30 Eylül 2019. Tic-tac-toe örneğiyle hesaplanabilen değeri state'te tutmamak.
9. [React: Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) *(doc)* — State'i en yakın ortak ebeveyne taşımak.
10. [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) *(doc)* — State'in ağaçtaki konuma bağlı olması ve `key` ile sıfırlama.
11. [React: Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) *(doc)* — `useReducer`'a geçiş ve `useState` ile karşılaştırma.
12. [TkDodo](https://tkdodo.eu/): [useState vs useReducer](https://tkdodo.eu/blog/use-state-vs-use-reducer) *(article)* — 2021, Nisan 2022'de güncellendi. Birlikte değişen state ve reducer kullanımı.
13. [Kent C. Dodds](https://kentcdodds.com/): [Application State Management with React](https://kentcdodds.com/blog/application-state-management-with-react) *(article)* — 2020. Server cache ile UI state'i ayırmak ve colocation.
