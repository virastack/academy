---
title: "Component ve Kod Organizasyonu"
description: "Component'leri bölme, ortak kodu ayırma ve sınırları koruma."
lastVerified: "2026-10-15"
translationKey: "architecture/component-organization"
---

[Önceki rehberde](/academy/architecture/folder-structure) klasör yapısını kurduk. Bu rehber o yapının içindeki üç soruya cevap veriyor: bir component ne zaman bölünür, state ve mantık nereye konur, sınırlar nasıl bozulmadan kalır.

## Component'i ne zaman bölün?

Bir React uygulamasının tamamını tek component olarak yazmak teknik olarak mümkün. Kent C. Dodds'ın saydığı sorunlar bölmenin gerekçesi: her state değişiminde tüm uygulamanın yeniden render olması, kodu paylaşmanın zorlaşması, hangi state'in hangi JSX'e ait olduğunun karışması, testlerin izole edilememesi ve ekip çalışmasında merge çakışmaları.[^1] Önerisi net: bu sorunlardan birini yaşadığınızda bölün, öncesinde değil. Her bölme bir soyutlamadır ve maliyeti vardır. Uzun bir JSX, prop drilling'e yol açan erken bir bölmeden daha ucuza gelir.[^1]

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

Bu kalıba compound component deniyor: kök component ortak state ve context'i tutar, alt parçalar onu kullanır.[^3] React'in `children` prop'u bu işin temeli. Component'e doldurulabilir bir "boşluk" bırakır ve içine ne konduğunu bilmek zorunda kalmaz.[^4]

> [!WARNING]
>
> **Spread'i ölçülü kullanın.** React dokümanına göre `{...props}` her ikinci component'te karşınıza çıkıyorsa bir şey yanlıştır. Çoğu zaman component'leri bölüp `children` geçirmek gerekir.[^4]

## State'i yakın tutun

Global state, yavaş React uygulamalarının en yaygın nedenlerinden biri, özellikle hızlı değişen state. State ağacın üstünde durdukça her güncelleme tüm ağacın kontrol edilmesine yol açıyor. Aşağı indirdikçe React'in kontrol edeceği parça azalıyor.[^5] Birden fazla component aynı state'e ihtiyaç duyuyorsa yeri, onların en yakın ortak ebeveynidir.[^2][^5]

| State'i kim kullanıyor? | Nerede durur? |
| --- | --- |
| Yalnızca bu component | Component'in içinde |
| Yalnızca bir çocuk | O çocuğa taşıyın |
| Kardeşler veya ebeveyn | En yakın ortak ebeveyne çıkarın |
| Prop drilling sorunu var | Çocuk ebeveyni olmadan çalışabiliyorsa Context provider, çalışamıyorsa composition |
| Gerçekten uygulama geneli | Global store |

Kent C. Dodds'ın karar ağacı bu.[^5] Örneğin ürün listesindeki arama kutusunun metni, kutuyu ve listeyi saran en yakın component'te durur, global bir store'a gitmez. Global store'a yalnızca gerçekten uygulama geneli olan veri girer.[^5]

## Mantığı hook'a ayırın

Hook mantığı paylaşır, state'i değil. Aynı hook'u iki component'te çağırırsanız iki bağımsız state oluşur. Ortak state gerekiyorsa state'i yukarı taşıyıp aşağı verin.[^6]

- **Effect yazıyorsanız hook'a sarmayı düşünün.** Veri akışı belli olur, component "nasıl"ı değil "ne"yi anlatır.[^6]
- **Tek bir `useState`'i sarmak için hook yazmayın.** Biraz tekrar sorun değil.[^6]
- **`use` önekini yalnızca içinde başka hook çağıran fonksiyona verin.** Çağırmıyorsa `getSorted` gibi normal bir fonksiyon yazın.[^6]
- **Yaşam döngüsü hook'ları yazmayın.** `useMount` ve `useEffectOnce` yerine `useData(url)` ve `useChatRoom(options)` gibi somut amaçlı hook'lar yazın.[^6]

Tek bir özelliğin kullandığı hook `features/[özellik]/hooks/` altında kalır, iki özellik kullanınca global `hooks/` klasörüne çıkar. Taşıma kuralı [önceki rehberdeki](/academy/architecture/folder-structure) gibi.

## Server ve client sınırı (Next.js)

Next.js App Router'da layout ve page varsayılan olarak Server Component. State, event handler, tarayıcı API'si ve custom hook gerektiğinde Client Component kullanılır.[^7] Bölme kararı burada JavaScript boyutunu da etkiliyor:

