---
title: "Klavye ve odak yönetimi"
description: "Klavye ile gezinme ve görünür odak."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/keyboard-and-focus"
---

## Klavye Erişilebilirliği Nedir

Sayfanızı fare olmadan kullanan çok sayıda insan var: ekran okuyucu kullanıcıları, motor engeli olup klavyeyle, anahtar (switch) cihazıyla ya da ağız çubuğuyla gezinenler. Onlar için her işlemi kaç tuşa basarak yapabildikleri doğrudan bir engel meselesidir.[^1]

Klavyede temel kural basittir: `Tab` ve `Shift + Tab` odağı bir bileşenden diğerine taşır, ok tuşları ise menü ya da radio grubu gibi bir bileşenin içinde gezinir.[^2] O an klavye girdisini alan elemana **odak** (focus) denir. HTML dersinde gördüğünüz gibi `<button>`, `<a href>` ve form alanları bu davranışı tarayıcıdan bedava alır; bu derste odağın sırasını, görünürlüğünü ve JavaScript ile nereye taşınacağını ele alıyoruz.

## Tab Sırası ve DOM Sırası

Tab sırası varsayılan olarak elemanların **DOM'daki sırasıdır**. DOM sırası aynı zamanda ekran okuyucunun okuma sırası olduğu için ikisi uyumlu, mantıklı ve tahmin edilebilir kalmalıdır.[^2] Odak sırası sayfanın görsel sırasıyla da örtüşmelidir.[^3]

Sırayı değiştirmeniz gerekiyorsa HTML'deki sırayı değiştirin. CSS ile odaklanabilir elemanların yerini değiştirmek (örneğin flex ya da grid ile görsel sırayı ters çevirmek) klavye kullanıcısının gördüğü ile odağın gittiği yeri birbirinden koparır.[^4]

> [!TIP]
>
> Sayfanızı fareye dokunmadan, yalnızca `Tab`, `Shift + Tab`, `Enter`, `Space` ve `Esc` ile baştan sona kullanmayı deneyin. Odağın nerede olduğunu her an görebiliyor ve sırası mantıklı geliyorsa iyi bir yoldasınız.

## tabindex: 0 ve -1

`tabindex` bir elemanın klavyeyle odaklanıp odaklanamayacağını belirler.[^4]

| Değer | Ne yapar | Nerede kullanılır |
| :-- | :-- | :-- |
| `0` | Elemanı Tab sırasına DOM'daki yerine göre ekler | Özel bir widget'ın odak alması gereken kapsayıcısı |
| `-1` | Tab ile ulaşılamaz ama JavaScript ile `focus()` yapılabilir | Açılınca odak verilecek hata mesajı, başlık, panel |
| `1` ve üstü | Elemanı herkesten önce, sayıya göre sıralar | Kullanmayın |

`<button>`, `<a href>`, `<input>` gibi elemanlar zaten `tabindex="0"` gibi davranır; davranışı değiştirmeyecekseniz onlara `tabindex` eklemeyin.[^4] Pozitif değerler sayfanın doğal sırasını bozar ve klavye kullanıcısının gezinmesini zorlaştırır; yalnızca `0` ve `-1` kullanın.[^4][^3] Buna rağmen 2025'te masaüstü sayfaların %3,7'sinde pozitif `tabindex` vardı.[^5]

`tabindex="0"` bir `<div>`'i butona çevirmez: odak alır ama rolü, Enter/Space davranışı ve erişilebilirlik ağacındaki yeri eksik kalır.[^4] Önce gerçek `<button>` kullanın.

`-1`'in en yaygın kullanımı, form gönderilince hata özetine odak vermektir:

