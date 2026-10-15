---
title: "Tasarımdan Bileşene"
description: "Agent, skill ve MCP ile bir Figma kart tasarımını çalışan, test edilmiş bir React bileşenine çevirme."
lastVerified: "2026-10-15"
translationKey: "ai/design-to-component"
---

Bu projede bir profil kartı tasarımını React bileşenine çevireceksiniz. Figma MCP tasarımı okur, skill görünümü yönlendirir, Playwright MCP sonucu tarayıcıda kontrol eder, hazır testler de "bitti" demenizi sağlar.

Dosyalar GitHub'da hazır: [design-to-component](https://github.com/virastack/academy/tree/main/examples/ai/design-to-component).

> [!NOTE]
>
> Proje `vite@7`, `react@19`, `tailwindcss@4`, `@playwright/test@1.64` ve `@axe-core/playwright@4.14` ile Node 22'de çalıştırıldı. Hazır testler örnek çözümde 10/10 geçti. Başlangıçta üç test kırmızı: kart yok.

## Hazırlık

```bash
git clone https://github.com/virastack/academy
cd academy/examples/ai/design-to-component/starter
npm install
npx playwright install chromium
npm test
```

Üç test kırmızı çıkmalı, çünkü sayfada henüz kart yok. Hedef bunları ve diğer yedisini yeşil tutmak.

