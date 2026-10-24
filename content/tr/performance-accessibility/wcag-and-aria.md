---
title: "WCAG ve ARIA"
description: "Hedeflenen kurallar ve HTML'in yetmediği yerde ARIA."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/wcag-and-aria"
---

## Erişilebilirlik nedir

**Erişilebilirlik** (accessibility, kısaca a11y), bir sitenin engeli olan ya da olmayan herkes tarafından algılanabilmesi, kullanılabilmesi ve anlaşılabilmesidir. Kitle küçük değil: Dünya Sağlık Örgütü'ne göre 1,3 milyardan fazla kişi, yani dünya nüfusunun yaklaşık %16'sı bir engelle yaşıyor ve nüfus yaşlandıkça bu sayı artıyor.[^1]

Erişilebilirlik yalnızca kalıcı engelleri kapsamaz:[^2]

- **Kalıcı:** Görme, işitme, motor ya da bilişsel bir engel.
- **Geçici:** Bir kaza, ameliyat ya da ilaç nedeniyle kısa süreli yaşanan kısıtlar (kırık kol, göz ameliyatı).
- **Durumsal:** Ortamdan gelen kısıtlar; örneğin gürültülü bir yerde sesi duyamamak.

Yani altyazı, klavyeyle kullanım ya da net etiketler herkesin işine yarar.

## WCAG 2.2

**Web Content Accessibility Guidelines (WCAG)**, W3C'nin web içeriğinin erişilebilirliği için yayımladığı standarttır. Güncel sürüm **WCAG 2.2**'dir: Ekim 2023'te yayımlandı, Aralık 2024'te güncellendi ve 2.1'e 9 yeni başarı kriteri ekledi. Aynı zamanda ISO standardıdır (ISO/IEC 40500:2025).[^3]

WCAG 2.2'ye uyan içerik 2.1 ve 2.0'a da uyar; tek istisna 2.2'de kaldırılan 4.1.1 Parsing kriteridir.[^3]

### Dört ilke: POUR

Kriterler dört ilke altında toplanır.[^3] İlkelerin İngilizce baş harfleri **POUR** kısaltmasını oluşturur:

| İlke | Soru | Örnek |
| :-- | :-- | :-- |
| **Perceivable** (Algılanabilir) | İçerik görülebiliyor, duyulabiliyor mu? | Görsellerde `alt`, videoda altyazı |
| **Operable** (Kullanılabilir) | Her şey çalıştırılabiliyor mu? | Klavyeyle erişim, yeterli süre |
| **Understandable** (Anlaşılabilir) | İçerik ve davranış anlaşılır mı? | Sayfa dili, açık hata mesajları |
| **Robust** (Sağlam) | Yardımcı teknolojiler okuyabiliyor mu? | Doğru rol, isim ve durum |

### A, AA, AAA

Her kriter üç seviyeden birindedir: **A** (en temel), **AA** ve **AAA** (en sıkı).[^3] Pratikte hedef **AA**'dır. WCAG'a atıf yapan Avrupa ve Kuzey Amerika yasaları neredeyse her zaman AA ister; AAA ise bazı içerikler için karşılanması mümkün olmadığından WCAG'ın kendisi tüm site için AAA'yı genel politika olarak önermez.[^4]

> [!TIP]
>
> AAA kriterlerini çöpe atmayın: AA'yı tutturduktan sonra "daha iyisi ne olabilir" sorusunun cevabı genellikle oradadır.[^4]

### Yasal durum

**European Accessibility Act (EAA)**, AB'de e-ticaret, bankacılık, e-kitap, ulaşım hizmetleri, akıllı telefon ve bilgisayar gibi ürün ve hizmetler için ortak erişilebilirlik kuralları koyan bir direktiftir.[^5] 28 Haziran 2025'ten beri uygulanıyor; 10 kişiden az çalışanı ve 2 milyon avronun altında cirosu olan mikro işletmeler bazı yükümlülüklerden muaf.[^6] W3C, EAA için başvurulan sürümü WCAG 2.2 olarak listeler; EAA'ya uyum için çalışan kuruluşların çoğu WCAG'ı ve onu içeren Avrupa standardı EN 301 549'u kullanır.[^7][^3] AB'ye ürün ya da hizmet satan bir site yapıyorsanız bu sizi doğrudan ilgilendirir.

**WCAG 3** ise hâlâ taslaktır; birkaç yıl daha tamamlanması beklenmiyor ve tamamlandığında da WCAG 2'nin yerini hemen almayacak. W3C'nin bugün için önerisi WCAG 2.2'yi karşılamaktır.[^8]

