---
title: "Renk, kontrast ve hareket"
description: "Okunabilir renkler, yakınlaştırma ve azaltılmış hareket."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/color-contrast-and-motion"
---

## Kontrast nedir

**Kontrast oranı**, metnin (ya da bir arayüz parçasının) rengi ile arkasındaki renk arasındaki parlaklık farkını tek bir sayıyla ifade eder: `4.5:1` gibi. Oran yükseldikçe metin düşük görme keskinliği olan, renk algısı farklı olan ya da güneş altında telefona bakan herkes için daha kolay okunur.

Bu, webdeki en yaygın erişilebilirlik hatasıdır: 2026'da bir milyon ana sayfanın %83,9'unda düşük kontrastlı metin bulundu, sayfa başına ortalama 34 farklı örnekle.[^1]

## Metin kontrastı (1.4.3)

WCAG 2.2'nin **1.4.3 Contrast (Minimum)** kriteri (AA) iki eşik koyar:[^2]

| Ne | En az oran |
| :-- | :-- |
| Normal metin | 4.5:1 |
| Büyük metin: 18pt (yaklaşık 24px) ya da 14pt kalın (yaklaşık 18,5px) | 3:1 |

- **Yuvarlama yok:** 4.499:1 çıkan bir renk çifti 4.5:1'i karşılamaz.[^2]
- **İstisnalar:** Devre dışı (inactive) bir bileşenin metni, saf süs olan metin ve logo içindeki yazı bu kurala tabi değildir.[^2]
- **Neden 4.5:** Standart metin için önerilen 3:1, yaşla ve hafif görme kaybıyla azalan kontrast duyarlılığını telafi edecek şekilde 4.5:1'e çıkarılmıştır.[^2]

## Metin dışı kontrast (1.4.11)

**1.4.11 Non-text Contrast** (AA), metin olmayan ama anlam taşıyan görsellerin bitişik renge karşı en az **3:1** olmasını ister:[^3]

- Bir bileşeni tanıtan görsel: input kenarlığı, checkbox çerçevesi.
- Durumu gösteren işaret: seçili sekme, işaretli kutu, odak göstergesi.
- Grafiklerin anlam taşıyan parçaları: pasta grafiğin dilimleri, ikonlar.

Beyaz zemin üzerinde `#9D9D9D` gri kenarlıklı bir checkbox 2.7:1 ile bu kriteri geçemez. Devre dışı bileşenler ve tarayıcının değiştirilmemiş varsayılan görünümü istisnadır.[^3] Odak göstergesinin ayrıntıları Klavye ve Odak dersinde.

## DevTools'ta kontrol etmek

Chrome DevTools kontrastı birkaç yerden gösterir:[^4]

1. **Inspect tooltip:** Elements panelinde bir metnin üzerine gelince oran görünür; yetersizse uyarı ikonu çıkar.
2. **Color Picker:** Styles'ta `color` değerinin yanındaki kareye tıklayın, **Contrast ratio** bölümünü açın. AA ve AAA'yı geçip geçmediğini, renk alanındaki çizgilerle hangi tonların yeterli olduğunu gösterir; **Use suggested color** uygun bir rengi kendisi seçer.
3. **CSS Overview:** Tüm sayfadaki kontrast sorunlarını tek listede toplar (Colors > Contrast issues).

> [!TIP]
>
> Arka plan rengi tanımlı değilse (görsel ya da gradyan üstünde metin) oran görünmeyebilir; arka planı eyedropper ile sayfadan seçin. Hover ve focus durumlarını Styles panelindeki `:hov` düğmesiyle zorlayıp ayrıca kontrol edin.[^5]

Rendering sekmesindeki **görme bozukluğu emülasyonu** sayfayı bulanık görme ya da farklı renk algısıyla görmenizi sağlar.[^6] Otomatik tarama araçları Erişilebilirlik Testi dersinde.

## Bilgiyi yalnızca renkle vermeyin (1.4.1)

