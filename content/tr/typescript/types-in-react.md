---
title: "React'te tipler"
description: "Props, children, event, hook ve context tipleri."
lastVerified: "2026-10-17"
translationKey: "typescript/types-in-react"
---

## React ve TypeScript

[!react] ile [!typescript] kullanmak için iki şey gerekir: JSX içeren her dosyanın uzantısı `.tsx` olmalı ve React'in tip tanımları kurulu olmalı.[^1] React tiplerini kendi paketinde taşımaz; tanımlar `@types/react` ve `@types/react-dom` paketlerinden gelir. Vite'in `react-ts` şablonu bu paketleri zaten kurar. Var olan bir projeye elle eklemek için:

```command
npm install -D @types/react @types/react-dom
```

Bu dersteki tipler `React.ReactNode` gibi `React.` önekiyle yazılır; isterseniz `import type { ReactNode } from "react"` ile de alabilirsiniz.

## Props

Props bir object'tir; tipi de `type` ya da `interface` ile tanımlanan bir object tipidir.[^1] Component'in parametresinde destructuring ile açılır:

```tsx
import type { Product } from "./types";

type ProductCardProps = {
  product: Product;
  showPrice?: boolean;
  onAddToCart: (product: Product) => void;
};

export function ProductCard({
  product,
  showPrice = true,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article>
      <h2>{product.name}</h2>
      {showPrice && <p>{product.price} TL</p>}
      <button type="button" onClick={() => onAddToCart(product)}>
        Sepete ekle
      </button>
    </article>
  );
}
```

- `showPrice?` isteğe bağlıdır; varsayılan değeri destructuring'de verilir ve içeride tipi `boolean` olur.
- `onAddToCart` bir fonksiyon prop'udur; parametre ve dönüş tipi yazılır, `Function` tipi kullanılmaz.
- Dönüş tipini yazmanıza gerek yoktur; TypeScript JSX'ten çıkarır.

Zorunlu bir prop unutulursa hata, component'i kullandığınız yerde çıkar: `<ProductCard product={headphones} />` için `Property 'onAddToCart' is missing in type '{ product: Product; }' but required in type 'ProductCardProps'.`

### React.FC kullanmalı mı?

Eski kodlarda `const ProductCard: React.FC<ProductCardProps> = ...` yazımını görürsünüz. React TypeScript Cheatsheet'e göre bugünkü genel kanı, `React.FC`'nin gerekli olmadığıdır; güncel tiplerde kullanmak çoğunlukla bir stil tercihidir.[^2] [Kent C. Dodds](https://kentcdodds.com/) da düz fonksiyon ve props tipini önerir; `React.FC` generic component yazmayı zorlaştırır ve `function` yerine arrow function'a bağlar.[^3] Eskiden `React.FC` her component'e gizlice `children` ekliyordu; React 18 tipleriyle bu kaldırıldı.[^4] Bu derste ve projede düz `function` kullanılır.

## children

Başka içerik saran component'ler `children` alır. En geniş ve en yaygın tipi `React.ReactNode`'dur: JSX, metin, sayı, `null` ve bunların dizileri.[^1][^5]

```tsx
type CardProps = { title: string; children: React.ReactNode };

export function Card({ title, children }: CardProps) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

Yalnızca JSX elemanı kabul etmek istiyorsanız `React.ReactElement` kullanılır. TypeScript, `children`'ın belirli bir eleman *(örneğin yalnızca `<li>`)* olmasını ifade edemez.[^1]

## HTML elemanını saran component'ler

Kendi `Button` component'iniz, gerçek `<button>`'ın tüm props'unu *(`type`, `disabled`, `onClick`, `aria-*`...)* kabul etmeli. Bunları tek tek yazmak yerine `React.ComponentProps` ile alırsınız.[^6]

```tsx
type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant}`} {...rest} />;
}

<Button type="submit" onClick={() => console.log("tık")}>
  Siparişi tamamla
</Button>;
```

React 19'da `ref` de sıradan bir prop'tur; yeni component'lerde `forwardRef` gerekmez.[^7] `React.ComponentProps<"input">` `ref`'i de içerdiği için `{...props}` ile `<input>`'a iletilir. `ref` almak istemediğiniz component'te `React.ComponentPropsWithoutRef<"button">` kullanın.[^5] `typeof` ile kendi component'inizin props'unu da çıkarabilirsiniz: `React.ComponentProps<typeof ProductCard>`.[^6]

## Event'ler

Handler JSX'in içinde yazılırsa tip yazmanız gerekmez: `onChange={(event) => setQuery(event.currentTarget.value)}` yazdığınızda TypeScript `event`'in tipini `onChange`'den çıkarır.[^8]

Handler'ı ayrı bir fonksiyona çıkardığınızda parametreyi kendiniz tiplersiniz. Tipin adı `React.<Olay>Event<Eleman>` kalıbındadır:

```tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  setQuery(event.currentTarget.value);
}

function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
  event.preventDefault();
  onSearch(query);
}

<form onSubmit={handleSubmit}>
  <input value={query} onChange={handleChange} />
</form>;
```

Diğerleri aynı kalıptadır: `React.MouseEvent<HTMLButtonElement>`, `React.KeyboardEvent<HTMLInputElement>`, `select` için `React.ChangeEvent<HTMLSelectElement>`.

> [!WARNING]
>
> Pek çok eski örnekte `onSubmit` için `React.FormEvent` görürsünüz. `@types/react` 19.2.10 sürümünden beri `FormEvent` ve `FormEventHandler` deprecated; yerine `SubmitEvent`, `ChangeEvent` ya da `InputEvent` önerilir.[^8][^9] Eski tip hâlâ çalışır, editör üstünü çizer.

Doğru tipi bulmanın en kısa yolu: handler'ı önce JSX içinde yazın, [!vscode] gibi bir editörde `event`'in üzerine gelin ve gösterilen tipi kopyalayın.[^1]

## Hook'lar

### useState

Başlangıç değeri tipi belirler: `useState(0)` → `number`, `useState("")` → `string`. Değer başta boşsa ya da bir union ise generic'i siz verirsiniz.[^1][^10]

```tsx
const [count, setCount] = useState(0);
const [selected, setSelected] = useState<Product | null>(null);
const [products, setProducts] = useState<Product[]>([]);
```

`useState(null)` yazarsanız tip yalnızca `null` olur ve sonra hiçbir ürün atanamaz. Boş dizi için de `useState<Product[]>([])` yazın.

### useReducer

Action'ları bir discriminated union olarak tanımlayın. Reducer'ın parametre ve dönüş tiplerini yazdığınızda `useReducer` gerisini çıkarır.[^1][^10]

```tsx
type CartAction =
  | { type: "add"; product: Product }
  | { type: "remove"; id: number };

function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "add": {
      const { id, name, price } = action.product;
      return [...items, { id, name, price, quantity: 1 }];
    }
    case "remove":
      return items.filter((item) => item.id !== action.id);
  }
}

const [items, dispatch] = useReducer(cartReducer, []);
dispatch({ type: "remove" });
// Hata: Property 'id' is missing in type '{ type: "remove"; }' but required in type '{ type: "remove"; id: number; }'.
```

Her `case` içinde `action`, `type` alanına göre daralır; `remove` dalında `action.id` vardır, `add` dalında yoktur. Bu daraltma Narrowing ve type guard dersindeki konunun aynısıdır.

### useRef

DOM elemanı için ref, eleman tipi ve `null` ile oluşturulur. React 19 tiplerinde `useRef` bir argüman ister ve dönen ref her zaman yazılabilirdir.[^11]

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus(); // current: HTMLInputElement | null
}

<input ref={inputRef} placeholder="Ürün ara" />;
```

`current` ilk render'da `null`'dır, bu yüzden `?.` ile erişilir.[^10] Ref'i bir alt component'e iletmek için yukarıdaki `ref` prop'u yeterlidir.

## Context

Context'in çoğu zaman anlamlı bir varsayılan değeri yoktur. React dokümanının ve Cheatsheet'in önerisi aynıdır: tipe `| null` ekleyin, `null` kontrolünü bir custom hook'a koyun.[^1][^12]

```tsx
type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (cart === null) {
    throw new Error("useCart, CartProvider içinde kullanılmalı.");
  }
  return cart; // tip: CartContextValue, null yok
}
```

`useCart` kullanan her component `null` kontrolü yapmadan `items`'a erişir. Provider unutulursa hata sessizce geçmez, hemen görünür.[^13] React 19'da provider için `<CartContext.Provider>` yerine doğrudan `<CartContext value={...}>` yazılır.[^7] Tam bir sepet provider'ını projede kuracaksınız.

> [!DONT]
>
> - `createContext<CartContextValue>(null!)` ya da `{} as CartContextValue` ile derleyiciyi susturmak. Provider unutulduğunda hata çalışma anına kayar.[^12]

## Generic component

Generic'ler dersindeki `<T>` component'lerde de çalışır. Aşağıdaki `List`, hangi tipte dizi verilirse `renderItem`'a o tipi geçirir.[^14]

```tsx
type ListProps<T> = {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
};

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

<List
  items={products}
  getKey={(product) => product.id}
  renderItem={(product) => product.title}
