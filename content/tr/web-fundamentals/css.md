---
title: "CSS"
description: "Seçiciler, kutu modeli ve sayfa düzeni."
lastVerified: "2026-10-17"
translationKey: "web-fundamentals/css"
---

## CSS Nedir

**CSS**, HTML ile kurulan yapının nasıl görüneceğini anlatan dildir. Her kural bir **seçici** ve süslü parantez içinde `property: value;` çiftlerinden oluşur. Seçici hangi elementlerin stilleneceğini, özellikler de neyin değişeceğini söyler.

```css
.card {
  padding: 1rem;
  color: #1f2937;
}
```

## Seçiciler

En sık kullanılan seçiciler şunlardır:[^1]

| Seçici | Örnek | Neyi seçer |
| :-- | :-- | :-- |
| Type | `h1` | Tüm `<h1>` elementlerini |
| Class | `.card` | `class="card"` olan her elementi |
| ID | `#header` | `id="header"` olan tek elementi |
| Universal | `*` | Her elementi |
| Liste | `h1, .title` | Virgülle ayrılan seçicilerin hepsini |

Class bir sayfada istendiği kadar kullanılabilir, ID ise sayfada bir kez kullanılır.[^1] Seçiciler **combinator** ile birleştirilerek elementin HTML'deki konumuna göre seçim yapılır: `nav a` nav içindeki tüm linkleri, `ul > li` yalnızca doğrudan çocukları, `h2 + p` başlıktan hemen sonraki paragrafı seçer.[^2] `:hover` gibi **pseudo-class**'lar elementin durumunu, `::before` gibi **pseudo-element**'ler elementin bir parçasını seçer.[^2]

## Hangi Kural Kazanır

Aynı elemente birden çok kural uyduğunda tarayıcı hangisinin uygulanacağına üç kavramla karar verir: **cascade**, **specificity** ve **inheritance**.[^3]

### Cascade

**Cascade**, çakışan kurallar arasında kazananı seçen algoritmadır.[^4] CSS spesifikasyonuna göre tarayıcı sırasıyla şunlara bakar: kuralın kaynağı ve `!important` olup olmadığı, `style` attribute ile yazılmış olup olmadığı, hangi cascade layer'da durduğu, seçicinin specificity'si ve son olarak kodda hangisinin sonra geldiği.[^5] Günlük işte çakışmaların çoğu son iki adımda çözülür: specificity eşitse sonra yazılan kural kazanır.[^4]

### Specificity

**Specificity**, seçicinin ne kadar "özel" olduğunu gösteren üç parçalı bir puandır: ID sayısı, class/attribute/pseudo-class sayısı, type/pseudo-element sayısı. Puanlar soldan sağa karşılaştırılır ve en yüksek puanlı kural kazanır; `*` puana bir şey eklemez.[^6]

```css
#header a     { color: red; }   /* (1, 0, 1) kazanır */
.nav .link    { color: blue; }  /* (0, 2, 0) */
nav a         { color: green; } /* (0, 0, 2) */
```

Soldan karşılaştırıldığı için tek bir ID, kaç class olursa olsun class'lardan oluşan bir seçiciyi yener. Bu yüzden ID ile stil vermek ve `!important` ile kural zorlamak, ileride o kuralı ezmeyi zorlaştırır. Gerçek sitelerde bu sık görülür: 100.000'den fazla sitenin incelendiği bir araştırmada ortanca site 154 `!important` içeriyordu.[^7]

> [!DO]
>
> - Stil için class kullanın, seçicileri kısa tutun.

> [!DONT]
>
> - Bir kuralı ezmek için ID ya da `!important` eklemeyin.

Büyük projelerde bu sorunu çözmek için **cascade layers** (`@layer`) vardır: layer sırası specificity'den önce gelir, böylece bir stil grubunun önceliği seçici yarışına girmeden belirlenir.[^8]

### Inheritance

Bazı özellikler ebeveynden çocuğa **miras** geçer, bazıları geçmez. `color` ve font özellikleri miras alınır; `width`, `margin`, `border` alınmaz.[^3] Bu yüzden `body`'ye verilen `color` sayfanın tamamına yayılır.