**1.4.1 Use of Color** (A), rengin bilgiyi iletmenin **tek** görsel yolu olmamasını ister. Kırmızı ile yeşili ayırt edemeyen biri için "kırmızı alanlar zorunludur" bir anlam taşımaz.[^7]

```tsx
// Kötü: hata yalnızca kırmızı kenarlıkla belli
<input className="border-red-600" />

// İyi: renk + ikon + metin
<input id="email" aria-describedby="email-error" className="border-red-600" />
<p id="email-error" className="text-red-700">
  <AlertIcon aria-hidden="true" /> Geçerli bir e-posta adresi girin.
</p>
```

Metin içindeki linkler için de aynı kural geçerlidir: link rengi çevredeki metinden en az 3:1 farklı olmalıdır; fark belirli bir rengi algılamaya dayanıyorsa alt çizgi gibi ek bir görsel ipucu şarttır.[^7]

> [!DONT]
>
> - Grafik serilerini, form hatalarını ya da durumları (aktif/pasif) yalnızca renkle ayırmayın.

> [!DO]
>
> - Renge ek olarak metin, ikon, desen ya da alt çizgi kullanın.[^7]

## APCA hakkında

Kontrastı daha gerçekçi ölçmeyi hedefleyen **APCA** algoritması bir dönem WCAG 3 taslağındaydı ama 2023'te çıkarıldı; WCAG 3'ün hangi algoritmayı kullanacağı hâlâ belirsiz ve standart en erken 2030'da bekleniyor, bu yüzden bugün geçerli olan WCAG 2 oranlarıdır.[^8]

## Metin büyütme ve reflow

Kullanıcılar metni büyütür ya da sayfayı yakınlaştırır. İki kriter bunun bozulmadan çalışmasını ister:

- **1.4.4 Resize Text (AA):** Metin, yardımcı teknoloji olmadan **%200**'e kadar büyütüldüğünde içerik ya da işlev kaybolmamalıdır; kırpılan, üst üste binen metin bu kriteri bozar.[^9]
- **1.4.10 Reflow (AA):** İçerik **320 CSS px** genişlikte yatay kaydırma gerektirmeden okunabilmelidir. Bu, 1280px genişliğindeki bir ekranda %400 yakınlaştırmaya denk gelir. Harita, veri tablosu, video gibi iki boyutlu düzen gerektiren içerik istisnadır.[^10]

Pratikte: yazı boyutlarını CSS dersinde gördüğünüz gibi `rem` ile verin, sabit `height` ile metin kutusunu kilitlemeyin, düzeni responsive kurun. Test için tarayıcıda %400'e yakınlaştırın ya da DevTools'ta genişliği 320px'e indirin.

## Hedef boyutu (2.5.8)

WCAG 2.2 ile gelen **2.5.8 Target Size (Minimum)** (AA), tıklanan ya da dokunulan hedeflerin en az **24x24 CSS px** olmasını ister.[^11][^12]

```css
.icon-button {
  min-width: 24px;
  min-height: 24px;
}
```

Hedef daha küçükse, merkezine 24px çapında bir daire çizildiğinde komşu hedeflere değmeyecek kadar boşluk bırakmak da yeterlidir. Cümle içindeki linkler, aynı işi yapan yeterli boyutta bir alternatif ve tarayıcının değiştirilmemiş kontrolleri istisnadır. Önemli butonlar için daha sıkı olan 2.5.5 Target Size (Enhanced) hedeflenebilir.[^11]

## Azaltılmış hareket