## ARIA: Ne zaman gerekir

HTML dersindeki kuralı hatırlayın: anlamı ve davranışı veren yerel bir HTML elementi varsa ARIA değil o kullanılır. W3C'nin ARIA rehberi bunu daha sert söyler: "No ARIA is better than bad ARIA." Yanlış ARIA, ekran okuyucu kullanıcısına ekranda olmayan bir şeyi anlatır.[^9]

Sorun yaygın: 2026'da bir milyon ana sayfanın %82,7'si ARIA kullanıyor ve sayfa başına ortalama 133'ten fazla ARIA attribute'u var; bu sayı bir yılda %27 arttı.[^10]

**ARIA** (WAI-ARIA) üç şey ekler: **rol** (elementin ne olduğu), **özellik** (ek anlam, örneğin bağlı etiket) ve **durum** (açık mı, seçili mi gibi değişen bilgi).[^11] Yalnızca erişilebilirlik ağacını değiştirir; klavye davranışı, odak ya da tıklama eklemez, bunları JavaScript ile sizin yazmanız gerekir.[^11][^12]

## Erişilebilir isim

Her etkileşimli elementin bir **erişilebilir isim**'i (accessible name) olmalıdır; ekran okuyucu elementi bu isimle duyurur. Çoğu zaman isim zaten HTML'den gelir: butonun metni, `<label>`. HTML'in yetmediği üç durum için üç attribute vardır.

### aria-label

Görünür metni olmayan bir element için isim tanımlar. Tipik örnek yalnızca ikon içeren bir butondur.[^13]

```tsx
<button type="button" aria-label="Kapat" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>
```

`aria-label` yalnızca etkileşimli elementlerde, widget'larda, landmark'larda ve görsellerde güvenilir çalışır; düz bir `<div>` ya da `<span>`'e (rolü `generic` olan elementlere) isim vermez.[^13]

### aria-labelledby

İsmi sayfada zaten görünen bir metinden alır; değer, o metnin `id`'sidir. Birden fazla `id` boşlukla yazılabilir, isim bu sırayla birleşir.[^14]

```tsx
<h2 id="sepet-baslik">Sepetiniz</h2>
<ul aria-labelledby="sepet-baslik">…</ul>
```

### aria-describedby

İsme ek olarak daha uzun bir **açıklama** bağlar: ipucu, kural ya da hata mesajı. İsim kısa olmalı, açıklama ayrıntıyı taşır.[^15]

```tsx
<label htmlFor="sifre">Şifre</label>
<input id="sifre" type="password" aria-describedby="sifre-ipucu" />
<p id="sifre-ipucu">En az 12 karakter.</p>
```

### Öncelik sırası

Birden fazla kaynak varsa `aria-labelledby`, `aria-label`'ı ve `<label>`'ı ezer; `aria-label` de elementin kendi metnini ezer.[^14][^16] Bu yüzden ikisini aynı elemente yazmayın.[^13]

> [!DO]
>
> - İsmi önce yerel HTML ile verin (`<label>`, buton metni).
> - Görünür bir metin varsa `aria-labelledby` ile ona bağlayın.

> [!DONT]
>
> - Görünür etiket varken üstüne `aria-label` yazmayın. Görünmez, otomatik çeviride güvenilir şekilde çevrilmez ve diğer yöntemleri ezer.[^17]

## Durum attribute'ları

Ekranda renkle ya da ikonla gösterdiğiniz durum ekran okuyucuya kendiliğinden geçmez. React'te bu attribute'ları state'e bağlarsınız.

- **`aria-expanded`:** Bir paneli açıp kapatan kontrolün üzerine yazılır (panelin değil), `true`/`false` alır. Kontrol edilen elemente `aria-controls` ile işaret edilebilir.[^18]
- **`aria-pressed`:** Butonu açık/kapalı bir **toggle**'a çevirir. Durum değişince etiketi değiştirmeyin: "Sessize al" etiketi aynı kalır, durum `aria-pressed` ile söylenir.[^19]
- **`aria-current`:** Bir grup içinde şu anki öğeyi işaretler; navigasyonda o anki sayfanın linki için `aria-current="page"`. Bir grupta yalnızca bir öğe current olur.[^20]

```tsx
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" aria-expanded={open} aria-controls="panel-1" onClick={() => setOpen(!open)}>
        {title}
      </button>
      <div id="panel-1" hidden={!open}>
        {children}
      </div>
    </>
  );
}
```

Tailwind kullanıyorsanız `aria-expanded:` variant'ı ile stili de aynı attribute'a bağlayabilirsiniz; durum ve görünüm tek yerden yönetilir.

