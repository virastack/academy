---
title: "React'te render performansı"
description: "Gereksiz render ve pahalı güncellemeler."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/render-performance"
---

## Render Nedir

React'te **render**, React'in component fonksiyonlarınızı çağırıp ekranda ne olması gerektiğini hesaplamasıdır. Her ekran güncellemesi üç adımdan geçer: bir şey render'ı **tetikler** (ilk açılış ya da bir state güncellemesi), React component'leri **render** eder, sonra farkları DOM'a **commit** eder. React DOM'a yalnızca iki render arasında fark varsa dokunur.[^1]

Yani bir component'in yeniden render olması her zaman DOM'un değişmesi demek değildir; çoğu re-render hızlıdır. Sorun genellikle render sırasında yapılan pahalı iştir. Kent C. Dodds'un deyişiyle, render'larınızın tamamı gerekli olsa bile yavaşsalar kullanıcı yine kötü bir deneyim yaşar.[^2]

## React Neden Yeniden Render Eder

Her re-render bir **state değişikliğiyle** başlar. State'i değişen component yeniden render olur ve React onun altındaki **tüm** component'leri de yeniden render eder; prop olarak o state'i alıp almamaları fark etmez.[^3] Bir component dört sebepten render olur: kendi **state**'i değişti, **ebeveyni** render oldu (render yukarıdan aşağı akar, çocuk render olunca ebeveyn olmaz), kullandığı **context**'in değeri değişti ya da içinde kullandığı bir **hook**'un state'i değişti.[^4]

> [!WARNING]
>
> "Props değişince component render olur" yaygın bir yanlış bilgidir. `memo` kullanılmayan bir component, prop'ları aynı kalsa da ebeveyniyle birlikte render olur. Prop'lar yalnızca memoization devreye girdiğinde önem kazanır.[^3][^4]

## Ölçmeden Optimize Etmeyin

### React DevTools Profiler

React Developer Tools eklentisindeki **Profiler** sekmesinde kaydı başlatır, yavaş hissettiren etkileşimi yapar ve kaydı durdurursunuz. Sonuç **commit**'lere bölünür; her commit'in **flame chart**'ında sarı çubuklar uzun, mavi çubuklar kısa süren render'ları gösterir, gri olanlar o commit'te hiç render olmamıştır. **Ranked chart** ise component'leri render süresine göre sıralar.[^5]

İki ayar özellikle işe yarar:

- **Highlight updates:** DevTools ayarlarındaki "Highlight updates when components render" seçeneği, render olan component'leri ekranda yanıp sönen bir çerçeveyle gösterir.[^3][^6] Bir input'a yazarken bütün sayfa yanıp sönüyorsa state'in fazla yukarıda olduğunu hemen görürsünüz.
- **Render nedeni:** Profiler ayarlarındaki "Record why each component rendered while profiling" seçeneği, bir component'in hangi prop ya da state yüzünden render olduğunu kaydeder.[^3]

> [!TIP]
>
> Development modundaki milisaniyeler gerçeği yansıtmaz. Kesin sonuç için production build alın ve DevTools'taki CPU throttling ile yavaş bir cihazı taklit edin; sizin bilgisayarınız büyük ihtimalle kullanıcılarınızınkinden hızlıdır.[^3][^7]

### Performance Tracks

React 19.2 ile birlikte React, tarayıcının **Performance** paneline kendi izlerini ekler.[^8] Ölçüm dersinde gördüğünüz Performance panelinde kayıt aldığınızda **Scheduler** izi işin hangi öncelikte yapıldığını (kullanıcı etkileşimi için Blocking, `startTransition` için Transition) ve işin baştan yapılmasına yol açan **cascading update**'leri gösterir. **Components** izi ise render sürelerini flamegraph olarak verir; development build'de bir render'a tıklayınca değişen prop'ları görürsünüz. İzler development build'de açık, ek yük getirdiği için production build'de kapalıdır.[^9]

## React Compiler

**React Compiler**, kodunuzu build sırasında analiz edip memoization'ı otomatik ekleyen bir araçtır. İlk kararlı sürümü v1.0, Ekim 2025'te yayımlandı.[^10] Elle yazdığınız `memo`, `useMemo` ve `useCallback`'in yaptığını, Rules of React'e uyan kodda kendisi yapar; kodu yeniden yazmanız gerekmez.[^11]

