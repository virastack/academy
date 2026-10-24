---
title: "Kurulum ve araçlar"
description: "Framework mü Vite mi, Strict Mode, lint kuralları ve AI ile React yazmak."
lastVerified: "2026-10-21"
translationKey: "react/setup-and-tooling"
---

## Bu rehber ne anlatıyor

[!react] resmi dokümanı [tr.react.dev](https://tr.react.dev) Türkçe ve çok iyi. Bu rehber onu tekrar etmiyor. Her derste konuyu kısaca özetleyip deneyimli mühendislerin önerilerini ve yaygın hataları topluyor. Sürüm: React 19.3 *(Eylül 2026)*.[^1]

Ön koşul, Web Temelleri'ndeki [JavaScript](/academy/web-fundamentals/javascript) dersi. [Kent C. Dodds](https://kentcdodds.com/)'un önerisi de aynı: React'e geçmeden önce destructuring, arrow function, `map`/`filter`, modüller ve Promise rahat olmalı; React'te karşılaştığınız zorlukların çoğu aslında JavaScript'tir.[^2] Tipler için [TypeScript](/academy/typescript/introduction-and-setup) rehberi ayrıca var; buradaki örnekler `.tsx` ama tip konusuna girmez.

## Framework mü, Vite mi?

React ekibi yeni bir uygulamaya bir **framework** ile başlamayı önerir: [!nextjs] *(App Router)*, [!react-router] *(framework modu)* ya da mobil için Expo. Framework'ler routing, veri çekme ve server rendering'i hazır getirir ve sunucu olmadan statik site olarak da yayınlanabilir.[^3]

React'in temellerini öğrenmek ya da sunucu gerektirmeyen bir SPA yazmak için **Vite** yeterlidir. Doküman bunun bir bedeli olduğunu açıkça söyler: routing, veri çekme ve SSR ihtiyacı doğduğunda kendi küçük framework'ünüzü yazmaya başlarsınız.[^4]

| Durum | Öneri |
| :-- | :-- |
| React öğreniyorsunuz | [!vite] |
| Panel, araç gibi yalnızca tarayıcıda çalışan SPA | Vite + React Router + [!tanstack-query] |
| SEO, ilk yükleme hızı, sunucu verisi önemli | Next.js ya da React Router framework modu |
| iOS ve Android | Expo |

> [!WARNING]
>
> `create-react-app` artık kullanılmıyor. React ekibi Şubat 2025'te yeni projeler için bıraktı.[^5] Eski bir tutorial `npx create-react-app` diyorsa güncel değildir.

Bu rehberdeki dersler Vite ile ilerler. Next.js'e özgü konular *(Server Components, Server Actions)* [Next.js](/academy/nextjs) rehberinde.

## İlk proje

```command
npm create vite@latest my-shop -- --template react-ts
```

```bash
cd my-shop
npm install
npm run dev
```

Vite şablonu React 19.3, TypeScript ve [Oxlint](https://oxc.rs) ile gelir.[^6] Önemli dosyalar:

| Dosya | Ne işe yarar |
| :-- | :-- |
| `index.html` | Tek HTML sayfası; `<div id="root">` burada |
| `src/main.tsx` | React'i `#root`'a bağlar |
| `src/App.tsx` | İlk component'iniz |
| `vite.config.ts` | Vite ve `@vitejs/plugin-react` ayarı |

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## Strict Mode

`<StrictMode>` yalnızca development'ta çalışan ek kontroller açar. Component'leri iki kez render eder, Effect'leri ve ref callback'lerini bir kez fazladan kurup söker, eski API'leri uyarır.[^7] Amaç, saf olmayan render'ı ve eksik cleanup'ı production'a çıkmadan yakalamaktır. Production build'i etkilemez.

> [!DONT]
>
> - "Effect'im iki kez çalışıyor" diye `StrictMode`'u kaldırmak. Çift çalışma bir hata değil, hatayı gösteren bir test. Çözüm cleanup yazmak; bunu Effect dersinde göreceksiniz.[^7]

## Lint: React kurallarını makineye bırakın

React'in kuralları *(Rules of React)* çoğu zaman hata vermeden bozulur; uygulama çalışır ama yanlış davranır. Bu yüzden lint şarttır.

Vite şablonundaki Oxlint yalnızca `rules-of-hooks` kuralını açar.[^6] React ekibinin kendi eklentisi `eslint-plugin-react-hooks` ise `recommended` preset'inde React Compiler'ın analizine dayanan kuralları da içerir: render sırasında state değiştirme, Effect içinde senkron `setState`, render'da `ref` okuma, component içinde component tanımlama gibi hataları yakalar. Bu kurallar compiler'ı kullanmasanız da çalışır.[^8]

[Kod Kalitesi](/academy/architecture/code-quality) rehberindeki [!eslint] kurulumuna eklentiyi ekleyin:

```command
npm install -D eslint-plugin-react-hooks
```

```js
// eslint.config.js
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([reactHooks.configs.flat.recommended]);
```

`recommended` preset'i yeni kurallar eklendikçe güncellenir; kuralları tek tek açmak yerine onu kullanın.[^9]

## React Compiler ve DevTools

**React Compiler**, memoization'ı build sırasında otomatik ekler. Vite şablonunda build hızına etkisi yüzünden kapalı gelir.[^6] Vite'ta açmak için:[^10]

```command
npm install -D babel-plugin-react-compiler @rolldown/plugin-babel
```

```ts
// vite.config.ts
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
```

Compiler'ın ne yaptığını ve `memo`/`useMemo` ile ilişkisini [React'te render performansı](/academy/performance-accessibility/render-performance) dersi anlatıyor.

**React Developer Tools** tarayıcı eklentisidir. **Components** sekmesinde ağacı, props'u ve state'i görür, değerleri canlı değiştirirsiniz. **Profiler** sekmesi render sürelerini ölçer.[^11]

## AI ile React yazarken

Model'ler eski React kodunu çok gördüğü için eski kalıpları önerebilir. React ekibinin react.dev'i yazarken kullandığı agent skill'i bile modele *"kendi bilgine şüpheyle yaklaş; çoğu zaman eski ya da yanlış React kalıplarıyla eğitildin"* der.[^12] Sık görülen eski öneriler:

| Eski öneri | Bugün |
| :-- | :-- |
| `create-react-app` | Vite ya da framework |
| `forwardRef` | `ref` sıradan bir prop |
| `<ThemeContext.Provider>` | `<ThemeContext value={...}>` |
| Türetilmiş değer için `useEffect` + `setState` | Render sırasında hesaplama |
| Her fonksiyona `useCallback` | React Compiler |

Üç şey işe yarar:

- **Güncel dokümanı bağlama verin.** react.dev, agent'lar için bir `llms.txt` dizini sunar ve her sayfanın sonuna `.md` eklediğinizde düz Markdown döner *(ör. `react.dev/learn/you-might-not-need-an-effect.md`)*.[^13]
- **Lint'i bekçi yapın.** Yukarıdaki kurallar AI'ın yazdığı kodu da denetler. Agent'a *"commit'ten önce `npm run lint` çalıştır"* deyin.
- **Kurallarınızı skill'e yazın.** Proje kurallarını ve Vercel'in `react-best-practices` gibi hazır skill'lerini [Skills](/academy/ai/skills) dersi anlatıyor.

## Kendin dene

- `my-shop` projesini kurun, `App.tsx`'te bir metni değiştirin ve sayfanın yenilenmeden güncellendiğini görün.
- `eslint-plugin-react-hooks`'u ekleyin. `App.tsx`'e bir component'in içinde ikinci bir component tanımlayın ve lint'in ne dediğini okuyun.
- React DevTools'u kurun, Components sekmesinde `App`'i seçip state'ini değiştirin.
- Bir AI aracına *"Vite ile React projesi kur"* deyin. Önerdiği komutu bu dersle karşılaştırın.

## Detaylı öğrenmek için

- **Resmi doküman:** React'in Türkçe dokümanı; "Hızlı Başlangıç" ve "React'te Düşünmek" sayfaları ilk okuma için en iyi yer.[^14]
- **Resmi doküman:** "Creating a React App" ve "Build a React App from Scratch" sayfaları; framework ile Vite arasındaki farkı anlatır.[^3][^4]
- **Video:** React Conf 2025'teki "React and AI" paneli; React ekibi ve araç geliştiricileri AI ile React yazmayı tartışıyor *(1. gün yayını)*.[^15]
- **Yazı:** [Kent C. Dodds](https://kentcdodds.com/)'un React'e başlamadan bilinmesi gereken JavaScript listesi.[^2]

## Kaynaklar

1. [React Blog: React 19.3](https://react.dev/blog/2026/09/09/react-19-3) *(doc)* — 9 Eylül 2026. View Transitions ve Fragment Refs'in kararlı olması, `browser()` ve Trusted Types desteği.
2. [Kent C. Dodds](https://kentcdodds.com/): [JavaScript to Know for React](https://kentcdodds.com/blog/javascript-to-know-for-react) *(article)* — 2020 tarihli; React'ten önce bilinmesi gereken JavaScript özellikleri.
3. [React: Creating a React App](https://react.dev/learn/creating-a-react-app) *(doc)* — Next.js, React Router ve Expo önerisi; framework'lerin sunucusuz da yayınlanabilmesi.
4. [React: Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch) *(doc)* — Vite, Parcel ve Rsbuild ile kurulum; kendi framework'ünü yazmanın bedeli.
5. [React Blog: Sunsetting Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app) *(doc)* — 14 Şubat 2025. CRA'nın yeni projeler için bırakılması ve geçiş yolları.
6. [Vite: create-vite templates](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) *(repo)* — `react-ts` şablonu; Oxlint ayarı ve React Compiler'ın neden kapalı geldiği. create-vite 9.3 ile kontrol edildi.
7. [React: StrictMode](https://react.dev/reference/react/StrictMode) *(doc)* — Development'ta çift render, Effect ve ref callback'lerinin yeniden çalıştırılması.
8. [React: eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) *(doc)* — Recommended kurallar ve React Compiler destekli lint'ler.
9. [React: eslint-plugin-react-hooks README](https://github.com/react/react/blob/main/packages/eslint-plugin-react-hooks/README.md) *(repo)* — Flat config kurulumu ve `recommended` preset'ini kullanma önerisi.
10. [React: React Compiler Installation](https://react.dev/learn/react-compiler/installation) *(doc)* — Vite için `reactCompilerPreset` ve `@rolldown/plugin-babel` kurulumu.
11. [React: React Developer Tools](https://react.dev/learn/react-developer-tools) *(doc)* — Tarayıcı eklentisi, Components ve Profiler sekmeleri.
12. [React: react.dev react-expert skill](https://github.com/reactjs/react.dev/blob/main/.claude/skills/react-expert/SKILL.md) *(repo)* — React dokümanının agent skill'i; modelin eski React kalıplarına şüpheyle yaklaşması uyarısı.
13. [React: Add llms.txt to react.dev](https://github.com/reactjs/react.dev/pull/8267) *(repo)* — react.dev'e `llms.txt` eklenmesi; sayfaların `.md` olarak sunulması.
14. [React: Türkçe doküman](https://tr.react.dev/learn) *(doc)* — React dokümanının topluluk tarafından çevrilen Türkçe sürümü.
15. [React: React Conf 2025, React and AI Panel](https://www.youtube.com/watch?v=zyVRg2QR6LA&t=18741s) *(video)* — 1. gün yayını. Lee Robinson moderatörlüğünde React ve AI paneli.