## Live region

Sayfa yenilenmeden değişen içerik (sepete eklendi, kaydedildi, 3 sonuç bulundu) ekran okuyucuya duyurulmaz. Bunun için **live region** kullanılır.[^11]

- **`aria-live="polite"`:** Değişiklik kullanıcı boşta kalınca okunur. Varsayılan tercih budur.[^21]
- **`aria-live="assertive"`:** O an okunan her şeyi keser; yalnızca acil durumlar için, az kullanın.[^21]
- **`role="status"`:** Örtük olarak `aria-live="polite"` taşır; kesmeden bilgi veren durum mesajları içindir. Mesaj gelince odağı oraya taşımayın.[^22]

```tsx
<p role="status">{saved ? "Değişiklikler kaydedildi." : ""}</p>
```

> [!WARNING]
>
> Live region içerik değişmeden **önce** sayfada olmalıdır. Elementi mesajla birlikte render ederseniz çoğu zaman duyurulmaz; boş haliyle ilk markup'ta bırakıp yalnızca içeriğini değiştirin.[^21]

## aria-hidden

`aria-hidden="true"` bir elementi ve tüm çocuklarını erişilebilirlik ağacından çıkarır ama ekranda görünmeye devam eder. Yan yana metni olan süs ikonları için idealdir.[^23]

> [!DONT]
>
> - Odaklanabilir bir elemente ya da onu içeren bir kapsayıcıya `aria-hidden="true"` vermeyin; klavye kullanıcısı ekran okuyucunun göremediği bir yere odaklanır.[^23]
> - `hidden` ya da `display: none` olan elemente ayrıca `aria-hidden` eklemeyin; zaten herkesten gizlidir.[^23]

## Karmaşık widget'lar

Tab, combobox, menü, tree gibi HTML'de karşılığı olmayan bileşenler için başvuru kaynağı **WAI-ARIA Authoring Practices Guide (APG)**'dir. Otuzdan fazla kalıbın her biri için hangi rolün, durumun ve klavye davranışının gerektiğini anlatır ve örnek uygulama verir.[^24] APG örnekleri öğrenmek içindir; üretime almadan önce tarayıcı ve ekran okuyucularda test edilmeleri gerekir.[^9]

Bunları sıfırdan yazmak yerine çoğu projede **headless** (stilsiz) bir kütüphane kullanılır:

- **Radix Primitives:** WAI-ARIA kalıplarını izler; rolleri, durumları, odak ve klavye davranışını yönetir. Etiketleri vermek yine sizin işiniz.[^25]
- **React Aria:** Adobe'nin 50'den fazla bileşenlik kütüphanesi; W3C'ye göre semantik ve klavye davranışı uygular, ekran okuyucularla test edilir, overlay'lerde odağı yönetir.[^26]

> [!TIP]
>
> Headless kütüphane ARIA'yı doğru yazar, ama `aria-label` gibi içerik sizden gelir. Kütüphane kullanmak test etmeyi gereksiz kılmaz.[^25]

## Detaylı öğrenmek için

- **Standart:** W3C'nin WCAG 2 genel bakışı; sürümler, ilkeler ve seviyelerin resmi özeti.[^3]
- **Widget kalıpları:** APG'de yapmak istediğiniz bileşenin sayfası, klavye tablosuyla birlikte.[^24]
- **Etiketleme stratejisi:** Adrian Roselli'nin etiketleme yöntemlerini öncelik sırasına koyduğu yazı.[^17]
- **Konuşma:** Siddharth Kshetrapal'ın GitHub'da erişilebilir React bileşenleri kurmayı VoiceOver ile gösterdiği 29 dakikalık konuşma (React Summit 2024).[^27]
- **Konuşma:** Kat Shaw'un ARIA'ya başlangıç konuşması; ne zaman ARIA, ne zaman yerel HTML (A11yTalks, Ağustos 2024).[^28]

## Kaynaklar

