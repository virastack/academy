---
title: "Ref ve DOM"
description: "DOM erişimi, ref prop'u, ref callback cleanup ve Fragment ref'leri."
lastVerified: "2026-10-21"
translationKey: "react/refs-and-dom"
---

## Ref nedir

**Ref**, render'lar arasında saklanan ama değiştiğinde render **tetiklemeyen** bir kutudur. `useRef` bir obje döndürür; değer `current` alanındadır.[^1]

| | State | Ref |
| :-- | :-- | :-- |
| Değişince | Render tetikler | Render tetiklemez |
| Değiştirme | Setter ile | `ref.current = ...` |
| Render'da okuma | Serbest | Okunmamalı |
| Kullanım | Ekranda görünen veri | Zamanlayıcı id'si, DOM elemanı, önceki değer |

React dokümanı ref'i bir **kaçış kapısı** olarak tanımlar: React dışındaki bir şeyle konuşurken kullanılır. Uygulamanın mantığı ref'lerden akıyorsa yaklaşımı gözden geçirin.[^1]

> [!WARNING]
>
> Render sırasında `ref.current`'i okumayın ya da yazmayın. Değer ekranda bir şeyi belirliyorsa state olmalıdır. `eslint-plugin-react-hooks`'un `refs` kuralı bunu yakalar.[^2][^1]

## DOM elemanına erişmek

Çoğu iş deklaratif yapılır, ama bazı şeylerin JSX karşılığı yoktur: odaklanmak, bir yere kaydırmak, video oynatmak, eleman ölçmek. Bunun için ref'i JSX'teki `ref` attribute'una verirsiniz; React DOM elemanını `current`'a koyar.[^3]

```tsx
import { useRef } from "react";

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={inputRef} type="search" placeholder="Search products" />
      <button onClick={() => inputRef.current?.focus()}>Search</button>
    </>
  );
}
```

`current` ilk render'da `null`'dır; React ref'i commit sırasında, DOM'u güncelledikten sonra bağlar. Bu yüzden ref'lere event handler'larda ya da Effect'lerde erişilir.[^3]

## Kendi component'inize ref vermek

React 19'dan beri `ref` fonksiyon component'lerde sıradan bir prop'tur. `forwardRef` artık gerekmez ve ileride kaldırılacak.[^4]

```tsx
function TextField({ ref, ...props }: React.ComponentProps<"input">) {
  return <input ref={ref} className="text-field" {...props} />;
}

<TextField ref={inputRef} placeholder="E-posta" />;
```

Ebeveynin DOM elemanının tamamına değil, yalnızca birkaç metoda erişmesini istiyorsanız `useImperativeHandle` ile küçük bir API açabilirsiniz. Bunu seyrek kullanın; `open()` ve `close()` gibi metotlar yerine `isOpen` gibi bir prop çoğu zaman daha iyidir.[^3][^5]

> [!DONT]
>
> - React'in yönettiği DOM'u ref ile değiştirmek: elemanı silmek, içine çocuk eklemek. React bir sonraki render'da DOM'u kendi bildiği hâle getirmeye çalışır ve hata verir. Ref'le yalnızca React'in dokunmadığı şeyleri yapın *(odak, kaydırma, ölçme)*.[^3]

## Ref callback ve cleanup

`ref`'e obje yerine bir fonksiyon da verebilirsiniz. React elemanı DOM'a ekleyince fonksiyonu elemanla çağırır. React 19'da bu fonksiyon bir **cleanup** döndürebilir; eleman kaldırılınca çağrılır.[^6][^4]

```tsx
function measure(node: HTMLElement) {
  const observer = new ResizeObserver(([entry]) => {
    console.log("Card width:", entry.contentRect.width);
  });
  observer.observe(node);
  return () => observer.disconnect();
}

<article ref={measure}>...</article>;
```

