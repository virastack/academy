---
title: "HTML"
description: "Anlamlı etiketler ve sayfa yapısı."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/html"
---

## HTML nedir

**HTML**, bir sayfanın içeriğini ve yapısını tarayıcıya anlatan işaretleme dilidir. Başlık, paragraf, link, görsel, form gibi her parça bir **element** ile yazılır. Bir element açılış etiketi, içerik ve kapanış etiketinden oluşur; ayarlar açılış etiketine **attribute** olarak eklenir.[^1]

```html
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <title>Page title</title>
  </head>
  <body>
    <p>Merhaba <strong>world</strong>.</p>
    <img src="kedi.jpg" alt="Pencerede uyuyan gri bir kedi" />
  </body>
</html>
```

`<head>` kullanıcının görmediği bilgileri (başlık, karakter seti) taşır, `<body>` ekranda görünen her şeyi içerir. `<img>` ve `<br>` gibi **void** elementlerin içeriği ve kapanış etiketi yoktur. Elementler düzgün iç içe yazılmalıdır: `<p><strong>…</strong></p>` doğru, `<p><strong>…</p></strong>` yanlıştır.[^1]

## Semantic HTML

**Semantic HTML**, etiketi nasıl göründüğüne göre değil **ne anlama geldiğine** göre seçmektir.[^2] `<div>` ve `<span>` tarayıcıya ve yardımcı araçlara içerik hakkında hiçbir şey söylemez. `<nav>`, `<button>` ya da `<h2>` ise ne olduklarını söyler.

Bu önemlidir, çünkü tarayıcı HTML'den bir **erişilebilirlik ağacı** (accessibility tree) üretir ve ekran okuyucular sayfayı buradan okur. Anlamlı etiketler sayfaya gezinilebilir bölümler (landmark) kazandırır.[^2] Görünüş ise HTML'in değil CSS'in işidir; bir etiketi varsayılan stili hoşunuza gidiyor diye seçmeyin.[^2]

Ölçek büyüktür: 2026'da bir milyon ana sayfanın %53,1'inde görsellerde alternatif metin, %51'inde form alanlarında etiket eksikti.[^3] Çoğu, doğru etiket seçilseydi çıkmayacak hatalardır.

## Sayfa iskeleti

Bir sayfayı bölmek için kullanılan başlıca etiketler şunlardır:[^4]

| Etiket | Ne için |
| :-- | :-- |
| `<header>` | Sayfanın ya da bir bölümün üst kısmı (logo, başlık) |
| `<nav>` | Ana gezinme bağlantıları |
| `<main>` | Sayfaya özgü ana içerik; **sayfada bir kez** kullanılır |
| `<article>` | Tek başına anlamlı, bağımsız içerik (blog yazısı, ürün kartı) |
| `<section>` | Tematik bir grup; başında bir başlık olmalı |
| `<aside>` | Ana içerikle dolaylı ilişkili yan bilgi |
| `<footer>` | Sayfanın ya da bölümün alt kısmı |

```html
<body>
  <header>
    <nav>…</nav>
  </header>
  <main>
    <article>
      <h1>Post title</h1>
      <p>…</p>
    </article>
    <aside>Related posts</aside>
  </main>
  <footer>…</footer>
</body>
```

HTML Standard'a göre `<section>` genel amaçlı bir kutu değildir; yalnızca stil vermek için bir kapsayıcı gerekiyorsa `<div>` kullanılır.[^5] Üstteki `<header>` ve `<footer>` sayfa düzeyinde landmark olur, `<article>` ya da `<section>` içindekiler olmaz.[^6]

> [!TIP]
>
> Uygun anlamlı bir etiket yoksa `<div>` kullanmakta sakınca yok. Sorun, anlamlı etiket varken `<div>` yazmaktır.[^4]

## Başlıklar

`<h1>`'den `<h6>`'ya kadar altı başlık seviyesi vardır. Başlıklar sayfanın içindekiler tablosu gibidir; ekran okuyucu kullanıcıları başlıklar arasında atlayarak gezinir.[^7]

> [!DO]
>
> - Sayfada genellikle tek `<h1>` kullanın.
> - Seviyeleri sırayla inin: `<h1>`, `<h2>`, `<h3>`.

> [!DONT]
>
> - `<h2>`'den `<h4>`'e atlamayın.
> - Yazıyı büyütmek için başlık kullanmayın; bunun için CSS `font-size` vardır.[^8]

## Doğru etiketi seçmek

### Button ve link

Link bir **başka yere götürür**, buton **bulunduğunuz sayfada bir işlem yapar** (menü açmak, formu göndermek gibi).[^9]

```html
<a href="/fiyatlar">See the prices</a>
<button type="button">Open the menu</button>
```

`<div onclick="…">` ile buton yapmak kolay görünür ama klavyeyle odaklanma, Enter ve Space ile çalışma gibi tarayıcının bedavaya verdiği her şeyi kaybettirir; sonra hepsini elle yazmanız gerekir.[^7][^10]

> [!WARNING]
>
> `<div>` bir buton gibi davranmaz. Önce `<button>` kullanın.