Next.js 16'da `reactCompiler` seçeneği kararlıdır; paketi kurup config'te açarsınız:[^12]

```command
npm install -D babel-plugin-react-compiler
```

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = { reactCompiler: true };
export default nextConfig;
```

Vite ve Expo için de resmi kurulum yolları vardır; Expo SDK 54 ve sonrasında compiler varsayılan olarak açıktır.[^10] Bir component'i compiler dışında bırakmak için fonksiyonun başına `"use no memo"` yazılır.[^12]

> [!DO]
>
> - Yeni kodda memoization'ı compiler'a bırakın; `useMemo`/`useCallback`'i yalnızca hassas kontrol gereken yerde kullanın.[^10]
> - Mevcut `useMemo`/`useCallback`'leri compiler'ı açınca toplu silmeyin; silmek derleme sonucunu değiştirebilir, önce test edin.[^10]

## memo, useMemo ve useCallback Ne Zaman

Compiler kullanmıyorsanız ya da kaçış kapısına ihtiyacınız varsa üç araç vardır:

| Araç | Ne saklar | Ne zaman |
| :-- | :-- | :-- |
| `memo` | Component'in son render sonucunu | Aynı prop'larla sık render olan ve render'ı pahalı component'ler |
| `useMemo` | Bir hesaplamanın sonucunu | Fark edilir yavaş hesaplama, `memo`'lu çocuğa prop ya da başka bir hook'un bağımlılığı |
| `useCallback` | Bir fonksiyonu | `memo`'lu bir çocuğa fonksiyon geçerken |

`memo` bir garanti değil, performans optimizasyonudur. Render'da fark edilir bir gecikme yoksa gereksizdir.[^13] Bir hesaplamanın pahalı olup olmadığını `console.time` ile ölçebilirsiniz: toplamda 1ms ve üstü sürüyorsa memoize etmeye değer.[^7]

`memo`'lu bir component'e her render'da yeniden oluşan bir obje ya da fonksiyon geçerseniz `memo` hiçbir işe yaramaz; bu yüzden `useMemo` ve `useCallback` çoğu zaman `memo` ile birlikte kullanılır.[^13] Memoization bu nedenle kırılgandır: başka biri component'e satır içi bir obje ya da JSX `children` geçtiği an etkisi sessizce kaybolur.[^14]

## State'i Aşağı Taşımak ve children

`memo`'ya uzanmadan önce component yapısını değiştirmek çoğu zaman yeterlidir.[^15][^13]

**State'i aşağı taşıyın:** State'i onu gerçekten kullanan en küçük component'e koyun. Böylece state değişince yalnızca o component render olur, yanındaki pahalı ağaç etkilenmez. Örneğin bir input'un state'ini sayfanın kökünden, input'u içeren küçük bir `Form` component'ine taşırsanız yazarken `<ExpensiveTree />` render olmaz.[^15]

**İçeriği children olarak verin:** State'in pahalı ağacın üstünde durması gerekiyorsa, state'li kısmı `children` alan bir sarmalayıcıya taşıyın. `children` ebeveynde oluşturulduğu için sarmalayıcının state'i değişince React onları yeniden render etmez.[^15][^13]

```tsx
function ColorPicker({ children }: { children: React.ReactNode }) {
  const [color, setColor] = useState("red");
  return (
    <div style={{ color }}>
      <input value={color} onChange={(e) => setColor(e.target.value)} />
      {children}
    </div>
  );
}

<ColorPicker>
  <ExpensiveTree />