Büyük yakınlaştırmalar, dönen öğeler ve özellikle **parallax**, vestibüler bozukluğu olan kişilerde baş dönmesi ve mide bulantısı tetikleyebilir.[^13][^14] İşletim sistemleri bunun için bir "hareketi azalt" ayarı sunar (Windows'ta Animation Effects, macOS ve iOS'ta Reduce Motion, Android'de Remove animations). Tarayıcı bu tercihi **`prefers-reduced-motion`** media query'siyle sayfaya iletir; tüm tarayıcılarda 2020'den beri desteklenir.[^13]

İşletim sistemi web animasyonlarını kendiliğinden kapatmaz, tercihe uymak geliştiricinin işidir.[^15] Önerilen yaklaşım **no-motion-first**: animasyonu varsayılan olarak yazmayın, yalnızca kullanıcı bir tercih belirtmediyse ekleyin.[^15][^16]

```css
.card {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 300ms ease;
  }
  .card:hover {
    transform: translateY(-4px);
  }
}
```

"Azaltılmış" hiç hareket olmaması demek değildir. Büyük bir kaydırma ya da yakınlaştırmayı **crossfade**'e çevirmek, parallax'ı kaldırıp içeriği korumak yeterlidir; küçük renk ve opaklık değişimleri genellikle sorun yaratmaz.[^14] Hover gibi geri bildirimleri de tamamen silmeyin, yalnızca hareketsiz hale getirin.[^16]

Tailwind dersinden hatırlarsanız aynı iş variant'larla yapılır: `motion-safe:` yalnızca kullanıcı hareketi azaltmadıysa, `motion-reduce:` yalnızca azalttıysa uygulanır.[^17]

```html
<button class="motion-safe:transition motion-safe:hover:-translate-y-0.5">
  Kaydet
</button>
```

JavaScript ile çalışan animasyonlarda (React Spring, Framer Motion, GSAP) tercihi `window.matchMedia` ile okursunuz. Aşağıdaki hook Josh Comeau'nun örneğinden kısaltılarak uyarlandı; sunucuda tercih bilinmediği için başlangıç değeri "hareket azaltılmış" kabul edilir:[^18]

```tsx
"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: no-preference)";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(!mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(!e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

Ayarı değiştirmeden test etmek için DevTools'ta Command Palette'i açıp `prefers-reduced-motion: reduce` emülasyonunu seçebilirsiniz.[^15] Çok hareketli sayfalarda kullanıcıya sayfa içinde bir "animasyonları durdur" düğmesi sunmak da önerilir.[^14]

## Forced colors

Windows'taki yüksek kontrast temaları gibi **forced colors** modunda tarayıcı sizin renklerinizi kullanıcının seçtiği sınırlı bir paletle değiştirir ve `box-shadow`'u kaldırır. Yalnızca gölgeyle belirginleşen bir buton bu modda görünmez olabilir; `@media (forced-colors: active)` içinde `ButtonText` gibi bir sistem rengiyle kenarlık eklemek yeterlidir. Bu modu ayrı bir tasarıma dönüştürmeyin, yalnızca bozulan yerleri düzeltin.[^19] Tailwind'de karşılığı `forced-colors:` variant'ıdır.[^17]

## Detaylı öğrenmek için

- **Konuşma:** Val Head'in hareket hassasiyeti için güvenli animasyon tasarlamayı anlattığı konuşma (Web Directions Code 2020, Conffab'da ücretsiz hesapla izlenir).[^20]
- **Yazı:** Val Head'in hangi hareketin tetikleyici olduğunu ve yerine ne konacağını örneklerle anlattığı Smashing yazısı.[^14]
- **React'te animasyon:** Josh Comeau'nun `prefers-reduced-motion` yazısı; React Spring ile örnek ve SSR notu.[^15]
- **Kontrastın geleceği:** Adrian Roselli'nin WCAG 3 ve APCA'nın Nisan 2026 durumunu özetleyen yazısı.[^8]
- **WCAG 2.2'de ne değişti:** W3C'nin yeni kriterleri listeleyen özeti.[^12]

## Kaynaklar

1. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — Düşük kontrastlı metnin ana sayfalardaki yaygınlığı ve sayfa başına sayısı.
2. [W3C: Understanding SC 1.4.3 Contrast (Minimum)](https://w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) *(doc)* — 4.5:1 ve 3:1 eşikleri, büyük metin tanımı, istisnalar ve oranın gerekçesi.
3. [W3C: Understanding SC 1.4.11 Non-text Contrast](https://w3.org/WAI/WCAG22/Understanding/non-text-contrast) *(doc)* — Arayüz bileşenleri, durumlar ve grafikler için 3:1 kuralı.
4. [Chrome for Developers: Make your website more readable](https://developer.chrome.com/docs/devtools/accessibility/contrast?hl=en) *(doc)* — DevTools'ta düşük kontrastı bulma ve önerilen renkle düzeltme.
5. [WebAIM: Using Chrome Developer Tools to check contrast](https://webaim.org/articles/contrast/devtools) *(article)* — Color Picker adımları, arka plan seçimi ve hover/focus durumlarını test etme.
6. [Chrome for Developers: DevTools Tips: Discover and fix low contrast text](https://developer.chrome.com/blog/devtools-tips-5) *(doc)* — Kontrast araçları ve görme bozukluğu emülasyonunu gösteren kısa ipucu.
7. [W3C: Understanding SC 1.4.1 Use of Color](https://w3.org/WAI/WCAG22/Understanding/use-of-color.html) *(doc)* — Bilgiyi yalnızca renkle vermemek, link ve form alanı örnekleri.
8. [Adrian Roselli: WCAG3 Contrast as of April 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html) *(article)* — APCA'nın WCAG 3 taslağındaki durumu ve bugün için öneri.
9. [W3C: Understanding SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text) *(doc)* — Metnin %200'e kadar büyütülebilmesi ve istisnaları.
10. [W3C: Understanding SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) *(doc)* — 320 CSS px genişlikte iki yönlü kaydırma olmadan okuma.
11. [W3C: Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) *(doc)* — 24x24 CSS px hedef boyutu, boşluk testi ve istisnalar.
12. [W3C WAI: What's New in WCAG 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/) *(doc)* — WCAG 2.2'de eklenen dokuz kriter ve kaldırılan 4.1.1.
13. [MDN: prefers-reduced-motion](https://developer.mozilla.org/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) *(doc)* — Media query değerleri, işletim sistemi ayarları ve tarayıcı desteği.
14. [Val Head: Designing With Reduced Motion For Motion Sensitivities](https://www.smashingmagazine.com/2020/09/design-reduced-motion-sensitivities) *(article)* — Tetikleyici hareket türleri, crossfade alternatifi ve motion toggle.
15. [Josh W. Comeau: Accessible Animations in React with "prefers-reduced-motion"](https://joshwcomeau.com/react/prefers-reduced-motion/) *(article)* — No-motion-first yaklaşım, React hook'u ve DevTools'ta emülasyon.
16. [Michelle Barker: Respecting Users' Motion Preferences](https://smashingmagazine.com/2021/10/respecting-users-motion-preferences/) *(article)* — Reduced-motion-first CSS, `matchMedia` ve geri bildirimi korumak.
17. [Tailwind: Hover, focus, and other states](https://tailwindcss.com/docs/hover-focus-and-other-states) *(doc)* — `motion-safe:`, `motion-reduce:` ve `forced-colors:` variant'ları.
18. [Josh W. Comeau: usePrefersReducedMotion](https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/) *(article)* — Hareket tercihini okuyan React hook'unun kodu ve SSR notu.
19. [MDN: forced-colors](https://developer.mozilla.org/docs/Web/CSS/@media/forced-colors) *(doc)* — Forced colors modunda değişen özellikler, sistem renkleri ve öneriler.
20. [Val Head: Prefers Reduced Motion: Designing Safer Animation for Motion Sensitivities (Code 2020)](https://conffab.com/presentation/prefers-reduced-motion-designing-safer-animation-for-motion-sensitivities/) *(video)* — Hareket hassasiyeti, `prefers-reduced-motion` ve güvenli animasyon alternatifleri.
