---
title: "Component ve Kod Organizasyonu"
description: "Component'leri bölme, ortak kodu ayırma ve sınırları koruma."
lastVerified: "2026-10-15"
translationKey: "architecture/component-organization"
---

[Önceki rehberde](/academy/architecture/folder-structure) klasör yapısını kurduk. Bu rehber o yapının içindeki üç soruya cevap veriyor: bir component ne zaman bölünür, state ve mantık nereye konur, sınırlar nasıl bozulmadan kalır.

## Component'i ne zaman bölün?

Bir React uygulamasının tamamını tek component olarak yazmak teknik olarak mümkün. [Kent C. Dodds](https://kentcdodds.com)'ın saydığı sorunlar bölmenin gerekçesi: her state değişiminde tüm uygulamanın yeniden render olması, kodu paylaşmanın zorlaşması, hangi state'in hangi JSX'e ait olduğunun karışması, testlerin izole edilememesi ve ekip çalışmasında merge çakışmaları.[^1] Önerisi net: bu sorunlardan birini yaşadığınızda bölün, öncesinde değil. Her bölme bir soyutlamadır ve maliyeti vardır. Uzun bir JSX, prop drilling'e yol açan erken bir bölmeden daha ucuza gelir.[^1]

React dokümanı da bir ölçüt veriyor: bir component ideal olarak tek bir şeyle ilgilenmeli, büyürse alt component'lere ayrılmalı. Tablo başlığı gibi parçaları ayırıp ayırmamak tercih meselesi, başlık sıralama gibi özelliklerle karmaşıklaşırsa kendi component'ine taşınır.[^2]

| Bölün | Bölmeyin |
| --- | --- |
| Component birden fazla şeyle ilgilenmeye başladı[^2] | JSX sadece uzun diye |
| Aynı parça birden fazla yerde kullanılacak[^1] | Tek yerde kullanılan üç satırlık parça için |
| Bir parçayı izole test etmek istiyorsunuz[^1] | Bölmek prop drilling doğuracaksa[^1] |

## Prop eklemek yerine composition

Her yeni ihtiyaç için component'e bir prop eklemek kolay. `showPrice`, `compact`, `onSale` gibi boolean'lar çoğaldıkça içerideki koşullar da çoğalır. Composition ise sorumluluğu birlikte çalışan küçük component'lere dağıtır.[^3]

```tsx
// ❌ Her ihtiyaç yeni bir prop
<ProductCard showPrice showBadge compact onSale />

// ✅ Gereken parçaları çağıran seçer
<ProductCard>
  <ProductCard.Image src={product.image} alt={product.name} />
  <ProductCard.Title>{product.name}</ProductCard.Title>
  <ProductCard.Price value={product.price} />
</ProductCard>
```

Bu kalıba **compound component** deniyor: kök component ortak state ve context'i tutar, alt parçalar onu kullanır.[^3]

Kalıbın iki uygulama yolu var ve ödünleşimleri farklı. `React.Children.map` ile kök, çocuklarına `cloneElement` üzerinden prop geçirir. Bu basit ama yalnızca doğrudan çocuklar prop alır, araya bir sarmalayıcı koyarsanız kırılır, ayrıca aynı adlı prop'lar sessizce ezilebilir. Context tabanlı yol çocukları herhangi bir derinliğe yerleştirmenize izin verir ve React 18 sonrasında önerilen yol bu. Context değerini memoize etmek veya bölmek gereksiz render'ı önler.[^4] React'in `children` prop'u bu işin temeli. Component'e doldurulabilir bir *"boşluk"* bırakır ve içine ne konduğunu bilmek zorunda kalmaz.[^5]

Bu kalıbın neden boolean prop'lardan iyi olduğunu [Fernando Rojo](https://fernandorojo.co) React Universe Conf 2025'te Slack'in mesaj kutusu üzerinden anlatıyor. Kanal mesajı, DM, ileti yönlendirme ve düzenleme gibi senaryoları tek component'te `isDMThread`, `isEditingMessage` gibi boolean'larla yönetmek koşulları yığıyor ve component'i bakımı zor bir monolite çeviriyor. Çözümü, component'i `Header`, `Input`, `Footer` gibi parçalara bölmek ve her ekranda yalnızca gereken parçaları JSX'e yazmak. Ortak veri ve aksiyonlar bir `ComposerProvider` context'inde duruyor. Gizlenecekleri boolean'la değil görünecekleri JSX'le söylüyorsunuz. [Rojo](https://fernandorojo.co), boolean yığınının hem geliştiriciler hem de yapay zekâ araçları için hata riskini artırdığını da belirtiyor.[^6]

> [!WARNING]
>
> **Spread'i ölçülü kullanın.** React dokümanına göre `{...props}` her ikinci component'te karşınıza çıkıyorsa bir şey yanlıştır. Çoğu zaman component'leri bölüp `children` geçirmek gerekir.[^5]

## State'i yakın tutun

Global state, yavaş React uygulamalarının en yaygın nedenlerinden biri, özellikle hızlı değişen state. State ağacın üstünde durdukça her güncelleme tüm ağacın kontrol edilmesine yol açıyor. Aşağı indirdikçe React'in kontrol edeceği parça azalıyor.[^7] Birden fazla component aynı state'e ihtiyaç duyuyorsa yeri, onların en yakın ortak ebeveynidir.[^2][^7]

| State'i kim kullanıyor? | Nerede durur? |
| --- | --- |
| Yalnızca bu component | Component'in içinde |
| Yalnızca bir çocuk | O çocuğa taşıyın |
| Kardeşler veya ebeveyn | En yakın ortak ebeveyne çıkarın |
| Prop drilling sorunu var | Çocuk ebeveyni olmadan çalışabiliyorsa Context provider, çalışamıyorsa composition |
| Gerçekten uygulama geneli | Global store |

[Kent C. Dodds](https://kentcdodds.com)'ın karar ağacı bu.[^7] Örneğin ürün listesindeki arama kutusunun metni, kutuyu ve listeyi saran en yakın component'te durur, global bir store'a gitmez. Global store'a yalnızca gerçekten uygulama geneli olan veri girer.[^7]

[Rojo](https://fernandorojo.co)'nun konuşmasındaki vurgu bununla çelişmiyor, tamamlıyor: state'i *yakın* tutmak, onu kullananların ortak ebeveynine koymak demek. [Rojo](https://fernandorojo.co), birçok sorunu state'i ağaçta yukarı taşıyarak çözdüğünü söylüyor. Böylece sayfanın başka yerindeki bir "Yönlendir" butonu gibi kutunun dışındaki öğeler, prop drilling olmadan aynı state'e ve aksiyonlara erişiyor.[^6] Ölçüt aynı: state'i kullananların en yakın ortak noktasında tutun, daha aşağıda değil.

## Mantığı hook'a ayırın

Hook mantığı paylaşır, state'i değil. Aynı hook'u iki component'te çağırırsanız iki bağımsız state oluşur. Ortak state gerekiyorsa state'i yukarı taşıyıp aşağı verin.[^8]

- **Effect yazıyorsanız hook'a sarmayı düşünün.** Veri akışı belli olur, component "nasıl"ı değil "ne"yi anlatır.[^8]
- **Tek bir `useState`'i sarmak için hook yazmayın.** Biraz tekrar sorun değil.[^8]
- **`use` önekini yalnızca içinde başka hook çağıran fonksiyona verin.** Çağırmıyorsa `getSorted` gibi normal bir fonksiyon yazın.[^8]
- **Yaşam döngüsü hook'ları yazmayın.** `useMount` ve `useEffectOnce` yerine `useData(url)` ve `useChatRoom(options)` gibi somut amaçlı hook'lar yazın.[^8]

Tek bir özelliğin kullandığı hook `features/[özellik]/hooks/` altında kalır, iki özellik kullanınca global `hooks/` klasörüne çıkar. Taşıma kuralı [önceki rehberdeki](/academy/architecture/folder-structure) gibi.

## Server ve client sınırı (Next.js)

[!nextjs] App Router'da layout ve page varsayılan olarak Server Component. State, event handler, tarayıcı API'si ve custom hook gerektiğinde Client Component kullanılır.[^9] Bölme kararı burada JavaScript boyutunu da etkiliyor:

- **`'use client'` etkileşimli yaprağa konur.** Bir dosya bu direktifi aldığında import ettiği her şey ve doğrudan render ettiği component'ler client bundle'a girer. Örneğin layout'ta yalnızca arama kutusu client olur, logo ve linkler server'da kalır.[^9]
- **Server Component'i `children` olarak client component'e geçirin.** `<CartModal>` client state ile açılıp kapanır, içindeki `<CartItems />` sunucuda render edilir.[^9]
- **Provider'ları ağaçta olabildiğince aşağıda render edin.** Bunun için `children` alan bir client component yazın.[^9]
- **Gizli anahtar kullanan dosyaya `import 'server-only'` ekleyin.** Yanlışlıkla client'a import edilirse build hata verir.[^9]

```tsx
// app/cart/page.tsx (Server Component)
<CartModal>
  <CartItems /> {/* sunucuda render edilir */}
</CartModal>
```

## Ortak koda ayırırken

Ortak kodu ayırmanın kuralını [önceki rehberde](/academy/architecture/folder-structure) gördünüz. Taşımadan önce üç soru:

1. İki kullanım aynı kuralı mı paylaşıyor, yoksa tesadüfen mi benziyor?
2. Taşıdıktan sonra her yeni kullanım için parametre ve koşul eklemeniz gerekecek mi? Gerekecekse soyutlama yanlış olabilir, kopyalamak daha ucuza gelir.[^1]
3. Ortak katmandaki kod özelliklerden import ediyor mu? Etmemeli: akış ortak kod → özellikler → uygulama yönünde tek yönlüdür.[^10]

Bu sorular [Dan Abramov](https://overreacted.io)'un *The Wet Codebase* konuşmasıyla örtüşüyor. Konuşmadaki hikâyede kopyalamayı önlemek için çıkarılan ortak soyutlama zamanla özel durumlar biriktirip genelleşiyor ve anlaşılmaz hâle geliyor. Önerileri: kötü soyutlamayı satır içine geri alın, iç soyutlamayı değil somut iş davranışını test edin, erken tekilleştirmeden kaçının ve tek yönlü component ağacı gibi satır içine almayı kolaylaştıran mimariler seçin.[^11]

## Sınırları koruma

Yazılı kural ihlal edilir, lint kuralı edilmez. İki sınırı korumanız gerekiyor: özellikler birbirini import etmez, ortak kod → özellikler → uygulama yönü tersine dönmez.[^10] Feature-Sliced Design'ı anlatan bir konuşma bile sık görülen sorunlar arasında modüller arası çapraz import'u sayıyor.[^12]

```js
// eslint.config.js içindeki rules (eslint-plugin-import yüklü ve kayıtlı olmalı)
'import/no-restricted-paths': ['error', {
  zones: [
    // özellikler birbirini import etmez
    { target: './src/features/cart', from: './src/features', except: ['./cart'] },
    { target: './src/features/products', from: './src/features', except: ['./products'] },

    // akış tek yönlü: ortak kod → özellikler → uygulama
    { target: './src/features', from: './src/app' },
    {
      target: ['./src/components', './src/hooks', './src/lib', './src/helpers', './src/types'],
      from: ['./src/features', './src/app'],
    },
  ],
}],
```

- `target` kuralın uygulandığı klasör, `from` oradan import edilemeyen klasör, `except` `from`'a göre istisnadır. Kural import yazısını değil, çözümlenen dosya yolunu eşler.[^13]
- **bulletproof-react** her özellik için ayrı bir zone yazıyor, yani özellik sayısı arttıkça liste uzuyor.[^10]
- TanStack Start kullanıyorsanız `./src/app` yerine `./src/routes` yazın.

Özelliğe dışarıdan yalnızca kökünden erişilsin istiyorsanız (public API), `no-restricted-imports` ile derin yolları yasaklayabilirsiniz:[^14]

```js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/features/**'], // özelliğin kendi dosyaları birbirini derin yoldan import eder
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/features/*/*'],
        message: "Özelliğe yalnızca kökünden erişin: '@/features/<ad>'",
      }],
    }],
  },
}
```

Üçüncü kural döngüsel import'lar: `import/no-cycle`. Karşılaştırmalı olarak pahalı bir kural, lint süreniz sorun olursa `maxDepth` ile maliyet ve fayda arasında ayar yapabilirsiniz.[^15]

Zone listesi yetmemeye başlarsa **eslint-plugin-boundaries** mimariyi tek yerde tarif etmenizi sağlıyor: klasörleri eleman tipleri olarak tanımlarsınız, sonra varsayılanı `disallow` yapıp izin verilen bağımlılıkları yazarsınız.[^16]

> [!TIP]
>
> Lint hatası ajan için de geri bildirimdir: sınırı ihlal eden kod hemen kırmızıya düşer ve ajan kendini düzeltir. Bu, [Agentic Kodlama](/academy/ai/agentic-coding) rehberindeki *"ajanın kullanabileceği bir kontrol"* fikrinin mimari karşılığı.

## Kendin dene

1. Projenizdeki en büyük component'i açın. [Kent C. Dodds](https://kentcdodds.com)'ın saydığı sorunlardan birini yaşıyor musunuz? Yaşamıyorsanız bölmeyin.
2. Global bir store'da duran ama yalnızca bir component'in kullandığı bir state bulun ve o component'e taşıyın.
3. Elinizdeki bir `useEffect`'i amacına uygun adlı bir hook'a sarın (örneğin `useData`).
4. `import/no-restricted-paths` zone'larını ekleyin, sonra kasıtlı olarak `features/products` içinden `features/cart` import edip hatayı görün.
5. [Dan Abramov](https://overreacted.io)'un [The Wet Codebase](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase) konuşmasını izleyin. Ardından kendi kodunuzda bir soyutlamayı satır içine geri alıp ne olduğuna bakın.[^11]
6. [Fernando Rojo](https://fernandorojo.co)'nun [Composition Is All You Need](https://www.youtube.com/watch?v=4KvbVq3Eg5w) konuşmasını (22 dk) izleyin. Ardından boolean prop'larla büyümüş bir component'inizi `Root` ve alt parçalara bölmeyi deneyin.[^6]

## Kaynaklar

1. [Kent C. Dodds: When to break up a component into multiple components](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components) *(article)* — Component'i bölmeyi gerektiren sorunlar ve erken soyutlamanın maliyeti. 19 Temmuz 2019.
2. [React: Thinking in React](https://react.dev/learn/thinking-in-react) *(article)* — UI'ı component hiyerarşisine bölme ölçütleri ve state'in en yakın ortak ebeveyne konması.
3. [components.build: Composition](https://www.components.build/composition) *(article)* — Çok proplu component yerine composition ve compound component kalıbı.
4. [Patterns.dev: Compound Pattern](https://www.patterns.dev/react/compound-pattern/) *(article)* — Compound component'in Context ve `React.Children.map` ile iki uygulaması, ödünleşimleri ve React 18+ önerisi.
5. [React: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) *(article)* — `children` prop'u ve spread kullanımı için uyarı.
6. [Fernando Rojo: Composition Is All You Need (React Universe Conf 2025)](https://www.youtube.com/watch?v=4KvbVq3Eg5w) *(video)* — Boolean prop'lardan kaçınma, Slack mesaj kutusu örneği, compound component ve context ile state'i yukarı taşıma. Callstack kanalı, 22 dk, 8 Eylül 2025.
7. [Kent C. Dodds: State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) *(article)* — State'i yakın tutmanın hız ve bakım etkisi, karar ağacı. 23 Eylül 2019.
8. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(article)* — Hook'ların mantığı paylaşması, adlandırma ve ne zaman yazılacağı.
9. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) *(article)* — `'use client'` sınırı, `children` ile iç içe geçirme, provider'lar ve `server-only`.
10. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — Özellikler arası import yasağı, tek yönlü akış ve ESLint zone'ları.
11. [Dan Abramov: The Wet Codebase (Deconstruct)](https://www.deconstructconf.com/2019/dan-abramov-the-wet-codebase) *(video)* — Erken soyutlamanın bedeli, satır içine alma ve tek yönlü component ağacı. Konferans sayfası 2019 altında listeliyor, sayfadaki etkinlik tarihi Nisan 2020.
12. [Alexander Morgunov: Getting to Grips with Feature-Sliced Design (HolyJS 2024 Autumn)](https://holyjs.ru/en/archive/2024%20Autumn/talks/20005543/) *(talk)* — Feature-Sliced Design'ın kavramları ve çapraz import dahil sık görülen sorunları.
13. [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) *(repo)* — `target`, `from` ve `except` ile klasörler arası import yasağı.
14. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(article)* — `patterns` ve `group` ile import yolu kısıtlama.
15. [eslint-plugin-import: no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md) *(repo)* — Döngüsel import tespiti, `maxDepth` ve performans notu.
16. [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) *(repo)* — Eleman tipleri ve bağımlılık politikalarıyla mimari sınırları zorlama.