</ColorPicker>;
```

Aynı listede iki kural daha vardır: input ya da hover gibi geçici state'i global store'a veya ağacın tepesine koymayın, render'ı saf tutun. React'e göre performans sorunlarının çoğu, state güncelleyen Effect zincirlerinden çıkar.[^13]

> [!DONT]
>
> - Bir component'i başka bir component'in içinde tanımlamayın. Her render'da yeni bir component oluşur, React onu sıfırdan mount eder; bu re-render'dan da yavaştır ve state'i sıfırlar.[^4]

## Uzun Listelerde Virtualization

Binlerce satırlık bir listede sorun her satırın kendisi değil, DOM'un büyüklüğüdür: DOM büyüdükçe tarayıcının render işi de büyür ve hem ilk yükleme hem etkileşimler yavaşlar.[^16] **Virtualization**, yalnızca ekranda görünen satırları DOM'a koyup kaydırdıkça değiştirme tekniğidir.

React'te yaygın seçenek **TanStack Virtual**'dır. Görünüm üretmez (headless), yalnızca hangi satırın nerede duracağını hesaplar; liste, grid ve yatay kaydırmayı destekler.[^17][^18] Kurulum tek paketle yapılır:[^19]

```command
npm install @tanstack/react-virtual
```

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

function LongList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div key={row.key} style={{ position: "absolute", width: "100%", transform: `translateY(${row.start}px)` }}>
            {items[row.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

`count` toplam satır sayısı, `getScrollElement` kaydırılan kutu, `estimateSize` bir satırın tahmini yüksekliğidir.[^17] Sayfanın kendisi kayıyorsa `useWindowVirtualizer` kullanılır.[^17]

## useTransition ve useDeferredValue ile INP

**Interaction to Next Paint (INP)**, bir tıklama ya da tuşa basmadan sonra ekranın ne kadar sürede güncellendiğini ölçer. Gecikme üç parçadan oluşur: main thread'in meşgul olması yüzünden bekleme, event handler'ların çalışması ve yeni karenin çizilmesi.[^16] 2025'te sitelerin mobilde %77'si, masaüstünde %97'si iyi INP aldı.[^20]

Büyük bir render, main thread'i bloklayıp yazmayı ve tıklamayı geciktirir. React'in concurrent özellikleri acil olmayan render'ı duraklatıp tarayıcıya yol verebilir, böylece yazmak akıcı kalır.[^21]

### useTransition

`startTransition` içindeki state güncellemeleri **transition** olarak işaretlenir. Transition'lar bloklamaz ve kesilebilir: kullanıcı başka bir şeye tıklarsa React önce onu işler. `isPending` ile bekleme durumunu gösterebilirsiniz.[^22]

```tsx
const [isPending, startTransition] = useTransition();

function selectTab(next: Tab) {
  startTransition(() => setTab(next));
}
```

> [!WARNING]
>
> Controlled bir text input'un state'ini transition içinde güncellemeyin; yazılan karakter hemen görünmelidir. Input için ayrı, normal bir state tutun.[^22]

### useDeferredValue

Bir değerin "geride kalan" kopyasını verir: React önce eski değerle hızlıca render eder, yeni değerle render'ı arka planda dener.[^23]

```tsx
const [text, setText] = useState("");
const deferredText = useDeferredValue(text);

