---
title: "Props ve composition"
description: "Veri aktarma, children ve slot'lar, props'u state'e kopyalamama."
lastVerified: "2026-10-21"
translationKey: "react/props-and-composition"
---

## Props nedir

**Props**, ebeveynin çocuğa verdiği girdilerdir. Component fonksiyonunun tek parametresi olan bir objedir; genellikle destructuring ile açılır ve varsayılan değer orada verilir:[^1]

```tsx
type PriceProps = {
  amount: number;
  currency?: string;
};

export function Price({ amount, currency = "TL" }: PriceProps) {
  return (
    <span>
      {amount.toLocaleString("tr-TR")} {currency}
    </span>
  );
}

<Price amount={1499} />;
```

Props **salt okunurdur**. Component kendi props'unu değiştirmez; farklı bir değer gerekiyorsa ebeveyn yeni props gönderir.[^1] Props tiplerinin detayı [React'te tipler](/academy/typescript/types-in-react) dersinde.

Veri yukarıdan aşağı akar; çocuk ebeveyne bir şey söylemek istediğinde ebeveynin verdiği fonksiyonu çağırır. Bu fonksiyon prop'ları geleneksel olarak `on` ile başlar, ebeveyndeki karşılığı `handle` ile:[^2]

```tsx
<AddToCartButton onAdd={handleAdd} />
```

## children ve slot'lar

Bir component'in içine yazılan JSX, `children` prop'u olarak gelir. Böylece component, içinde ne olduğunu bilmeden bir **boşluk** bırakır:[^1]

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

<Card>
  <Price amount={1499} />
</Card>;
```

Birden fazla boşluk gerekiyorsa JSX'i adlandırılmış prop olarak geçin. Bu kalıba **slot** denir:

```tsx
<Dialog
  title="Clear cart"
  actions={<Button onClick={clearCart}>Clear</Button>}
>
  Sepetteki 3 ürün silinecek.
</Dialog>
```

`Dialog` butonun ne yaptığını bilmez; yalnızca nereye konacağını bilir. Bu, `showCancel`, `confirmText`, `danger` gibi boolean ve string prop'larını çoğaltmaktan daha esnek bir yoldur. Kalıbın büyük ölçekli hâli *(compound component)* [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde.

## Props'u state'e kopyalamayın

En sık yapılan hatalardan biri, prop'u `useState`'in başlangıç değeri yapıp sonra onu kullanmaktır:

```tsx
function EmailField({ email }: { email: string }) {
  const [value, setValue] = useState(email); // ❌ email değişince güncellenmez
  // ...
}
```

`useState`'in başlangıç değeri yalnızca component ilk kez ekrana geldiğinde okunur. Ebeveyn başka bir kullanıcı seçip yeni `email` gönderdiğinde `value` eski kalır.[^3] [Dan Abramov](https://overreacted.io/) buna *"veri akışını durdurmak"* diyor: prop'u state'e kopyaladığınızda ona gelen tüm güncellemeleri görmezden gelirsiniz.[^4]

Çözüm duruma göre değişir:

| Durum | Çözüm |
| :-- | :-- |
| Değer yalnızca gösteriliyor ya da props'tan hesaplanabiliyor | State yok; prop'u doğrudan kullanın[^4] |
| Kullanıcı düzenleyecek, ilk değer prop'tan geliyor | Prop'u `initialEmail` diye adlandırın ve component'e `key` verin[^3][^5] |
| Ebeveyn de güncel değeri bilmeli | State'i ebeveyne taşıyın *(controlled component)*[^3] |

`key` değiştiğinde React component'i baştan kurar, `useState` de yeni başlangıç değerini okur:[^3]

```tsx
<EmailField key={user.id} initialEmail={user.email} />
```

İsimdeki `initial` öneki okuyana *"bu prop sonradan değişirse dikkate alınmaz"* der.[^5]

## Prop drilling ve ilk çözüm

Bir değeri beş seviye aşağıya prop olarak taşımaya **prop drilling** denir. İki üç seviye sorun değildir; veri akışı açık kalır. Uzadığında ilk refleks Context olmamalı. React dokümanı Context'ten önce iki şey denemeyi önerir: önce props'la devam edin, sonra ara component'lere props yerine `children` geçin.[^6]

```tsx
// Önce: Layout, Header ve Nav'a user'ı yalnızca aşağı iletmek için alıyor
<Layout user={user} />;

// Sonra: user'ı kullanan component doğrudan yerleştiriliyor
<Layout header={<Header><UserMenu user={user} /></Header>}>
  <ProductList />
</Layout>;
```

Ara katmanlar artık `user`'ı bilmiyor. Bu yaklaşım hem kodu sadeleştirir hem de gereksiz re-render'ı azaltır; nedenini [React'te render performansı](/academy/performance-accessibility/render-performance) dersi anlatıyor. Gerçekten derinde ve çok yerde gereken veri için Context dersine geçeceğiz.

> [!WARNING]
>
> `{...props}` ile tüm props'u körü körüne iletmek, hangi verinin nereden geldiğini gizler. React dokümanına göre spread her ikinci component'te karşınıza çıkıyorsa component'leri bölüp `children` geçirmek gerekir.[^1]

## Kendin dene

- `Price`'a `discount?: number` prop'u ekleyin; indirim varsa eski fiyatın üstünü çizin.
- `Card`'a `footer` slot'u ekleyin ve iki farklı kullanımda farklı butonlar verin.
- İki kullanıcılık bir listeden seçim yapan bir sayfada `EmailField`'ı önce `key`'siz, sonra `key={user.id}` ile deneyin.
- Kendi projenizde üç seviyeden fazla aşağı inen bir prop bulun ve `children` ile kısaltmayı deneyin.

## Detaylı öğrenmek için

- **Yazı:** [Dan Abramov](https://overreacted.io/)'un "Writing Resilient Components" yazısı; props'u state'e kopyalamamak, her an render'a hazır olmak ve tekil olmayan component'ler.[^4]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun props'u `useState`'e koymanın üç çözümünü karşılaştırdığı yazı.[^3]
- **Resmi doküman:** "Passing Data Deeply with Context" sayfasının "Before you use context" bölümü.[^6]

## Kaynaklar

1. [React: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) *(doc)* — Props, varsayılan değer, `children`, salt okunurluk ve spread uyarısı.
2. [React: Responding to Events](https://react.dev/learn/responding-to-events) *(doc)* — Event handler'ı prop olarak geçmek, `on` ve `handle` isimlendirmesi.
3. [TkDodo](https://tkdodo.eu/): [Putting props to useState](https://tkdodo.eu/blog/putting-props-to-use-state) *(article)* — 25 Ekim 2020. Başlangıç değerinin yalnızca mount'ta okunması; koşullu render, state'i yukarı taşıma ve `key` çözümleri.
4. [Dan Abramov](https://overreacted.io/): [Writing Resilient Components](https://overreacted.io/writing-resilient-components/) *(article)* — 16 Mart 2019. Props'u state'e kopyalamanın veri akışını durdurması.
5. [React: Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) *(doc)* — Props'u state'e aynalamama ve `initial` öneki.
6. [React: Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) *(doc)* — Context'ten önce props ve `children` ile çözme önerisi.