1. [WHO Europe: Disability fact sheet](https://www.who.int/europe/news-room/fact-sheets/item/disability) *(research)* — Dünya genelinde 1,3 milyardan fazla engelli kişi ve yaşlanmayla artan sayı.
2. [W3C WAI: Diverse Abilities and Barriers](https://www.w3.org/WAI/people-use-web/abilities-barriers/) *(doc)* — Engel türleri, geçici engeller ve durumsal kısıtlar.
3. [W3C WAI: WCAG 2 Overview](https://www.w3.org/WAI/standards-guidelines/wcag/) *(doc)* — WCAG 2.2'nin tarihi, dört ilke, A/AA/AAA, geriye uyumluluk ve ISO durumu.
4. [TetraLogical (Ian Pouncey): Understanding WCAG Level AAA](https://tetralogical.com/blog/2021/11/26/understanding-wcag-level-aaa/) *(article)* — Neden AA hedeflenir ve AAA neden tüm site için zorunlu tutulmaz.
5. [European Commission: European Accessibility Act](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en) *(doc)* — EAA'nın kapsadığı ürün ve hizmetler.
6. [Travers Smith: The European Accessibility Act now applies](https://www.traverssmith.com/knowledge/knowledge-container/a-new-milestone-for-accessibility-the-european-accessibility-act-now-applies/) *(article)* — 28 Haziran 2025 tarihi, mikro işletme muafiyeti ve geçiş süreleri.
7. [W3C WAI: Web Accessibility Laws & Policies, European Union](https://www.w3.org/WAI/policies/european-union/) *(doc)* — EAA ve Web Accessibility Directive için başvurulan WCAG sürümü ve EN 301 549.
8. [W3C WAI: WCAG 3 Introduction](https://www.w3.org/WAI/WCAG3) *(doc)* — WCAG 3'ün taslak durumu ve WCAG 2 ile ilişkisi.
9. [W3C APG: Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/) *(doc)* — "No ARIA is better than bad ARIA" ve ARIA'nın davranış eklemediği.
10. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — Ana sayfalarda ARIA kullanım oranı ve sayfa başına ARIA attribute sayısı.
11. [MDN: WAI-ARIA basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/WAI-ARIA_basics) *(doc)* — Rol, özellik ve durum; ARIA'nın ne zaman gerektiği ve live region örneği.
12. [MDN: ARIA states and properties](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes) *(doc)* — Tüm ARIA attribute'ları ve ARIA'nın yalnızca erişilebilirlik ağacını değiştirdiği.
13. [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label) *(doc)* — İkon butonu örneği ve `aria-label`'ın desteklendiği elementler.
14. [MDN: aria-labelledby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-labelledby) *(doc)* — Görünür metinden isim almak, birden fazla `id` ve öncelik.
15. [MDN: aria-describedby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-describedby) *(doc)* — İsim ile açıklama farkı ve açıklama bağlamak.
16. [Stefan Judis: The order of accessible name computation steps](https://www.stefanjudis.com/today-i-learned/the-order-of-accessible-name-computation-steps/) *(article)* — DevTools'ta erişilebilir isim kaynaklarının öncelik sırası.
17. [Adrian Roselli: My Priority of Methods for Labeling a Control](https://adrianroselli.com/2020/01/my-priority-of-methods-for-labeling-a-control.html) *(article)* — Etiketleme yöntemlerinin sırası ve `aria-label`'ın sakıncaları.
18. [MDN: aria-expanded](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-expanded) *(doc)* — Açılır panel kontrolü ve `aria-controls` ilişkisi.
19. [MDN: aria-pressed](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed) *(doc)* — Toggle buton, değerler ve etiketi değiştirmeme kuralı.
20. [MDN: aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current) *(doc)* — `page`, `step` gibi değerler ve navigasyonda kullanımı.
21. [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) *(doc)* — `polite`/`assertive` ve live region'ın önceden sayfada olması.
22. [MDN: ARIA status role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role) *(doc)* — `role="status"`'un örtük değerleri ve odak uyarısı.
23. [MDN: aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-hidden) *(doc)* — Süs içeriği gizlemek ve odaklanabilir elementlerde kullanmamak.
24. [W3C APG: Introduction](https://www.w3.org/WAI/ARIA/apg/about/introduction/) *(doc)* — APG'nin kalıp, örnek ve pratik bölümleri.
25. [Radix Primitives: Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) *(doc)* — WAI-ARIA kalıpları, odak ve klavye yönetimi, etiketlerin geliştiriciye kalması.
26. [React Aria](https://react-aria.adobe.com/) *(doc)* — Adobe'nin stilsiz, erişilebilir React bileşen kütüphanesi.
27. [Siddharth Kshetrapal: Building Accessible Reusable React Components at GitHub (React Summit 2024)](https://gitnation.com/contents/case-study-building-accessible-reusable-react-components-at-github) *(video)* — 29 dakika. Tab ve form örnekleriyle ARIA rolleri, durumları ve `aria-describedby`.
28. [Kat Shaw: What the Heck is ARIA? (A11yTalks, Ağustos 2024)](https://www.youtube.com/watch?v=Gvr27vkZCTE) *(video)* — ARIA'ya giriş: ne yapar, ne zaman yerel HTML tercih edilir.