## Kutu Modeli

Tarayıcı her elementi bir kutu olarak çizer. Kutu içten dışa dört katmandan oluşur: **content** (içerik), **padding** (iç boşluk), **border** (kenarlık) ve **margin** (dış boşluk).[^9]

![CSS kutu modeli: içte content, onu saran padding, onun dışında border ve en dışta margin katmanı](https://raw.githubusercontent.com/virastack/academy/main/assets/web-fundamentals/css/box-model.png)

Varsayılan modelde `width` yalnızca içeriğe uygulanır, padding ve border üstüne eklenir. `width: 200px` ve `padding: 20px` verilen bir kutu ekranda 240px yer kaplar. `box-sizing: border-box` ile `width` border dahil tüm kutuyu kapsar, hesap tahmin edilebilir olur.[^10]

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

Kutunun dışa nasıl davrandığını `display` belirler. **Block** kutular yeni satırda başlar ve `width`/`height` alır (`div`, `p`, `h1`). **Inline** kutular satır içinde akar; `width` ve `height` uygulanmaz, dikey margin ve padding çevredeki satırları itmez (`span`, `a`).[^9] Üst üste gelen iki block elementin dikey margin'leri toplanmaz, birleşir ve büyük olan kalır; buna **margin collapsing** denir.[^9]

## Birimler

`px` gibi **mutlak** birimler her zaman aynı boyutu verir. **Göreli** birimler ise bir başka değere göre hesaplanır, bu yüzden web'in esnek yapısına daha iyi uyar.[^11]

| Birim | Neye göre |
| :-- | :-- |
| `rem` | Kök elementin (`html`) font boyutu, varsayılan 16px |
| `em` | Elementin font boyutu; `font-size`'da kullanılırsa ebeveynin |
| `%` | Ebeveynin ilgili değeri (ör. genişlik) |
| `vw` / `vh` | Viewport genişliğinin / yüksekliğinin %1'i |
| `dvh` | Mobil tarayıcı çubukları açılıp kapandıkça değişen viewport yüksekliği |
| `ch` | Fontta "0" karakterinin genişliği |

Font boyutunu `px` ile vermek, kullanıcının tarayıcıda seçtiği yazı boyutunu yok sayar; `rem` bu tercihe uyar.[^11] Okunabilir satır uzunluğu için `max-width: 60ch` gibi bir değer işe yarar.[^11] Değerler `calc(100% - 2rem)` gibi hesaplamalarla birleştirilebilir.[^12]

Gerçek sitelerde `px` hâlâ her yerde: sitelerin %98,28'i `px`, %80,15'i `rem` kullanıyor.[^7]

## Flexbox ve Grid

Modern sayfa düzeni iki araçla kurulur. **Flexbox** tek boyutlu düzen içindir: öğeleri bir satır ya da sütun boyunca dizer. **Grid** iki boyutludur: satır ve sütunları birlikte kontrol eder.[^13]

### Flexbox

Flex container'ın bir **ana ekseni** (öğelerin dizildiği yön) ve ona dik bir **çapraz ekseni** vardır. `justify-content` ana eksende, `align-items` çapraz eksende hizalar.[^14] Varsayılan `flex-direction: row`'da ana eksen yatay, çapraz eksen dikeydir; bu yüzden `align-items` öğeleri dikeyde hizalar. `flex-direction: column` dendiğinde eksenler yer değiştirir: `justify-content` dikeyde, `align-items` yatayda çalışır.[^15]

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
```

`flex: 1` bir öğenin kalan boşluğu paylaşmasını sağlar. Arka planda bu, başlangıç boyutunu (`flex-basis`), büyüme (`flex-grow`) ve küçülme (`flex-shrink`) oranını birlikte ayarlar.[^15]

### Grid

Grid, tek bir elementi satır ve sütunlara böler; çocuklar bu hücrelere yerleşir.[^16] `fr` birimi kalan boşluğu oranlı paylaştırır, `repeat()` ve `minmax()` sütun tanımını kısaltır.[^17]

```css
.products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
```

Bu örnekte sütunlar en az 200px olur ve ekrana sığdığı kadar sütun açılır; media query yazmadan responsive bir kart listesi elde edilir. Sayfa iskeleti için `grid-template-areas` ile alanlara isim verilebilir; alanlar dikdörtgen olmak zorundadır.[^17]

> [!TIP]
>
> Öğeleri tek yönde dizecekseniz (menü, buton grubu) flexbox, satır ve sütunu birlikte kontrol edecekseniz (kart ızgarası, sayfa iskeleti) grid kullanın.[^13]

2022 verisine göre flexbox mobil sayfaların %74'ünde, grid ise %12'sinde kullanılıyordu.[^18]

## Responsive Tasarım

**Responsive tasarım**, sayfanın her ekran boyutunda düzgün görünmesi ve rahat kullanılmasıdır.[^19] Üç parçası vardır:

- **Viewport meta etiketi:** Mobil tarayıcının sayfayı küçültüp göstermesini engeller.[^20]
- **Esnek düzen:** Flexbox, grid ve göreli birimler.[^19]
- **Media query:** Belirli bir genişlikten sonra stili değiştirir.[^19]

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

```css
.layout {
  display: grid;
  gap: 1rem;
}

@media (width >= 768px) {
  .layout {
    grid-template-columns: 240px 1fr;
  }
}
```

Bu yaklaşıma **mobile-first** denir: önce dar ekran için tek sütun yazılır, ekran genişledikçe sütun eklenir.[^19] Breakpoint'leri popüler cihaz boyutlarına göre değil, içeriğin bozulmaya başladığı genişliğe göre seçin.[^20]

## Custom Property

**Custom property** (CSS değişkeni), bir değeri bir kez tanımlayıp her yerde kullanmayı sağlar. Adı iki tire ile başlar, `var()` ile okunur.[^21]

```css
:root {
  --color-primary: #2563eb;
  --radius: 0.5rem;
}

.button {
  background: var(--color-primary);
  border-radius: var(--radius, 4px);
}
```

`:root`'ta tanımlanan değer tüm sayfada geçerli olur ve miras yoluyla çocuklara iner; bir bileşende yeniden tanımlanarak yalnızca orada değiştirilebilir.[^21] `var()`'ın ikinci değeri, değişken tanımlı değilse kullanılan yedektir.[^22] Tema ve dark mode gibi işlerin temeli budur.

## Detaylı Öğrenmek İçin

- **Baştan sona kurs:** web.dev'in ücretsiz Learn CSS kursu; nesting, container queries ve anchor positioning gibi yeni konular da var.[^23]
- **Responsive tasarım:** web.dev'in Learn Responsive Design kursu.[^24]
- **Alıştırmalı yol:** MDN'in CSS styling basics modülü, ardından CSS layout modülü.[^25]
- **Sağlam düzen alışkanlıkları:** [Ahmad Shadeed](https://ishadeed.com/)'in Defensive CSS ipuçları; uzun metin, bozulan görsel gibi beklenmedik içerikte kırılmayan düzen.[^26]
- **Konuşma:** [Miriam Suzanne](https://www.miriamsuzanne.com/)'ın cascade ve cascade layers konuşması (JSHeroes 2025).[^27]
- **Konuşma:** [Jen Simmons](https://jensimmons.com/)'ın web'de sayfa düzeninin nasıl değiştiğini anlattığı konuşma (View Source 2018).[^28]

## Kaynaklar

1. [MDN: Basic selectors](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Basic_selectors) *(doc)* — Type, class, ID, universal ve selector list; ID'nin sayfada bir kez kullanılması.
2. [web.dev Learn CSS: Selectors](https://web.dev/learn/css/selectors) *(doc)* — Basit seçiciler, pseudo-class/element ve combinator'lar.
3. [MDN: Handling conflicts](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Handling_conflicts) *(doc)* — Cascade, specificity ve inheritance; hangi özelliklerin miras alındığı.
4. [web.dev Learn CSS: The cascade](https://web.dev/learn/css/the-cascade) *(doc)* — Cascade'in tanımı ve sıra, specificity, origin, importance adımları.
5. [CSSWG: CSS Cascading and Inheritance Level 5](https://drafts.csswg.org/css-cascade-5/) *(doc)* — Cascade sıralamasının resmi tanımı (§6.1).
6. [web.dev Learn CSS: Specificity](https://web.dev/learn/css/specificity) *(doc)* — Üç parçalı specificity puanı ve soldan sağa karşılaştırma.
7. [Project Wallace: The CSS Selection 2026](https://projectwallace.com/the-css-selection/2026) *(research)* — 100.000'den fazla sitenin CSS'i; `!important` ve birim kullanımı.
8. [MDN: Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers) *(doc)* — `@layer` ile stil gruplarını sıralamak; layer önceliğinin specificity'yi yenmesi.
9. [MDN: The box model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model) *(doc)* — Block ve inline kutular, kutu katmanları ve margin collapsing.
10. [web.dev Learn CSS: Box Model](https://web.dev/learn/css/box-model) *(doc)* — Kutu katmanları ve `box-sizing: border-box`.
11. [web.dev Learn CSS: Sizing Units](https://web.dev/learn/css/sizing) *(doc)* — Mutlak ve göreli birimler, `rem`/`em`, viewport birimleri ve `ch`.
12. [MDN: Values and units](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units) *(doc)* — Uzunluk birimleri, yüzde, renk yazımları ve `calc()`.
13. [web.dev Learn CSS: Layout](https://web.dev/learn/css/layout) *(doc)* — Flexbox tek boyut, grid iki boyut; block ve inline davranışı.
14. [MDN: Flexbox](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox) *(doc)* — Ana ve çapraz eksen, `flex` kısayolu ve hizalama.
15. [Josh W. Comeau](https://www.joshwcomeau.com/): [An Interactive Guide to Flexbox](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/) *(article)* — Etkileşimli örneklerle ana eksen, `flex-basis`, `flex-grow`, `flex-shrink`.
16. [Josh W. Comeau](https://www.joshwcomeau.com/): [An Interactive Guide to CSS Grid](https://www.joshwcomeau.com/css/interactive-guide-to-grid/) *(article)* — Track, `fr` ve template areas etkileşimli örneklerle.
17. [MDN: CSS grid layout](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids) *(doc)* — `fr`, `repeat()`, `minmax()`, `gap` ve `grid-template-areas`.
18. [Web Almanac 2022: CSS](https://almanac.httparchive.org/en/2022/css) *(research)* — Flexbox, grid ve custom property kullanım oranları.
19. [MDN: Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design) *(doc)* — Responsive tasarımın tanımı, esnek düzen, media query ve mobile-first.
20. [web.dev Learn Responsive Design: Media queries](https://web.dev/learn/design/media-queries) *(doc)* — Viewport meta etiketi ve içeriğe göre breakpoint seçimi.
21. [web.dev Learn CSS: Custom Properties](https://web.dev/learn/css/custom-properties) *(doc)* — `--` söz dizimi, `var()`, `:root` ve miras.
22. [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties) *(doc)* — `var()` yedek değeri ve custom property mirası.
23. [web.dev: Learn CSS](https://web.dev/learn/css) *(doc)* — Baştan sona ücretsiz CSS kursu.
24. [web.dev: Learn Responsive Design](https://web.dev/learn/design) *(doc)* — Düzen, tipografi, responsive görsel ve tema üzerine ücretsiz kurs.
25. [MDN: CSS styling basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics) *(doc)* — Seçicilerden hata ayıklamaya alıştırmalı modül.
26. [Ahmad Shadeed](https://ishadeed.com/): [Defensive CSS](https://defensivecss.dev/) *(article)* — Beklenmedik içerikte bozulmayan düzen için kısa ipuçları.
27. [Miriam Suzanne](https://www.miriamsuzanne.com/): [Cascading Layers of !mportance (JSHeroes 2025)](https://www.youtube.com/watch?v=4PkhzoFLJ0Q) *(video)* — Cascade neden böyle çalışır ve cascade layers.
28. [Jen Simmons](https://jensimmons.com/): [Everything You Know About Web Design Just Changed (View Source 2018)](https://talks.jensimmons.com/videos/h0XWcf) *(video)* — Web'de sayfa düzeni anlayışının değişimi.