/>;
// Hata: Property 'title' does not exist on type 'Product'.
```

`T`, `items={products}`'tan `Product` olarak çıkarılır. `.tsx` dosyasında generic component'i `function` ile yazmak en sorunsuz yoldur; arrow function'da `<T>` JSX etiketiyle karışır.[^14]

## Kendin dene

- `ProductCard`'a isteğe bağlı `badge?: "new" | "sale"` prop'u ekleyin ve `"discount"` vermeyi deneyin.
- `Button`'a `aria-label` ve `disabled` verin; ek tip yazmadan kabul edildiğini görün.
- `cartReducer`'a `{ type: "clear" }` action'ı ekleyin; `case` yazmadan önce `Function lacks ending return statement...` hatasını okuyun.
- `List`'i `CartItem[]` ile kullanın ve `renderItem` içinde `item.quantity`'nin otomatik tamamlandığını görün.

## Detaylı öğrenmek için

- **Resmi doküman:** react.dev'in "Using TypeScript" sayfası; props, hook ve event tipleri kısa örneklerle.[^1]
- **Yazı:** Topluluğun hazırladığı React TypeScript Cheatsheet; props, event, hook ve context için ayrı sayfalar.[^2]
- **Kurs:** [Matt Pocock](https://www.mattpocock.com/)'un ücretsiz "React with TypeScript" egzersizleri; props, children, event ve hook'lar.[^15]
- **Konuşma:** [Matt Pocock](https://www.mattpocock.com/)'un "React's Most Useful Types" konuşması; `ReactNode`, `ComponentProps`, `ElementType` *(React Day Berlin 2023, 21 dk)*.[^16]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un context'i custom hook ve provider ile kullanma yazısı.[^13]

## Kaynaklar

1. [React: Using TypeScript](https://react.dev/learn/typescript) *(doc)* — `@types/react` kurulumu, props, `ReactNode`, `useState`, `useReducer`, context ve `ChangeEvent` örnekleri.
2. [React TypeScript Cheatsheet: Function Components](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/function_components) *(doc)* — `React.FC`'nin artık gerekli görülmediği ve güncel tiplerde stil tercihi olduğu.
3. [Kent C. Dodds](https://kentcdodds.com/): [How to write a React Component in TypeScript](https://kentcdodds.com/blog/how-to-write-a-react-component-in-typescript) *(article)* — 2021 tarihli; props tipini parametreye yazmayı ve `React.FC`'den kaçınmayı önerir.
4. [React 18 Upgrade Guide](https://react.dev/blog/2022/03/08/react-18-upgrade-guide) *(doc)* — Yeni tiplerde `children`'ın props'ta açıkça yazılması gerektiği.
5. [React TypeScript Cheatsheet: Typing Component Props](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/basic_type_example) *(doc)* — `ReactNode` ile `JSX.Element` farkı ve `ComponentPropsWithoutRef` kullanımı.
6. [Matt Pocock](https://www.mattpocock.com/): [ComponentProps: React's Most Useful Type Helper](https://www.totaltypescript.com/react-component-props-type-helper) *(article)* — `ComponentProps<"button">` ve `ComponentProps<typeof Component>` ile props tipi çıkarma.
7. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `ref`'in prop olarak alınması ve `<Context>`'in provider olarak kullanılması.
8. [React TypeScript Cheatsheet: Forms and Events](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/forms_and_events) *(doc)* — Satır içi handler'da tip çıkarımı, `ChangeEventHandler` ve `FormEvent`'in 19.2.10'da deprecated olması.
9. [DefinitelyTyped: types/react/index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts) *(repo)* — `@types/react` tanımlarının kaynağı; `SubmitEvent` ve `FormEvent` üzerindeki deprecation notu.
10. [React TypeScript Cheatsheet: Hooks](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/hooks) *(doc)* — `useState<User | null>(null)`, union action'lı `useReducer` ve DOM için `useRef`.
11. [React 19 Upgrade Guide: TypeScript changes](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) *(doc)* — `useRef`'in argüman istemesi, tek `RefObject` tipi ve `types-react-codemod`.
12. [React TypeScript Cheatsheet: Context](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/context) *(doc)* — `null` varsayılan, hata fırlatan custom hook ve tip assertion yerine çalışma anı kontrolü.
13. [Kent C. Dodds](https://kentcdodds.com/): [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) *(article)* — 2021 tarihli; provider dışında kullanılınca hata fırlatan context hook'u.
14. [Matt Pocock](https://www.mattpocock.com/): [Use generics in React to make dynamic and flexible components](https://www.totaltypescript.com/tips/use-generics-in-react-to-make-dynamic-and-flexible-components) *(video)* — Yaklaşık 1 dakikalık ipucu; generic `Table` component'i ve `.tsx`'te `function` ile yazma.
15. [Matt Pocock](https://www.mattpocock.com/): [React with TypeScript](https://www.totaltypescript.com/tutorials/react-with-typescript) *(doc)* — Ücretsiz, egzersizli eğitim; props, children, event ve hook'lar.
16. [Matt Pocock](https://www.mattpocock.com/): [React's Most Useful Types (React Day Berlin 2023)](https://gitnation.com/contents/typescript-tricks-for-building-better-react-apps/video) *(video)* — 21 dakika. `ReactNode`, `ComponentProps`, `ElementType` ve ref tipleri.
