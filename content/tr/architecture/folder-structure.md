---
title: "Klasör Yapısı ve İsimlendirme"
description: "Feature-based yapı, dosya isimlendirme ve import kuralları."
lastVerified: "2026-10-15"
translationKey: "architecture/folder-structure"
---

Klasör yapısının işi basit: bir şeyi değiştireceğiniz zaman ilgili dosyaları tek yerde bulmak. Dosyaları türüne göre (`components/`, `hooks/`, `utils/`) değil, ait oldukları özelliğe göre (sepet, ürün listesi, ödeme) gruplarsanız bir özelliği değiştirmek tek klasörde biter. İlke Kent C. Dodds'ın colocation yazısındaki gibi: kodu ilgili olduğu yere olabildiğince yakın koyun.[^1]

Bu rehber, Next.js ve TanStack Start'ta aynı şekilde çalışan feature-based yapıyı, isimlendirme ve import kurallarını anlatıyor.

## Tür mü, özellik mi?

|  | Türe göre | Özelliğe göre |
| --- | --- | --- |
| Yapı | `components/`, `hooks/`, `stores/` altında her özelliğin dosyası | `features/cart/` altında sepetin tüm dosyaları |
| Sepeti değiştirirken | Birkaç büyük klasörde dosya aranır | Tek klasörde biter |
| Büyüdükçe | Bir özellik birçok klasöre dağılır | Özellik tek yerde kalır |

Türe göre dizilim Next.js ve Nuxt gibi framework'lerde başlaması kolay olduğu için yaygın. Ama proje büyüdükçe bir özelliği değiştirmek birçok büyük klasöre dokunmak demek oluyor.[^2]

## Üst düzey yapı

ViraStack AI şablonundaki yapının sadeleştirilmiş hali:[^3]

```text
src/
├── app/ | routes/   # yönlendirme
├── features/        # özellik modülleri
├── components/      # ortak bileşenler (ui/, layout/, shared/)
├── hooks/           # ortak hook'lar
├── lib/             # yapılandırılmış kütüphane örnekleri (API istemcisi, date-fns)
├── helpers/         # paket import'u olmayan saf fonksiyonlar
├── schemas/
├── stores/
├── types/
├── constants/
├── config/
├── providers/
├── styles/
└── env.ts
```

Listede olmayan klasör açmayın. Yeni bir klasöre ihtiyaç duyduğunuzda önce mevcutlardan birine uyup uymadığına bakın.[^3]

Asıl karar, proje kodunun yönlendirme klasörünün **dışında** durması:

|  | Next.js | TanStack Start |
| --- | --- | --- |
| Yönlendirme klasörü | `app/` | `src/routes/` |
| Framework'ün sunduğu seçenekler | Proje kodu `app` dışında, `app` içinde ya da rotaya göre bölünmüş olabilir[^4] | `-` önekli dosya ve klasörler rota ağacına girmez, rota klasörlerinde kod barındırmak için kullanılır[^5] |
| Framework'e ait özel adlar | `page`, `layout`, `route`, `_klasör`, `(grup)`, `[param]`[^4] | `__root`, `$param`, `_` öneki (pathless layout), `-` öneki[^5] |

Next.js yapı konusunda görüş bildirmiyor, seçtiğiniz stratejide tutarlı kalmanızı istiyor.[^4] ViraStack şablonunda `features/`, `components/` gibi klasörler `app/` ve `routes/` ile aynı seviyede duruyor, yani "proje kodunu `app` dışında tut" stratejisi uygulanıyor.[^3] `src/` klasörü Next.js'te isteğe bağlı, uygulama kodunu kök dizindeki yapılandırma dosyalarından ayırıyor.[^4]

## Feature klasörünün içi

```text
features/cart/
├── api/          # istek fonksiyonları ve API hook'ları
├── components/
├── hooks/
├── schemas/      # Zod şemaları
├── stores/
├── types/
└── index.ts
```

ViraStack yapısında bunların yanında `constants/`, `data/` ve `helpers/` de olabilir.[^3] Her özellikte hepsi gerekmez, yalnızca ihtiyaç duyduğunuz klasörü açın.[^6]

Test dosyası, test ettiği dosyanın yanında durur (`cart-summary.test.tsx`). Uçtan uca testler ise `src/` yapısına bağlı olmadığı için proje kökünde kalır.[^1]

