# Profil kartı

- React 19, TypeScript, Tailwind CSS v4 (`@theme` ile token). Başka kütüphane ekleme.
- Kart `src/UserCard.tsx` içinde, `Profile` tipini (`src/data.ts`) prop olarak alan tek bileşen. `App.tsx` `profiles` listesini kartlara çevirir.
- Renkler, yazı tipleri ve boşluklar `src/index.css` içindeki `@theme` token'larından gelir. Bileşenlerde sabit renk (`#hex`, `rgb()`, `bg-[#...]`) yazma.
- Her kart bir `<article>`. İçinde isim `h2`, avatar `alt` metinli bir `img`, favori butonu (`aria-pressed` ve erişilebilir adı olan bir `button`) ve `cta` metniyle bir `button` bulunur. Sayfada tek `h1` olur.
- Uzun isim kartı taşırmamalı. 320 px genişlikte de çalışmalı.
- İş bitmeden `npm test` çalıştır. Hepsi geçmeden bitti deme.