```tsx
"use client";

import { useEffect, useRef } from "react";

export function ErrorSummary({ errors }: { errors: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) ref.current?.focus();
  }, [errors]);

  if (errors.length === 0) return null;

  return (
    <div ref={ref} tabIndex={-1}>
      <h2>Formda {errors.length} hata var</h2>
      <ul>
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Görünür Odak ve :focus-visible

`:focus` odaktaki elemanı her zaman seçer. `:focus-visible` ise yalnızca tarayıcı kullanıcının odağı görmesi gerektiğine karar verdiğinde eşleşir: fareyle tıklanan bir butonda genellikle çerçeve çıkmaz, klavyeyle gelindiğinde ya da bir metin kutusu odaklandığında çıkar.[^6] Böylece odak çerçevesinin **ne zaman** görüneceğini tarayıcıya bırakıp yalnızca **nasıl** görüneceğini değiştirirsiniz.[^6]

Tuzak `outline: none`'dır. Varsayılan çerçeveyi "çirkin" diye kaldırmak, gören klavye kullanıcıları için sayfayı kullanılamaz hale getirir.[^6] Bu çok yaygın: 2025'te sitelerin %67'si varsayılan odak çerçevesini açıkça kaldırıyordu, `:focus-visible` kullananlar ise yalnızca %25 civarındaydı.[^5]

WCAG 2.2'de **2.4.7 Focus Visible** (AA) klavyeyle kullanılabilen her arayüzde odak göstergesinin görünür olduğu bir kullanım biçimi ister ve göstergenin bir süre sonra kaybolmasına izin vermez. Çerçeveyi kaldırmak ya da görünmez yapmak bu kriterde başarısızlık (F78) sayılır.[^7]

```css
/* Varsayılanı silmek yerine kendi göstergenizi verin */
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

Göstergeyi `border` ya da arka plan rengiyle değil `outline` ile yapmanın iki faydası var: düzeni kaydırmaz ve Windows'taki **forced colors** (yüksek kontrast) modunda korunur; `box-shadow` ve arka plan renkleri bu modda genellikle ezilir.[^8] Kesik çizgili (`dashed`) bir çerçeve kullanacaksanız aradaki boşlukları telafi etmek için kalınlığı yaklaşık iki katına çıkarın.[^8]

Daha sıkı olan **2.4.13 Focus Appearance** AAA seviyesindedir: göstergenin alanı bileşenin etrafındaki 2 CSS piksellik bir çerçeve kadar olmalı ve odaklı ile odaksız hal arasında en az 3:1 kontrast farkı yaratmalıdır.[^9] Alan şartını karşılamanın en basit yolu düz 2px bir `outline`'dır.[^9] Göstergenin arka plana göre kontrastı "Renk, kontrast ve hareket" dersinin konusu.

## Skip Link

Her sayfada tekrar eden menüyü klavyeyle tek tek geçmek yorucudur. **Skip link**, sayfanın ilk odaklanabilir öğesi olan ve doğrudan ana içeriğe atlayan bir bağlantıdır.[^1][^3] Genellikle odak gelene kadar gizlenir; ama `display: none` ya da `hidden` ile değil, ekran dışına alınarak, çünkü bu ikisi bağlantıyı klavyeden de kaldırır.[^1] Bağlantı metni gideceği yeri söylemelidir: "Ana içeriğe geç".[^3]

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <a href="#main-content" className="skip-link">
          Ana içeriğe geç
        </a>
        <header>{/* logo, nav */}</header>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
}
```

Bağlantının `href` değeri hedefin `id`'siyle eşleşmelidir.[^1] 2025 verilerine göre sayfaların yalnızca yaklaşık %24'ünde skip link vardı.[^5]

## Modal'da Odak

Modal açıldığında üç şey olmalı: odak modalın içine girmeli, arkadaki sayfa kullanılamaz olmalı ve modal kapanınca odak onu açan butona dönmeli.[^10][^11] Klavye kullanıcısı `Esc` ile kapatabilmeyi bekler.[^11]

Yerel `<dialog>` elementi bunların çoğunu bedava verir. `showModal()` ile açılan bir dialog sayfanın geri kalanını **inert** yapar, `Esc` ile kapanır ve odağı içindeki ilk odaklanabilir elemana taşır; başka bir yere odak vermek için `autofocus` kullanılır.[^11] Kapanınca tarayıcı odağı, sayfada hâlâ duruyorsa açan elemana geri verir.[^12] `<dialog>`'a `tabindex` eklemeyin.[^11]

```tsx
"use client";

import { useRef } from "react";

