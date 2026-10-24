---
title: "Erişilebilirlik testi"
description: "Otomatik tarama ve ekran okuyucuyla elle kontrol."
lastVerified: "2026-10-17"
translationKey: "performance-accessibility/accessibility-testing"
---

## Erişilebilirlik testi nedir

Erişilebilirlik testi, sayfanın klavye, ekran okuyucu ya da büyütme gibi farklı yollarla kullanılabildiğini kontrol etmektir. İki katmanı vardır: **otomatik tarama** (bir aracın kuralları DOM üzerinde çalıştırması) ve **elle kontrol** (sayfayı gerçekten klavyeyle ve ekran okuyucuyla kullanmak). İkisi birbirinin yerine geçmez, birbirini tamamlar.

## Otomatik araçlar neyi yakalar

Otomatik araçlar eksik `alt`, etiketsiz form alanı, düşük kontrast ya da geçersiz ARIA gibi kodda görülebilen sorunları hızlıca bulur. Ama "Bu `alt` metni görseli doğru anlatıyor mu?" ya da "Odak sırası mantıklı mı?" gibi bağlam isteyen soruları cevaplayamaz. Oranlar ölçüm yöntemine göre değişir:

| Çalışma | Bulgu |
| :-- | :-- |
| Deque, 2021 (2.000'den fazla denetim) | Sorunların ortalama %57'si otomatik testle bulundu. Oran sorun **sayısına** göre hesaplandı ve sık görülen hata türleri oranı yukarı çeker.[^1] |
| GOV.UK, 2017 (143 hatalı test sayfası) | En iyi araç hataların %41'ini buldu; 42 hatayı (%29) 10 aracın hiçbiri bulamadı.[^2] |
| Adrian Roselli, 2023 (tek sayfa, WCAG 2.1 AA) | Elle inceleme 37 hata buldu; axe 2, en iyi ücretsiz araç 5 hata buldu.[^3] |

WebAIM'in 2026 taramasında bir milyon ana sayfanın %95,9'unda otomatik olarak tespit edilen WCAG hatası vardı. Rapor aynı zamanda şunu hatırlatıyor: hata bulunmaması, sayfanın erişilebilir olduğu anlamına gelmez.[^4]

> [!WARNING]
>
> Temiz bir tarama raporu "erişilebilir" demek değildir. Otomatik test, elle kontrolün başlangıç noktasıdır.

## axe-core

**axe-core**, Deque'in açık kaynak erişilebilirlik kural motorudur. WCAG 2.0, 2.1 ve 2.2'nin A, AA ve AAA kurallarını kapsar ve sıfır yanlış pozitif hedefler: bir şeyi hata diye raporluyorsa gerçekten hatadır.[^5] Playwright entegrasyonu, tarayıcı eklentileri ve birçok başka araç bu motoru kullanır.

Temel kullanım tek fonksiyondur: `axe.run()` bir Promise döner, sonuçtaki `violations` dizisi boşsa otomatik yakalanabilen bir hata bulunmamıştır.[^5]

## Vitest ile component taraması

Component testlerinde render edilen DOM'u axe ile taramak için ek bir matcher paketine gerek yoktur; axe-core'u doğrudan çağırabilirsiniz. Vitest ve React Testing Library kurulumu [Vitest track'inde](/academy/vitest/setup) anlatılıyor.

```command
npm install -D axe-core
```

```tsx
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { expect, test } from 'vitest'
import { SignupForm } from './SignupForm'

test('SignupForm otomatik bulunabilen a11y hatası içermez', async () => {
  const { container } = render(<SignupForm />)
  const results = await axe.run(container)
  expect(results.violations).toEqual([])
})
```

Bilmeniz gereken iki sınır var. axe-core'un JSDOM desteği sınırlıdır ve `color-contrast` kuralı JSDOM'da çalışmaz; kontrastı gerçek tarayıcıda (Playwright ile) test edin.[^5][^6] Component portal ile render ediliyorsa `container` yerine `baseElement`'i tarayın.[^6]

> [!TIP]
>
> `toHaveNoViolations()` gibi bir matcher isterseniz `vitest-axe`, jest-axe'in Vitest için çatallanmış (fork) halidir ve aynı API'yi kullanır.[^7] Ancak paketin son sürümü 2022'de yayımlandı; eklemeden önce bakım durumuna bakın.[^7]

## Playwright ile sayfa taraması

Gerçek tarayıcıda tüm sayfayı taramak için `@axe-core/playwright` paketindeki `AxeBuilder` kullanılır.[^8] Playwright kurulumu [Playwright track'inde](/academy/playwright) anlatılıyor. Klavye gezinmesi, aria snapshot ve görsel testlerle birlikte CI'da çalıştırma [Erişilebilirlik ve görsel testler](/academy/playwright/accessibility-and-visual-tests) dersinde.

```command
npm install -D @axe-core/playwright
```

```tsx
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('ana sayfada otomatik bulunabilen a11y hatası yok', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

`withTags` taramayı belirli WCAG seviyeleriyle sınırlar; bazı axe kuralları WCAG'de karşılığı olmayan "best practice" kurallarıdır.[^8] Sayfanın bir bölümünü taramak için `.include('#menu')`, bilinen bir sorunu geçici olarak dışarıda bırakmak için `.exclude()` ya da `.disableRules(['duplicate-id'])` kullanılır. Açılır menü gibi etkileşimle görünen bir bölümü taramadan önce o bölümün görünmesini bekleyin.[^8]

> [!DO]
>
> - Menü, modal gibi durumları açıp öyle tarayın; kapalı bir menüdeki hata taramada görünmez.

> [!DONT]
>
> - `exclude` ile sorunları kalıcı olarak gizlemeyin; seçilen elemanın tüm alt elemanları da taranmaz.[^8]

## eslint-plugin-jsx-a11y

**eslint-plugin-jsx-a11y**, JSX'i kod çalışmadan statik olarak inceler ve hataları editörde, yazarken gösterir. Yalnızca statik koda baktığı için çalışan DOM'u test eden bir araçla ve yardımcı teknolojiyle test edilerek tamamlanmalıdır.[^9]

```js
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  jsxA11y.flatConfigs.recommended,
  // files ve globals ayarlarını ayrı bir nesnede ekleyin
]
```

Paylaşılan config `files` ya da globals ayarlamaz, bunları kendiniz eklersiniz.[^9] Next.js'in `eslint-config-next` paketi React, React Hooks ve Next.js kural setlerini getirir; zaten `jsx-a11y` gibi bir plugin kurduysanız çakışmayı önlemek için `@next/eslint-plugin-next`'i doğrudan kullanmanız önerilir.[^10]

## Lighthouse skorunun sınırı

Lighthouse erişilebilirlik skoru, otomatik denetimlerin ağırlıklı ortalamasıdır. Ağırlıklar axe'in kullanıcı etkisi değerlendirmesine göre verilir, her denetim ya geçer ya kalır. Elle yapılması gereken denetimler skora hiç girmez.[^11] Lighthouse'u çalıştırmayı [Ölçüm dersinde](/academy/performance-accessibility/measuring) gördünüz.

Manuel Matuzović, içeriği ekran okuyucudan gizleyen, odak çerçevesini kaldıran ve fareyi devre dışı bırakan, buna rağmen Lighthouse'tan 100 alan bir sayfa yaptı. Vardığı sonuç: otomatik test yalnızca ilk adımdır.[^12]

## Elle kontrol: Klavyeyle tur

Fareyi bir kenara bırakın ve sayfayı yalnızca klavyeyle kullanın:[^13]

- `Tab` ile ileri, `Shift+Tab` ile geri gidin. Link, buton, form alanı ve medya kontrollerinin hepsine ulaşabiliyor musunuz?
- Girdiğiniz her elemandan `Tab` ile çıkabiliyor musunuz (klavye tuzağı yok mu)?
- Odak mantıklı okuma sırasıyla mı ilerliyor?
- Odaklanan eleman her zaman net görünüyor mu?

macOS'ta önce sistem ayarlarından klavyeyle tüm kontrollere gezinmeyi açmanız gerekebilir.[^13] Bu kontrollerin nasıl düzeltileceği [Klavye ve odak yönetimi](/academy/performance-accessibility/keyboard-and-focus) dersinde.

## DevTools accessibility tree

Ekran okuyucunun okuduğu şey DOM değil, tarayıcının ürettiği erişilebilirlik ağacıdır (HTML dersinden hatırlayın). Chrome DevTools'ta görmek için:[^14]

1. **Elements** panelinde bir eleman seçin.
2. **Accessibility** sekmesini açın (görünmüyorsa "More Tabs" altında).
3. "Show accessibility tree" seçeneğini açın; DOM ağacı tüm sayfanın erişilebilirlik ağacıyla yer değiştirir.

Bir düğümü seçince tarayıcının hesapladığı özellikler **Computed Properties** altında görünür. Aynı sekmedeki **Source Order Viewer**, elemanların kaynak sırasını numaralarla gösterir.[^14]

## Ekran okuyucuya ilk adım

Ekran okuyucu bir yetenek gibi pratikle gelişir. Başlamak için birkaç kısayol yeterlidir.

**VoiceOver** (macOS'ta yerleşik, en iyi Safari ile çalışır):[^15]

| İşlem | Kısayol |
| :-- | :-- |
| Aç / kapat | `Cmd+F5` |
| VO tuşu | `Control+Option` |
| Sonraki öğe | `VO+Sağ ok` |
| Rotor (başlık, link, landmark listesi) | `VO+U` |
| Sonraki başlık | `VO+Cmd+H` |
| Konuşmayı durdur | `Control` |

**NVDA** (Windows için ücretsiz):[^16]

| İşlem | Kısayol |
| :-- | :-- |
| Başlat | `Ctrl+Alt+N` |
| Konuşmayı durdur | `Ctrl` |
| Sonraki satır | `Aşağı ok` |
| Sonraki başlık / landmark | `H` / `D` |
| Element listesi | `NVDA+F7` |
| Browse ve focus modu arasında geç | `NVDA+Space` |

NVDA tuşu olarak kurulumda Caps Lock'u seçebilirsiniz.[^16]

> [!TIP]
>
> İlk turda yalnızca üç şeye bakın: sayfanın başlıkları rotor ya da `H` ile anlamlı bir liste oluşturuyor mu, butonlar ve linkler adlarıyla okunuyor mu, form alanları etiketleriyle duyuruluyor mu?

## Detaylı öğrenmek için

- **Konuşma:** Manuel Matuzović, "Building the most inaccessible site possible with a perfect Lighthouse score" (Access All Areas 21).[^17]
- **Elle ilk inceleme:** W3C'nin Easy Checks rehberi, araç gerektirmeyen kontroller.[^13]
- **Araç karşılaştırması:** Adrian Roselli'nin elle inceleme ile dört ücretsiz aracı karşılaştırdığı yazı.[^3]
- **Ekran okuyucu rehberi:** WebAIM'in VoiceOver makalesi, iOS dahil daha fazla kısayol.[^15]

## Kaynaklar

1. [Deque: Automated Testing Study Identifies 57 Percent of Digital Accessibility Issues](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues) *(research)* — 2.000'den fazla denetime dayanan, sorun sayısına göre hesaplanmış otomatik test kapsamı.
2. [GOV.UK Accessibility Blog: What we found when we tested tools on the world's least-accessible webpage](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-) *(research)* — 10 otomatik aracın 143 hatalı bir sayfada ne kadarını bulduğu.
3. [Adrian Roselli: Comparing Manual and Free Automated WCAG Reviews](https://adrianroselli.com/2023/01/comparing-manual-and-free-automated-wcag-reviews.html) *(article)* — Aynı sayfada elle inceleme ile axe, ARC, WAVE ve Equal Access sonuçları.
4. [WebAIM Million 2026](https://webaim.org/projects/million/) *(research)* — Bir milyon ana sayfadaki otomatik tespit edilen hatalar ve otomatik aracın sınırı.
5. [dequelabs/axe-core](https://github.com/dequelabs/axe-core) *(repo)* — axe-core'un kapsadığı WCAG sürümleri, `axe.run` kullanımı ve JSDOM sınırları.
6. [jest-axe README](https://cdn.jsdelivr.net/npm/jest-axe@10.0.0/README.md) *(repo)* — React Testing Library ile axe kullanımı, JSDOM'da kontrast ve portal notu.
7. [npm: vitest-axe](https://www.npmjs.com/package/vitest-axe) *(doc)* — jest-axe'in Vitest için fork'u, matcher kurulumu ve sürüm geçmişi.
8. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — `AxeBuilder`, `withTags`, `include`/`exclude` ve otomatik testin sınırları.
9. [jsx-eslint/eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) *(repo)* — JSX'i statik inceleyen kurallar ve flat config kullanımı.
10. [Next.js: ESLint Plugin](https://nextjs.org/docs/app/api-reference/config/eslint) *(doc)* — `eslint-config-next` içeriği ve başka plugin'lerle çakışmayı önleme.
11. [Chrome for Developers: Lighthouse accessibility score](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) *(doc)* — Erişilebilirlik skorunun ağırlıklı ortalamayla hesaplanması.
12. [Manuel Matuzović: Building the most inaccessible site possible with a perfect Lighthouse score](https://www.matuzo.at/blog/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/) *(article)* — 100 puan alan ama kullanılamayan bir sayfa ve kullanılan hileler.
13. [W3C WAI: Easy Checks, A First Review of Web Accessibility](https://w3c.github.io/wai-website/test-evaluate/preliminary/) *(doc)* — Klavye erişimi ve görünür odak dahil araçsız ilk kontroller.
14. [Chrome for Developers: Accessibility features reference](https://developer.chrome.com/docs/devtools/accessibility/reference?hl=en) *(doc)* — Accessibility sekmesi, tam sayfa erişilebilirlik ağacı ve Source Order Viewer.
15. [WebAIM: Using VoiceOver to Evaluate Web Accessibility](https://webaim.org/articles/voiceover/) *(article)* — VoiceOver'ı açma, VO tuşları, rotor ve temel gezinme kısayolları.
16. [WebAIM: Using NVDA to Evaluate Web Accessibility](https://webaim.org/articles/nvda/) *(article)* — NVDA kurulumu, browse/focus modu ve temel kısayollar.
17. [Manuel Matuzović: Building the most inaccessible site possible with a perfect Lighthouse score (Access All Areas 21)](https://conffab.com/presentation/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/) *(video)* — Mükemmel otomatik skorun neden yeterli olmadığını gösteren konuşma.