> [!TIP]
>
> **Klasör adı tür olabilir, dosya adı alanı anlatsın.** Feature-Sliced Design, `types/`, `components/`, `utils/` gibi genel klasör adlarını ve `types.ts`, `utils.ts`, `helpers.ts` gibi genel dosya adlarını sorun sayıyor: farklı alanların kodu aynı dosyada birikiyor.[^2] `helpers/utils.ts` yerine `helpers/format-price.ts` yazın.

## Ortak kod ne zaman global'e çıkar?

Her şey `features/[özellik]/` içinde başlar. İkinci bir özellik aynı koda ihtiyaç duyunca kod global `src/` katmanına (`components/`, `lib/`, `hooks/`) taşınır.

Neden taşınır? Çünkü özellikler birbirinden import etmez. Özellikleri birleştirmek sayfa (uygulama) katmanının işidir, böylece her özellik bağımsız kalır.[^6] Feature-Sliced Design de aynı katmandaki dilimlerin birbirini kullanmasını yasaklıyor.[^7] Akış tek yönlüdür: ortak kod → özellikler → uygulama.[^6]

| Feature içinde kalır | Global katmana çıkar |
| --- | --- |
| `features/cart/components/cart-summary.tsx` | `components/ui/button.tsx` |
| Sepet toplamını hesaplayan fonksiyon | Para birimi formatlayan fonksiyon (`helpers/`) |
| Sepet API hook'ları | Paylaşılan API istemcisi (`lib/api.ts`) |

`helpers/` paket import'u içermeyen saf fonksiyonlara, paket kullanan yapılandırılmış örnekler ise `lib/` altına gider.[^3]

> [!TIP]
>
> **Neden ikinci kullanımda, üçüncüde değil?** Bilinen "Rule of Three" kuralı şöyle işler: ilk seferde yazarsınız, ikincide tekrarı fark edip yine de kopyalarsınız, üçüncüde ortak koda çıkarırsınız.[^8] ViraStack burada daha sıkı: iki özellik aynı koda ihtiyaç duyuyorsa kod global katmana taşınır, çünkü özellikler birbirini import edemez.[^3]

> [!WARNING]
>
> **Benzeyen her kod aynı kod değildir.** Sandi Metz'in tarif ettiği döngü: biri tekrarı ortak fonksiyona çıkarır, sonra gelen yeni ihtiyaç için fonksiyona parametre ve koşul eklenir, ortak kod anlaşılmaz hale gelir.[^9] Metz'e göre tekrar, yanlış soyutlamadan çok daha ucuz.[^10] Taşımadan önce sorun: iki kullanım aynı kuralı mı paylaşıyor, yoksa tesadüfen mi benziyor? Tesadüfi tekrarı fazla erken temizlemek kodu kırılganlaştırır.[^8]

## Import kuralları

### 1. Alias kullanın, `../` kullanmayın

```ts
// ❌ Hangi klasördeyseniz ona göre değişir
import { Button } from '../../../components/ui/button'

// ✅ Her dosyada aynı
import { Button } from '@/components/ui/button'
```

- **Next.js:** `create-next-app` varsayılan olarak `@/*` alias'ını kurar.[^11]
- **TanStack Start:** Alias varsayılan gelmez. Dokümandaki örnek `~/*` kullanıyor. Vite 8 ve sonrasında tsconfig yollarını okuyan yerleşik destek var (varsayılan kapalı), Vite 7 ve öncesi için `vite-tsconfig-paths` eklentisi gerekiyor.[^12]
- **Zorlamak için:** `import/no-relative-parent-imports` ESLint kuralı `../` ile başlayan import'ları yasaklar. Kardeş (`./b`) ve alt klasör (`./lib/a`) import'ları serbesttir.[^13]

### 2. Özellikler arası import yok

Özellikleri sayfada birleştirin:

```tsx
// app/products/[id]/page.tsx
import { ProductDetail } from '@/features/products/components/product-detail'
import { AddToCartButton } from '@/features/cart/components/add-to-cart-button'
```

`features/products` içinden `features/cart`'a import yoktur. Bu kuralı ESLint ile zorlamayı [Component ve Kod Organizasyonu](/academy/architecture/component-organization) rehberinde göreceksiniz.