export function DeleteDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()}>
        Hesabı sil
      </button>
      <dialog ref={dialogRef} aria-labelledby="delete-title">
        <h2 id="delete-title">Hesabınız silinsin mi?</h2>
        <form method="dialog">
          <button autoFocus>Vazgeç</button>
          <button value="confirm">Sil</button>
        </form>
      </dialog>
    </>
  );
}
```

İlk odağın nereye gideceği için tek bir doğru yok. Kısa bir bilgi mesajında kapatma butonu uygundur; geri dönüşü olmayan bir işlemde en zararsız seçeneğe (örnekteki "Vazgeç") odak verin ki kullanıcı refleksle Enter'a basıp onaylamasın. Uzun içerikte dialog'un kendisine ya da başlığına odak vermek kullanıcının önce ne olduğunu anlamasını sağlar.[^13][^10]

Kendi overlay'inizi (yan menü, çekmece) yazıyorsanız arkadaki içeriğe `inert` attribute'u verin. `inert` bir alt ağacı Tab sırasından, tıklamalardan ve erişilebilirlik ağacından çıkarır ve Nisan 2023'ten beri tarayıcılar arasında yaygın olarak destekleniyor.[^14] Görsel olarak bir şey değişmediği için inert kısmı ayrıca belli etmek size kalır.[^14]

> [!DONT]
>
> - Modalı `<div>` ile yazıp arkadaki sayfayı odaklanabilir bırakmayın.
> - Modal kapandığında odağı `<body>`'ye düşürmeyin; kullanıcı sayfada nerede olduğunu kaybeder.[^2]

## SPA'da Sayfa Değişimi

Sunucudan yüklenen her sayfada ekran okuyucu yeni sayfanın başlığını okur. `next/link` ile yapılan client-side geçişlerde ise sayfa yeniden yüklenmez; bu yüzden Next.js varsayılan olarak bir **route announcer** ekler. Duyurulacak adı önce `document.title`'dan, yoksa `<h1>`'den, o da yoksa URL'den alır; bu yüzden her sayfaya benzersiz ve açıklayıcı bir başlık verin.[^15]

```tsx
// app/fiyatlar/page.tsx
export const metadata = { title: "Fiyatlar | ViraStack" };
```

Duyuru yalnızca ekran okuyucuya yarar; ekranı büyüterek ya da sesle kullanan kullanıcılar sayfanın değiştiğini fark etmeyebilir.[^16] Marcy Sutton'ın 2019'da farklı yardımcı teknoloji kullanıcılarıyla yaptığı testlerde ekran okuyucu kullanıcıları için en iyi sonucu yeni sayfanın başlığına odak vermek verdi; odağı uygulamanın en başına sıfırlamak ise bunaltıcı bulundu.[^16] Testlerin ardından önerisi, sayfa değişince odağı küçük ve görünür bir skip link'e taşımak ve sayfa adını bir live region ile duyurmaktı.[^16] Live region'ın kendisi "WCAG ve ARIA" dersinde anlatılıyor.

## Focus Not Obscured

WCAG 2.2 ile gelen **2.4.11 Focus Not Obscured (Minimum)** (AA), klavye odağı alan bileşenin sizin eklediğiniz içerik tarafından **tamamen** gizlenmemesini ister.[^17] Tipik suçlular yapışkan (sticky) header ve footer'lar ve cookie banner'larıdır: Tab'a bastıkça odak sayfanın altına iner ve sabit bir footer'ın arkasında kaybolur.[^17]

Çözümlerden biri CSS'te `scroll-padding` vermektir; tarayıcı odaklanan elemanı kaydırırken sabit alanın payını bırakır.[^17]

```css
html {
  scroll-padding-top: 5rem; /* sticky header yüksekliği */
  scroll-padding-bottom: 4rem; /* sticky footer ya da banner */
}
```

AAA seviyesindeki **2.4.12 Focus Not Obscured (Enhanced)** odaklı bileşenin hiçbir kısmının örtülmemesini ister; mümkünse bunu hedefleyin.[^17]

## Roving tabindex

Toolbar, tab listesi ya da radio grubu gibi bileşenlerde her öğeyi Tab sırasına koymak yerine yalnızca biri `tabindex="0"` alır, diğerleri `-1` olur ve ok tuşlarıyla `0` öğeden öğeye taşınır; buna **roving tabindex** denir.[^2] Bu tür bileşenleri sıfırdan yazmak yerine APG'deki kalıplara ve "WCAG ve ARIA" dersindeki headless kütüphanelere bakın.

## Detaylı Öğrenmek İçin

- **Klavye arayüzünün temeli:** W3C APG'nin "Developing a Keyboard Interface" rehberi; roving tabindex ve `aria-activedescendant` burada.[^2]
- **Odak göstergesi tasarımı:** Sara Soueidan'ın WCAG'e uygun odak göstergeleri rehberi.[^8]
- **SPA'da odak araştırması:** Marcy Sutton'ın client-side routing kullanıcı testleri.[^16]
- **Konuşma:** Anuradha Kumari, "Making Interactions Accessible to All Users" (React Summit 2023, 30 dk); klavye etkileşimi, odak çerçevesi ve dialog'da odak.[^18]

## Kaynaklar

1. [WebAIM: "Skip Navigation" Links](https://webaim.org/techniques/skipnav/) *(article)* — Skip link'in amacı, kimin işine yaradığı, odakta görünür olması ve hedefin `id` ile eşleşmesi.
2. [W3C WAI-ARIA APG: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) *(doc)* — Tab sırası ve DOM sırası, görünür odak, Tab ile ok tuşlarının rolü ve roving tabindex.
3. [web.dev: Keyboard focus](https://web.dev/learn/accessibility/focus) *(doc)* — Odak sırası, `tabindex` değerleri, odak göstergesi ve skip link.
4. [MDN: tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex) *(doc)* — `0`, `-1` ve pozitif değerler, pozitif değer ve CSS ile sıra değiştirme uyarısı.
5. [HTTP Archive Web Almanac 2025: Accessibility](https://almanac.httparchive.org/en/2025/accessibility) *(research)* — Odak çerçevesini kaldıran, `:focus-visible`, pozitif `tabindex` ve skip link kullanan sayfaların oranı.
6. [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible) *(doc)* — `:focus` ile farkı, tarayıcının odağı ne zaman gösterdiği ve çerçeveyi kaldırmanın etkisi.
7. [W3C: Understanding SC 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) *(doc)* — Kriterin metni, amacı ve F78 başarısızlığı.
8. [Sara Soueidan: A guide to designing accessible, WCAG-conformant focus indicators](https://sarasoueidan.com/blog/focus-indicators/) *(article)* — `outline` tercih etme, forced colors, `outline-offset` ve kalınlık önerileri.
9. [W3C: Understanding SC 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) *(doc)* — AAA odak göstergesi için alan ve 3:1 kontrast farkı şartı.
10. [W3C WAI-ARIA APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) *(doc)* — Modalda klavye etkileşimi, açılışta ilk odak ve kapanınca odağın dönmesi.
11. [MDN: `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) *(doc)* — `showModal()`, inert arka plan, `Esc`, `autofocus` ve erişilebilirlik notları.
12. [W3C: H102 Creating modal dialogs with the HTML dialog element](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) *(doc)* — Yerel dialog'un inert, `Esc` ve odağı açan elemana geri verme davranışı.
13. [Adrian Roselli: Where to Put Focus When Opening a Modal Dialog](https://adrianroselli.com/2025/06/where-to-put-focus-when-opening-a-modal-dialog.html) *(article)* — İçeriğin türüne göre modalda ilk odağın nereye verileceği.
14. [MDN: inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert) *(doc)* — `inert`'in odak, tıklama ve erişilebilirlik ağacına etkisi ve tarayıcı desteği.
15. [Next.js: Accessibility](https://nextjs.org/docs/architecture/accessibility) *(doc)* — Client-side geçişlerde route announcer'ın neyi duyurduğu.
16. [Marcy Sutton: What we learned from user testing of accessible client-side routing techniques](https://www.gatsbyjs.com/blog/2019-07-11-user-testing-accessible-client-routing) *(research)* — Sayfa değişiminde odak ve duyuru tekniklerinin yardımcı teknoloji kullanıcılarıyla testi.
17. [W3C: Understanding SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) *(doc)* — Sticky içerik, cookie banner, `scroll-padding` tekniği ve 2.4.12 ile ilişkisi.
18. [Anuradha Kumari: Making Interactions Accessible to All Users (React Summit 2023)](https://gitnation.com/contents/making-interactions-accessible-to-all-users/video) *(video)* — 30 dakika. Klavye etkileşimi, odak çerçevesi, dialog'da odak ve linkle buton farkı.