### Form alanları

Her form alanının bir `<label>`'ı olmalıdır. Etiket alanın ne için olduğunu ekran okuyucuya söyler, ayrıca tıklayınca alana odaklanır.[^11]

```html
<label for="email">E-posta</label>
<input id="email" type="email" name="email" />
```

### Görseller

`alt` görselin ilettiği bilgiyi kısa anlatır. Görsel süs içinse `alt=""` bırakılır; böylece ekran okuyucu atlar. Link ya da buton içindeki görselin alt metni gideceği yeri ya da yaptığı işi anlatır.[^12]

### Link metni

"Buraya tıklayın" yerine tek başına okunduğunda anlamlı bir metin yazın: "Balinalar hakkında daha fazla bilgi".[^7]

## ARIA'dan önce HTML

**ARIA**, HTML'in yetmediği durumlarda elemente rol ve durum ekleyen özelliklerdir (`role`, `aria-label`). W3C'nin ilk kuralı şudur: gereken anlam ve davranışı veren yerel bir HTML elementi varsa ARIA eklemek yerine onu kullanın.[^13] `role="button"` yalnızca anlam ekler, klavye davranışını eklemez.[^2] Veriler de ARIA kullanan sayfalarda ortalama hatanın daha yüksek çıktığını gösteriyor (59,1'e karşılık 42), karmaşık sayfaların daha çok ARIA kullanması bunun bir kısmını açıklayabilir.[^3]

## Detaylı öğrenmek için

- **Baştan sona kurs:** web.dev'in ücretsiz Learn HTML kursu.[^14]
- **Her etiketin tanımı:** MDN'in element listesi, işlevine göre gruplanmış.[^15]
- **Kendi sayfanı kontrol et:** W3C'nin Nu Html Checker doğrulayıcısı.[^16]
- **Konuşma:** Jen Luker'ın `button` ve `div` konuşması (12 dk).[^10]
- **Konuşma:** Marcy Sutton'ın link ve buton konuşması.[^17]

## Kaynaklar

1. [MDN: Basic HTML syntax](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax) *(doc)* — Element yapısı, attribute, void elementler, iç içe yazım, doctype ve `html/head/body`.
2. [web.dev: Semantic HTML](https://web.dev/learn/html/semantic-html) *(doc)* — Etiketi anlama göre seçmek, erişilebilirlik ağacı ve `role` ile gelmeyen davranış.
3. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — Ana sayfalardaki en yaygın erişilebilirlik hataları ve ARIA kullanımıyla hata sayısı.
4. [MDN: Structuring documents](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents) *(doc)* — `header`, `nav`, `main`, `article`, `section`, `aside`, `footer` tanımları ve `div` uyarısı.
5. [HTML Standard: Sections](https://html.spec.whatwg.org/multipage/sections.html) *(doc)* — `article` ve `section` tanımı; `section`'ın genel kapsayıcı olmadığı.
6. [web.dev: Headings and sections](https://web.dev/learn/html/headings-and-sections) *(doc)* — Landmark rolleri ve hangi `header`/`footer`'ın landmark olduğu.
7. [MDN: HTML, a good basis for accessibility](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML) *(doc)* — `button` ve `div` farkı, başlıklar, `label`, `alt` ve link metni.
8. [MDN: `<h1>`–`<h6>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/heading_elements) *(doc)* — Seviye atlamamak, tek `h1` ve başlığı boyut için kullanmamak.
9. [Marcy Sutton: Links vs. Buttons in Modern Web Applications](https://marcysutton.com/links-vs-buttons-in-modern-web-applications/) *(article)* — Link başka kaynağa götürür, buton bulunulan sayfada işlem yapar.
10. [Jen Luker: Button vs Div, What's the Big Deal Anyway? (React Summit 2020)](https://gitnation.com/contents/button-vs-div-whats-the-big-deal-anyway) *(video)* — 12 dakika. `div`'i erişilebilir butona çevirmek için gereken role, tabindex ve olay işleyicileri.
11. [web.dev Learn Forms: Accessibility](https://web.dev/learn/forms/accessibility) *(doc)* — Her form kontrolünün `label`'ı olmalı.
12. [W3C WAI: An alt Decision Tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) *(doc)* — `alt` metni ne zaman boş, açıklayıcı ya da işlevsel olur.
13. [W3C: Using ARIA](https://w3c.github.io/using-aria/) *(doc)* — ARIA'nın ilk kuralı: önce yerel HTML elementi.
14. [web.dev: Learn HTML](https://web.dev/learn/html/welcome) *(doc)* — Baştan sona ücretsiz HTML kursu.
15. [MDN: HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements) *(doc)* — Tüm elementler işlevine göre gruplanmış.
16. [Nu Html Checker](https://validator.w3.org/nu/) *(doc)* — W3C'nin HTML doğrulayıcısı.
17. [Marcy Sutton: The Links vs Buttons Showdown (SmashingConf SF 2017)](https://vimeo.com/214419495) *(video)* — Link ve buton seçimi, form özellikleri ve ARIA.