### 3. `index.ts`: giriş kapısı mı, yük mü?

ViraStack şablonunda her özelliğin kökünde bir `index.ts` var. Bu konuda iki görüş var:

|  | Tek giriş (public API) | Doğrudan import |
| --- | --- | --- |
| Savunanlar | Feature-Sliced Design: index dosyası özelliğin dışa açık sözleşmesi[^14] | bulletproof-react: Vite'ta tree shaking ve performans sorunları nedeniyle doğrudan import[^6]. Marvin Hagemeister: barrel her yere yayıldıysa hepsini silin[^15]. TkDodo: uygulama kodunda barrel'ı bırakın[^16] |
| Kazancı | Özelliğin iç yapısı değişince dışarıdaki import'lar bozulmaz[^14] | Daha hızlı araçlar, net bağımlılıklar[^17] |
| Maliyeti | Döngüsel import riski ve büyük projelerde yavaşlama[^14][^16] | Dosya taşımak her import'u etkiler, kapsülleme azalır[^17] |

Ölçümler büyük projelerde net. Marvin Hagemeister, barrel'ın her klasöre yayıldığı projelerde hepsini silmenin birçok işi %60-80 hızlandırabileceğini yazıyor. Birkaç barrel'ın ise genelde sorun olmadığını da ekliyor.[^15] TkDodo kendi Next.js projesinde bir sayfanın yüklediği modül sayısını yaklaşık 11 binden 3,5 bine indirdi (%68).[^16] Atlassian, Jira frontend'inde commit başına build dakikalarında %75 düşüş ölçtü, karşılığında paketlerin public API'sini kaybettiklerini de not ediyor.[^17]

> [!TIP]
>
> **ViraStack için pratik kural:**
>
> - Özellik kökünde tek ve ince bir `index.ts`: yalnızca adlandırılmış re-export, `export *` yok.[^14]
> - Özelliğin içindeki alt klasörlerde (`components/index.ts` gibi) ayrı barrel yok.[^14]
> - Aynı özelliğin dosyaları birbirini `index.ts` üzerinden değil, doğrudan dosya yoluyla import eder. Döngüsel import böyle önlenir.[^14][^16]
> - `import/no-cycle` kuralını açın.[^16]
> - Dev sunucusu veya testler yavaşlarsa ilk bakacağınız yer barrel'lardır.[^15]

## İsimlendirme

- **Dosya ve klasörler `kebab-case`:** `cart-summary.tsx`, `use-cart.ts`. macOS ve Windows büyük/küçük harfi ayırmaz, Linux (CI, canlı sunucu) ayırır. Yerelde çalışan bir import canlıda "Module not found" hatası verebilir.[^18] Tek bir yazım seçin ve lint ile zorlayın (`unicorn/filename-case`).[^16]
- **Bileşen adı `PascalCase`, dosya adı `kebab-case`:** `tab-list.tsx` dosyası `TabList` export eder.[^16]
- **Framework'ün dayattığı adlara dokunmayın:** `page.tsx`, `layout.tsx`, `__root.tsx`, `$postId.tsx` gibi adlar yönlendirmenin parçası.[^4][^5]
- **Genel adlardan kaçının:** `utils.ts`, `types.ts`, `helpers.ts` yerine alanı anlatan ad verin.[^2]
- **Test dosyası kaynağın yanında:** `cart-summary.test.tsx`.[^1]

> [!TIP]
>
> Bu yapıyı ajana her seferinde anlatmayın, kural dosyasına yazın. `create-next-app` kodlama ajanları için `AGENTS.md` dosyasını kendisi ekliyor.[^11] ViraStack AI şablonu da mimariyi `.cursor/rules` altındaki kurallara bağlıyor.[^3] `../` yasağı gibi lint kuralları ajan için de bir kontrol işlevi görür, bunu [Agentic Kodlama](/academy/ai/agentic-coding) rehberinde anlatmıştık.

## Kendin dene

1. Projenizden bir özellik seçin (örneğin sepet) ve dosyalarını `features/cart/` altına taşıyın. Yalnızca ihtiyaç duyduğunuz alt klasörleri açın.
2. İki özelliğin kullandığı bir fonksiyon bulun (örneğin fiyat formatlama). Aynı kuralı mı paylaşıyorlar, yoksa tesadüfen mi benziyorlar? Aynıysa `helpers/` altına taşıyın.
3. `import/no-relative-parent-imports` kuralını açın ve `../` içeren import'ları alias'a çevirin.
4. Projenizdeki `index.ts` dosyalarını sayın. Özellik kökündekiler dışındakileri doğrudan import'a çevirin.