Tasarım [Modern Profile Card UI](https://www.figma.com/community/file/1625904675991451970/modern-profile-card-ui-free-figma-template). Bağlantıyı açıp **Open in Figma** ile kendi hesabınıza kopyalayın.[^1] Kartın çerçevesini seçip bağlantısını alın. Uzak Figma MCP sunucusu çerçeve ya da katman bağlantısı ister.[^2]

> [!NOTE]
>
> Tasarım CC BY 4.0 ile lisanslı. Kullanırken tasarımcıyı anmanız, lisans bağlantısını vermeniz ve değişiklik yaptığınızı belirtmeniz gerekir.[^3] Hazır atıf satırı `design/README.md` içinde.

Figma ve Playwright MCP'yi bağlayın:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add playwright npx @playwright/mcp@latest
```

Eklenti yolu da var: `claude plugin install figma@claude-plugins-official`.[^4]

> [!WARNING]
>
> Ücretsiz planda Figma MCP çağrıları sınırlı. Figma'nın tablosunda Starter planda View ve Collab koltukları için ayda 20 çağrı yazıyor. Okuma yapan araçlar bu sınıra sayılıyor.[^5] Bu proje tek çerçeve kullandığı için birkaç çağrı yeter. Limitler değişebilir.

## Adım 1: Token'ları çıkarın

Önce renk, yazı tipi ve gölgeyi alın. Böylece bileşen kodunda sabit renk olmaz.

```text
Şu Figma çerçevesindeki değişkenleri ve stilleri (renk, yazı tipi, boşluk, gölge) listele:
<kart çerçevesi bağlantısı>
Bunları src/index.css içindeki @theme bloğuna Tailwind token'ı olarak ekle.
```

Bu iş için `get_variable_defs` aracı var. Seçimdeki renk, boşluk ve tipografi değişkenlerini verir.[^2]

**Kontrol:** `src/index.css` içindeki `@theme` dolu mu? Renk adları anlamlı mı (`--color-ink`, `--color-heart` gibi)?

## Adım 2: Bileşeni kurdurun

```text
Şu Figma çerçevesini src/UserCard.tsx içinde React ve Tailwind ile kur:
<kart çerçevesi bağlantısı>
Bileşen src/data.ts içindeki Profile tipini prop olarak alsın. App.tsx profiles listesini kartlara çevirsin.
Renkleri yalnızca src/index.css token'larından al.
Kart bir <article> olsun. İsim h2, avatar alt metinli img, kalp aria-pressed'li bir button, cta metniyle de bir button olsun.
```

`get_design_context` ana araçtır. Varsayılan çıktısı React ve Tailwind'dir.[^2] Skills rehberindeki `frontend-design` kuruluysa arayüz kararlarında ajana yön verir.

Başlangıç klasöründeki `CLAUDE.md` bu kuralları ajana zaten söylüyor. Tasarımdaki fotoğrafları kullanmak zorunda değilsiniz, `public/` içindeki yer tutucu görseller yeter.

> [!TIP]
>
> Çıktıda `bg-[#111111]` gibi sabit renkler görürseniz ajana "bunları token'a çevir" deyin. Hazır test bunu da yakalar.

## Adım 3: Tarayıcıda karşılaştırın

```text
npm run dev ile sayfayı aç. Playwright ile ilk kartın ekran görüntüsünü al.
Figma çerçevesinin ekran görüntüsüyle karşılaştır ve farkları listele: boşluk, yazı boyutu, köşe yuvarlaklığı, avatarın konumu, renk.
Farkları düzelt.
```

Playwright MCP sayfayı erişilebilirlik ağacından okur, ekran görüntüsü de alabilir.[^6] Figma tarafında `get_screenshot` çerçevenin görüntüsünü verir.[^2]

**Kontrol:** İki görüntüyü kendiniz de yan yana bakın. Ajanın "aynı" demesi yetmez.

## Adım 4: Testleri çalıştırın

```bash
npm test
```

On test şunları denetler:

| Test | Ne kontrol eder |
| --- | --- |
| Konsol | Sayfada konsol hatası yok. |
| Başlık | Tek `h1` var. |
| Kartlar | Her profil için bir `article`; isim `h2`, avatar, favori butonu, eylem butonu ve tüm metinler görünüyor. |
| Favori | Kalp tıklanınca `aria-pressed` açılıp kapanıyor, butonun erişilebilir adı var. |
| Taşma (320 ve 1280) | Yatay kaydırma yok, uzun isim dahil hiçbir öğe kartın dışına taşmıyor, butonlar en az 24x24 piksel. |
| Ekran görüntüsü | `screenshots/` klasörüne kart görüntüsü yazar (Adım 3 için). |
| Alt metin | Her görselde `alt` var. |
| Erişilebilirlik | axe ile ciddi ya da kritik WCAG ihlali yok. |
| Sabit renk | `src` içinde `#hex`, `rgb()`, `hsl()` ya da `oklch()` yok. |

Sabit renk testi, 24 piksel hedef sınırı ve axe etiketleri bu projeye özel seçimler. 24x24 sınırı WCAG 2.2 AA kriteridir (SC 2.5.8).[^7] axe yalnızca bir kısım sorunu yakalar, geri kalanı elle kontrol ister.[^8]

Test kırılırsa çıktıyı ajana yapıştırın: *"Bu test kırıldı, sebebini bul ve düzelt. Testi değiştirme."* Son cümle önemli. Ajan testi gevşeterek de geçirebilir.

## Bitti sayılır

1. `npm test` 10/10 yeşil.
2. `src/index.css` `@theme` içinde tasarımın renkleri var, bileşende sabit renk yok.
3. `screenshots/card-1.png` Figma çerçevesine gözle benziyor.
4. Klavyeyle Tab'a basınca kalp ve eylem butonuna sırayla ulaşıyorsunuz, Enter ya da Boşluk kalbi açıp kapatıyor, odak halkası görünüyor.

## Kaynaklar

1. [Figma Help: Community Licenses](https://help.figma.com/hc/en-us/articles/360038510873-Community-Licenses) *(doc)* — Ücretsiz Community dosyasını kendi taslaklarınıza kopyalama ve lisans koşullarının dosyaya göre değişmesi.
2. [Figma: Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) *(doc)* — Uzak sunucunun bağlantı isteği, `get_design_context`, `get_screenshot`, `get_variable_defs`, `get_metadata`.
3. [Creative Commons: CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) *(doc)* — Paylaşma, uyarlama ve ticari kullanım izni; atıf, lisans bağlantısı ve değişiklik belirtme şartı.
4. [Figma: MCP server guide](https://github.com/figma/mcp-server-guide) *(repo)* — Claude Code için kurulum komutları ve eklenti.
5. [Figma: Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) *(doc)* — Plan ve koltuğa göre çağrı sınırları.
6. [Playwright MCP](https://github.com/microsoft/playwright-mcp) *(repo)* — Erişilebilirlik anlık görüntüsü ve kurulum.
7. [W3C: Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) *(doc)* — Hedefler en az 24x24 CSS pikseli, AA düzeyi.
8. [Playwright: Accessibility testing](https://playwright.dev/docs/accessibility-testing) *(doc)* — axe ile otomatik tarama ve sınırları.