[TkDodo](https://tkdodo.eu/)'nun ref callback ile Effect arasındaki kuralları:[^7]

- **DOM elemanına ihtiyacınız varsa** ref callback tercih edin; `useRef` + `useEffect`'ten kısadır ve ebeveynin değil, elemanın render'ına bağlıdır. Fonksiyon component'e bağlı değilse yukarıdaki gibi component dışına taşıyın; her render'da yeniden oluşmaz.
- **Elemanla ilgisi olmayan bir yan etki** *(örneğin `document.title`)* için ref kullanmayın; Effect daha anlaşılırdır.
- **Asenkron işler** için ikisi de değil; veri çekme kütüphanesi.

Strict Mode, ref callback'leri de development'ta bir kez fazladan kurup söker; cleanup eksikse burada görürsünüz.[^6]

## Fragment ref'leri

React 19.3 ile `<Fragment>`'e ref verilebiliyor. Sarmalayıcı bir `<div>` eklemeden, bir component'in render ettiği kardeş elemanların hepsiyle grup olarak çalışırsınız. Dönen `FragmentInstance` odak *(`focus`, `focusLast`, `blur`)*, event listener ekleme ve `IntersectionObserver`/`ResizeObserver` bağlama gibi metotlar sunar.[^8][^9]

```tsx
import { Fragment, useEffect, useRef } from "react";

function FocusTrap({ children }: { children: React.ReactNode }) {
  const fragmentRef = useRef<React.FragmentInstance>(null);

  useEffect(() => {
    fragmentRef.current?.focus(); // ilk odaklanabilir çocuğa odaklan
  }, []);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}
```

Bu özellikle elinizde olmayan component'lere *(bir kütüphanenin listesi gibi)* davranış eklerken işe yarar; component'in iç yapısını değiştirmeniz gerekmez.[^8] Odak yönetiminin erişilebilirlik tarafı [Klavye ve odak yönetimi](/academy/performance-accessibility/keyboard-and-focus) dersinde.

## Portal

Modal, tooltip ve toast gibi elemanlar görsel olarak sayfanın en üstünde durmalıdır, ama component ağacında onları açan component'in yanında yaşar. `createPortal`, JSX'i DOM'da başka bir yere *(genellikle `document.body`)* render eder; event'ler ve context React ağacındaki yerine göre çalışmaya devam eder.[^10] Basit diyaloglar için önce yerleşik `<dialog>` elemanına bakın; [HTML](/academy/web-fundamentals/html) dersi anlatıyor.

## Kendin dene

- `SearchBox`'a sayfa açılınca input'a odaklanma ekleyin. Önce `useEffect` ile, sonra ref callback ile yazın.
- Bir ürün kartının genişliğini `ResizeObserver` ile ölçen ref callback'i yazın; cleanup'ı silip kartı birkaç kez gizleyip gösterin.
- Render sırasında `inputRef.current?.value`'yu ekrana basmayı deneyin ve lint'in uyarısını okuyun.
- Bir listeyi saran `<div>`'i kaldırıp yerine Fragment ref'i ile "görünür olunca logla" davranışı ekleyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "Referencing Values with Refs" ve "Manipulating the DOM with Refs"; ikisi birlikte ref konusunun tamamı.[^1][^3]
- **Yazı:** [TkDodo](https://tkdodo.eu/)'nun ref callback'leri React 19 ve compiler ile yeniden değerlendirdiği yazı.[^7]
- **Resmi doküman:** React 19.3 duyurusunun Fragment Refs bölümü; `InView` örneği.[^8]

## Kaynaklar

1. [React: Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) *(doc)* — Ref ile state farkı, ne zaman kullanılacağı ve render'da okumama.
2. [React: refs lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/refs) *(doc)* — Render sırasında `ref.current` okuma ve yazmayı yakalayan kural.
3. [React: Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) *(doc)* — Odak, kaydırma, ref'in ne zaman bağlandığı ve React'in DOM'unu değiştirmeme.
4. [React v19](https://react.dev/blog/2024/12/05/react-19) *(doc)* — `ref`'in prop olması, `forwardRef`'in kaldırılacağı ve ref callback cleanup'ı.
5. [React: useImperativeHandle](https://react.dev/reference/react/useImperativeHandle) *(doc)* — Sınırlı bir ref API'si açmak ve prop ile ifade edilebileni ref'e koymamak.
6. [React: Common components, ref callback](https://react.dev/reference/react-dom/components/common#ref-callback) *(doc)* — Ref callback'in çağrılma zamanı, cleanup ve Strict Mode davranışı.
7. [TkDodo](https://tkdodo.eu/): [Ref Callbacks, React 19 and the Compiler](https://tkdodo.eu/blog/ref-callbacks-react-19-and-the-compiler) *(article)* — 8 Aralık 2024. `ResizeObserver` ile cleanup ve ref callback ya da Effect seçimi.
8. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — 9 Eylül 2026. Fragment Refs'in kararlı olması ve `FragmentInstance` metotları.
9. [React: Fragment](https://react.dev/reference/react/Fragment) *(doc)* — `<Fragment ref>` ve `FragmentInstance` referansı.
10. [React: createPortal](https://react.dev/reference/react-dom/createPortal) *(doc)* — DOM'da başka bir yere render etmek, event ve context davranışı.