## Kaynaklar

1. [Kent C. Dodds: Colocation](https://kentcdodds.com/blog/colocation) *(article)* — Kodu ilgili olduğu yere yakın koyma ilkesi, testler ve yardımcı dosyalar. 17 Haziran 2019.
2. [Feature-Sliced Design: Desegmentation](https://feature-sliced.design/docs/guides/issues/desegmented) *(article)* — Türe göre dizilimin sorunları ve genel klasör/dosya adlarından kaçınma.
3. [ViraStack AI: architecture-guide.md](https://github.com/virastack/ai/blob/main/templates/core/docs/architecture-guide.md) *(repo)* — Bu rehberdeki dizin yapısının ve kuralların ajan kural dosyası olarak uygulanmış hali.
4. [Next.js: Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure) *(article)* — Dosya kuralları, `src` klasörü, private folder'lar ve proje organizasyon stratejileri.
5. [TanStack Router: File Naming Conventions](https://tanstack.com/router/latest/docs/routing/file-naming-conventions) *(article)* — `__root`, `$`, `_` ve `-` önekleri, rota ağacından dosya hariç tutma.
6. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — Feature klasörü yapısı, özellikler arası import yasağı, tek yönlü akış ve barrel notu.
7. [Feature-Sliced Design: Layers](https://feature-sliced.design/docs/reference/layers) *(article)* — Dilimler arası import kuralı.
8. [Justin Weiss: I Dry-ed Up My Code and Now It's Hard to Work With](https://www.justinweiss.com/articles/i-dry-ed-up-my-code-and-now-its-hard-to-work-with-what-happened/) *(article)* — "Üç vuruş" kuralı, gerekli ve tesadüfi tekrar ayrımı.
9. [Sandi Metz: The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) *(article)* — Yanlış soyutlamanın nasıl oluştuğu ve geri dönüş yolu. 20 Ocak 2016.
10. [Sandi Metz: All the Little Things (RailsConf 2014)](https://youtu.be/8bZh5LMaSmE) *(video)* — Tekrarın yanlış soyutlamadan ucuz olduğu iddiasının çıktığı konuşma.
11. [Next.js: Installation](https://nextjs.org/docs/app/getting-started/installation) *(article)* — `@/*` alias'ı, mutlak import örneği ve `AGENTS.md`.
12. [TanStack Start: Path Aliases](https://tanstack.com/start/latest/docs/framework/react/guide/path-aliases) *(article)* — Start'ta alias varsayılan gelmez, Vite sürümüne göre kurulum.
13. [eslint-plugin-import: no-relative-parent-imports](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-relative-parent-imports.md) *(repo)* — `../` import'larını yasaklayan kural.
14. [Feature-Sliced Design: Public API](https://feature-sliced.design/docs/reference/public-api) *(article)* — Public API olarak index dosyası, `export *` sorunu ve index dosyalarının maliyetleri.
15. [Marvin Hagemeister: The barrel file debacle](https://marvinh.dev/blog/speeding-up-javascript-ecosystem-part-7/) *(article)* — Barrel dosyalarının araç performansına etkisi. 8 Ekim 2023.
16. [TkDodo: Please Stop Using Barrel Files](https://tkdodo.eu/blog/please-stop-using-barrel-files) *(article)* — Döngüsel import, modül sayısı ölçümü ve dosya adı tutarlılığı. 26 Temmuz 2024.
17. [Atlassian: How We Achieved 75% Faster Builds by Removing Barrel Files](https://www.atlassian.com/blog/how-we-build/faster-builds-when-removing-barrel-files) *(article)* — Jira frontend'inde ölçülen sonuçlar ve ödünleşimler. Tim Sebastian, 26 Haziran 2025.
18. [joulev/nextjs-faq: "Module not found" on deployment](https://github.com/joulev/nextjs-faq/blob/main/content/module-not-found-due-to-case-sensitivity.mdx) *(article)* — Büyük/küçük harf duyarlılığı yüzünden yerelde çalışıp canlıda kırılan import'lar.