<input value={text} onChange={(e) => setText(e.target.value)} />
<SlowList text={deferredText} /> {/* SlowList memo ile sarılı */}
```

Bu, `SlowList`'i hızlandırmaz; yalnızca tuşlara basmayı bloklamamasını sağlar. `SlowList` `memo` ile sarılmalıdır, yoksa her tuşta yine render olur ve kazanç kaybolur. Debounce'tan farkı sabit bir gecikme seçmemeniz ve işin kesilebilmesidir.[^23]

Bu iki API tek bir component'in kendisi pahalıysa yardımcı olmaz ve ek CPU işi getirir; önce render'ı hızlandırmaya bakın.[^21]

## Detaylı Öğrenmek İçin

- **Konuşma:** Nadia Makarevich'in re-render nedenlerini ve composition tekniklerini anlattığı 23 dakikalık konuşması (React Summit 2022).[^24]
- **Konuşma:** Ivan Akulov'un yavaş bir filtre örneği üzerinden `startTransition`'ı anlattığı 23 dakikalık konuşması (React Summit 2023).[^21]
- **Konuşma:** Ruslan Lesiutin'in Performance Tracks ile profil çıkarmayı gösterdiği yaklaşık 21 dakikalık oturum (React Conf 2025, 1. gün yayını).[^25]
- **Yazı:** Nadia Makarevich'in re-render rehberi; nedenleri, kalıpları ve anti-pattern'leri tek sayfada toplar.[^4]
- **Resmi doküman:** React Compiler'ın kurulum, kademeli geçiş ve sorun giderme sayfaları.[^11]

## Kaynaklar

1. [React: Render and Commit](https://react.dev/learn/render-and-commit) *(doc)* — Trigger, render ve commit adımları; React'in DOM'u yalnızca fark varsa değiştirmesi.
2. [Kent C. Dodds: Fix the slow render before you fix the re-render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render) *(article)* — Re-render'ı azaltmadan önce yavaş render'ı bulup düzeltmek.
3. [Josh W. Comeau: Why React Re-Renders](https://joshwcomeau.com/react/why-react-re-renders) *(article)* — Re-render'ın state ile başlaması, props miti, `memo` ve Profiler ayarları.
4. [Nadia Makarevich: React re-renders guide: everything, all at once](https://www.developerway.com/posts/react-re-renders-guide) *(article)* — Re-render'ın dört nedeni, composition kalıpları ve anti-pattern'ler.
5. [React Blog, Brian Vaughn: Introducing the React Profiler](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html) *(doc)* — Profiler'da kayıt, commit'ler, flame chart renkleri ve ranked chart.
6. [facebook/react: Issue #17935](https://github.com/facebook/react/issues/17935) *(repo)* — DevTools'taki "Highlight updates when components render" ayarına dair hata raporu.
7. [React: useMemo](https://react.dev/reference/react/useMemo) *(doc)* — Hesaplamayı saklamak, pahalılığı ölçmek ve CPU throttling önerisi.
8. [React Blog: React 19.2](https://react.dev/blog/2025/10/01/react-19-2) *(doc)* — Performance Tracks ve Activity'nin duyurusu.
9. [React: React Performance tracks](https://react.dev/reference/dev-tools/react-performance-tracks) *(doc)* — Scheduler ve Components izleri, build türlerine göre kullanımı.
10. [React Blog: React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1) *(doc)* — Compiler'ın kararlı sürümü, kurulumu ve mevcut memoization önerileri.
11. [React: Introduction to React Compiler](https://react.dev/learn/react-compiler/introduction) *(doc)* — Compiler'ın ne yaptığı, önce/sonra örneği ve ilgili dokümanlar.
12. [Next.js: reactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler) *(doc)* — Next.js 16'da compiler'ı açmak, annotation modu ve `"use no memo"`.
13. [React: memo](https://react.dev/reference/react/memo) *(doc)* — `memo`'nun ne zaman işe yaradığı ve memoization'ı gereksiz kılan ilkeler.
14. [TkDodo: The Uphill Battle of Memoization](https://tkdodo.eu/the-uphill-battle-of-memoization) *(article)* — `memo`'nun neden kolay bozulduğu ve composition'ın neden önce gelmesi gerektiği.
15. [Dan Abramov: Before You memo()](https://overreacted.io/before-you-memo/) *(article)* — State'i aşağı taşımak ve içeriği `children` olarak yukarı kaldırmak.
16. [web.dev: Optimize Interaction to Next Paint](https://web.dev/articles/optimize-inp) *(doc)* — INP'nin üç aşaması, main thread'e yield ve DOM boyutunun etkisi.
17. [TanStack Virtual: React Virtual](https://tanstack.com/virtual/latest/docs/framework/react/react-virtual) *(doc)* — `useVirtualizer` ve `useWindowVirtualizer` seçenekleri.
18. [GitHub: TanStack/virtual](https://github.com/TanStack/virtual) *(repo)* — Headless, framework bağımsız virtualization kütüphanesi.
19. [TanStack Virtual: Installation](https://tanstack.com/virtual/latest/docs/installation) *(doc)* — React paketi `@tanstack/react-virtual` kurulumu.
20. [HTTP Archive: Web Almanac 2025, Performance](https://almanac.httparchive.org/en/2025/performance) *(research)* — Mobilde ve masaüstünde iyi INP alan sitelerin oranı.
21. [Ivan Akulov: React Concurrency, Explained (React Summit 2023)](https://gitnation.com/contents/react-concurrency-explained/video) *(video)* — 23 dakika. `startTransition` ile yazmayı bloklamayan filtre ve concurrency'nin maliyeti.
22. [React: useTransition](https://react.dev/reference/react/useTransition) *(doc)* — Transition'lar, `isPending` ve controlled input uyarısı.
23. [React: useDeferredValue](https://react.dev/reference/react/useDeferredValue) *(doc)* — Değeri ertelemek, `memo` şartı ve debounce'tan farkı.
24. [Nadia Makarevich: Let's Talk about Re-renders (React Summit 2022)](https://gitnation.com/contents/lets-talk-about-re-renders) *(video)* — 23 dakika. Re-render tetikleyicileri, `memo` tuzakları ve composition.
25. [Ruslan Lesiutin: Profiling with React Performance Tracks (React Conf 2025)](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=8276s) *(video)* — 1. gün yayınında yaklaşık 21 dakikalık oturum; Performance Tracks ile hata ayıklama.