- **`'use client'` etkileşimli yaprağa konur.** Bir dosya bu direktifi aldığında import ettiği her şey ve doğrudan render ettiği component'ler client bundle'a girer. Örneğin layout'ta yalnızca arama kutusu client olur, logo ve linkler server'da kalır.[^7]
- **Server Component'i `children` olarak client component'e geçirin.** `<CartModal>` client state ile açılıp kapanır, içindeki `<CartItems />` sunucuda render edilir.[^7]
- **Provider'ları ağaçta olabildiğince aşağıda render edin.** Bunun için `children` alan bir client component yazın.[^7]
- **Gizli anahtar kullanan dosyaya `import 'server-only'` ekleyin.** Yanlışlıkla client'a import edilirse build hata verir.[^7]

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
3. Ortak katmandaki kod özelliklerden import ediyor mu? Etmemeli: akış ortak kod → özellikler → uygulama yönünde tek yönlüdür.[^8]

## Sınırları koruma

Yazılı kural ihlal edilir, lint kuralı edilmez. İki sınırı korumanız gerekiyor: özellikler birbirini import etmez, ortak kod → özellikler → uygulama yönü tersine dönmez.[^8]

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

- `target` kuralın uygulandığı klasör, `from` oradan import edilemeyen klasör, `except` `from`'a göre istisnadır. Kural import yazısını değil, çözümlenen dosya yolunu eşler.[^9]
- bulletproof-react her özellik için ayrı bir zone yazıyor, yani özellik sayısı arttıkça liste uzuyor.[^8]
- TanStack Start kullanıyorsanız `./src/app` yerine `./src/routes` yazın.

Özelliğe dışarıdan yalnızca kökünden erişilsin istiyorsanız (public API), `no-restricted-imports` ile derin yolları yasaklayabilirsiniz:[^10]

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

Üçüncü kural döngüsel import'lar: `import/no-cycle`. Karşılaştırmalı olarak pahalı bir kural, lint süreniz sorun olursa `maxDepth` ile maliyet ve fayda arasında ayar yapabilirsiniz.[^11]

Zone listesi yetmemeye başlarsa `eslint-plugin-boundaries` mimariyi tek yerde tarif etmenizi sağlıyor: klasörleri eleman tipleri olarak tanımlarsınız, sonra varsayılanı `disallow` yapıp izin verilen bağımlılıkları yazarsınız.[^12]

> [!TIP]
>
> Lint hatası ajan için de geri bildirimdir: sınırı ihlal eden kod hemen kırmızıya düşer ve ajan kendini düzeltir. Bu, [Agentic Kodlama](/academy/ai/agentic-coding) rehberindeki "ajanın kullanabileceği bir kontrol" fikrinin mimari karşılığı.

## Kendin dene

1. Projenizdeki en büyük component'i açın. Kent C. Dodds'ın saydığı sorunlardan birini yaşıyor musunuz? Yaşamıyorsanız bölmeyin.
2. Global bir store'da duran ama yalnızca bir component'in kullandığı bir state bulun ve o component'e taşıyın.
3. Elinizdeki bir `useEffect`'i amacına uygun adlı bir hook'a sarın (örneğin `useData`).
4. `import/no-restricted-paths` zone'larını ekleyin, sonra kasıtlı olarak `features/products` içinden `features/cart` import edip hatayı görün.

## Kaynaklar

1. [Kent C. Dodds: When to break up a component into multiple components](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components) *(article)* — Component'i bölmeyi gerektiren sorunlar ve erken soyutlamanın maliyeti. 19 Temmuz 2019.
2. [React: Thinking in React](https://react.dev/learn/thinking-in-react) *(article)* — UI'ı component hiyerarşisine bölme ölçütleri ve state'in en yakın ortak ebeveyne konması.
3. [components.build: Composition](https://www.components.build/composition) *(article)* — Çok proplu component yerine composition ve compound component kalıbı.
4. [React: Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) *(article)* — `children` prop'u ve spread kullanımı için uyarı.
5. [Kent C. Dodds: State Colocation will make your React app faster](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster) *(article)* — State'i yakın tutmanın hız ve bakım etkisi, karar ağacı. 23 Eylül 2019.
6. [React: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) *(article)* — Hook'ların mantığı paylaşması, adlandırma ve ne zaman yazılacağı.
7. [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) *(article)* — `'use client'` sınırı, `children` ile iç içe geçirme, provider'lar ve `server-only`.
8. [bulletproof-react: Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) *(repo)* — Özellikler arası import yasağı, tek yönlü akış ve ESLint zone'ları.
9. [eslint-plugin-import: no-restricted-paths](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md) *(repo)* — `target`, `from` ve `except` ile klasörler arası import yasağı.
10. [ESLint: no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports) *(article)* — `patterns` ve `group` ile import yolu kısıtlama.
11. [eslint-plugin-import: no-cycle](https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md) *(repo)* — Döngüsel import tespiti, `maxDepth` ve performans notu.
12. [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) *(repo)* — Eleman tipleri ve bağımlılık politikalarıyla mimari sınırları zorlama.
