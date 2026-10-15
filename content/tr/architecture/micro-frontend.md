---
title: "Micro Frontend"
description: "Ne zaman gerekir, ne zaman gerekmez? Vite ve Module Federation ile temel kurulum."
lastVerified: "2026-10-15"
translationKey: "architecture/micro-frontend"
---

Micro frontend, bağımsız olarak yayınlanabilen frontend uygulamalarının tek bir bütün olarak birleştirildiği mimari stildir.[^1] Her ekip kendi dikey dilimini (örneğin sepet sayfasını) fikirden canlıya kadar sahiplenir, kullanıcı ise tek bir ürün görür.[^1] Bu rehber önce asıl soruyu cevaplıyor: buna gerçekten ihtiyacınız var mı? Sonra **Module Federation** ile **Vite** üzerinde en küçük çalışan kurulumu yapıyor.

## Ne zaman gerekir, ne zaman gerekmez?

Micro frontend bir kod organizasyonu aracı değil, bir **dağıtım** kararıdır. Nx'in ölçütü net: bağımsız deploy zorunluysa kullanın.[^2]

| Mantıklı | Mantıksız |
| --- | --- |
| Bağımsız deploy gerçekten zorunlu[^2] | Frontend'in tamamı tek ekipte[^2] |
| Birkaç ekip aynı uygulamaya yayın yapıyor ve ortak release trenini beklemek karmaşıklıktan pahalı[^2] | Ekipler zaten birlikte deploy ediyor[^2] |
| Eski frontend'i riskli bir baştan yazım yerine parça parça değiştirmek istiyorsunuz[^1] | Uygulama küçük[^2] |
| Ekipler kendi teknoloji yığınlarını seçmek istiyor[^3] | Sürekli koordinasyon işini finanse edemiyorsunuz[^2] |

Sadece build süresini kısaltmak istiyorsanız çalışma zamanında birleştirme yanlış araç. Nx bu iş için başka yolları öneriyor.[^2]

Bedeli de bilmek gerekiyor:

- **Sürüm kayması:** Yayınlar atomik değil. Uygulama sürümleri deploy'lar arasında birbirinden ayrışabilir, ekipler arası sözleşmeler derleme zamanı yerine çalışma zamanı anlaşmalarına dönüşür.[^2]
- **Tekrar eden yük:** Her paket kendi bağımlılık kopyasını getirirse kullanıcı React'i *n* kez indirir. Bağımlılıkları paylaşmak ise sürüm bağımlılığını geri getirir.[^1]
- **Gizli monolit:** Global store veya her şeyi bilen bir kabuk, uygulamaları yine birbirine bağlar. Sonuç, iki yaklaşımın kötü yanlarını birleştiren bir *dağıtık monolit* olur.[^3]
- **Operasyon yükü:** Ayrı deploy'lar CI/CD, feature flag ve sürümleme işini artırır.[^3]

State of Frontend verilerine göre micro frontend kullanımı 2022'de %75,4 iken 2024'te %23,6'ya düştü. Module Federation kullanımı ise 2024'te %51,8'e ulaştı ve çoğu zaman monolitlerin içinde kullanılıyor.[^3]

### Önce daha ucuz yolları deneyin

Mimariyi sınıflandıran şey repo, container ya da ekip sayısı değil, parçaların birbirine ne kadar sıkı bağlı olduğu. Her zaman birlikte deploy edilen parçalar fiilen bir monolittir.[^3] Çoğu küçük ve orta ekip için en hızlı yol, net modül sınırlarına sahip bir **modüler monolittir**. Gerçek bir ihtiyaç doğduğunda modülü ayırırsınız.[^3]

1. [Feature tabanlı klasör yapısı](/academy/architecture/folder-structure) ile sınırları kod içinde çizin.
2. Ortak kodu [monorepo](/academy/architecture/monorepo) içinde paketlere ayırın.
3. Hâlâ bağımsız deploy gerekiyorsa micro frontend'e geçin.

## Entegrasyon yaklaşımları

Micro frontend'leri birleştirmenin birkaç yolu var:[^1]

| Yaklaşım | Nasıl çalışır | Not |
| --- | --- | --- |
| Derleme zamanı | Her parça paket olarak yayınlanır, kabukta birlikte derlenir | Kilit adımlı yayın süreci yaratır, yazar kesinlikle önermiyor[^1] |
| Sunucu tarafı | Sunucu HTML parçalarını birleştirir | Her parça farklı bir ekibin olabilir[^1] |
| iframe | Her parça izole bir iframe'de çalışır | Stil ve global izolasyonu iyi, routing ve derin link zor[^1] |
| Çalışma zamanında JavaScript | Kabuk, her bundle'ın açtığı bir giriş noktasını çağırır | Yazarın varsayılan tercihi[^1] |
| Web Components | Her parça bir custom element tanımlar | Tarayıcı standartlarına yaslanmak isteyen ekipler için[^1] |

Module Federation bu tablodaki "çalışma zamanında JavaScript" satırına denk gelir: kabuk, uzak uygulamanın modüllerini tarayıcıda çalışırken yükler. Derleme zamanı birleştirmenin kilit adımlı yayın sorunu da böylece ortadan kalkar.

## Module Federation kavramları

Module Federation dokümanları iki rol tanımlıyor: bileşen sunan **provider** ve onu kullanan **consumer**.[^4] Topluluk ve bu rehber aynı rolleri **remote** (uzak uygulama) ve **host** (kabuk) olarak adlandırıyor.

| Kavram | Anlamı |
| --- | --- |
| `name` | Uygulamanın federasyondaki benzersiz adı |
| `exposes` | Remote'un dışarı açtığı modüller (`'./CartWidget': './src/cart-widget.tsx'`)[^5] |
| `remotes` | Host'un yükleyeceği remote'ların adresleri[^4] |
| `shared` | Host ve remote arasında tek kopya olarak paylaşılacak bağımlılıklar[^4] |
| `remoteEntry.js` | Remote'un giriş dosyası. Host, remote'a bu dosya üzerinden bağlanır[^6] |

Remote'un giriş noktası `mf-manifest.json` da olabilir.[^4] Vite eklentisinde `manifest: true` bu dosyayı da üretir.[^6]

## Vite ile kurulum

Örnek senaryo: e-ticaret kabuğu (`shell`, host) sepet widget'ını ayrı bir uygulamadan (`cart`, remote) yükleyecek. İki uygulama da sıradan birer **Vite** + React projesi. [Monorepo](/academy/architecture/monorepo) rehberindeki gibi `apps/shell` ve `apps/cart` olarak aynı workspace'te durabilirler.

Eklentiyi iki uygulamaya da kurun:[^5]

```bash
pnpm add -D @module-federation/vite
```

Bu rehberdeki kurulum Vite 8, React 19 ve `@module-federation/vite` 1.23 ile hem `dev` hem `build` + `preview` modunda denendi. Eklenti Vite 5, 6, 7 ve 8'i destekliyor.

> [!WARNING]
>
> Birçok rehber `@originjs/vite-plugin-federation` kullanıyor. Bu farklı bir eklenti, seçenekleri ve davranışı farklı.[^7] Bu rehber Module Federation ekibinin resmi eklentisi `@module-federation/vite` ile ilerliyor.

### Remote: sepet

```ts
// apps/cart/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  server: { port: 5174, origin: 'http://localhost:5174' },
  plugins: [
    react(),
    federation({
      name: 'cart',
      filename: 'remoteEntry.js',
      exposes: {
        './CartWidget': './src/cart-widget.tsx',
      },
      shared: {
        react: { singleton: true },
        'react/': { singleton: true },
        'react-dom': { singleton: true },
        'react-dom/': { singleton: true },
      },
    }),
  ],
})
```

```tsx
// apps/cart/src/cart-widget.tsx
export default function CartWidget({ count }: { count: number }) {
  return <button>Sepet ({count})</button>
}
```

Remote'ta `server.origin` ayarı gerekiyor. Böylece dev sunucusu, dosya adreslerini host'un anlayacağı tam URL ile veriyor.[^6]

### Host: kabuk

```ts
// apps/shell/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export default defineConfig({
  server: { port: 5173 },
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        cart: {
          type: 'module',
          name: 'cart',
          entry: 'http://localhost:5174/remoteEntry.js',
        },
      },
      shared: {
        react: { singleton: true },
        'react/': { singleton: true },
        'react-dom': { singleton: true },
        'react-dom/': { singleton: true },
      },
    }),
  ],
})
```

Remote'u normal bir dinamik import ile yükleyin. `React.lazy` ve `Suspense`, yüklenme durumunu React'e bırakır ve remote bileşeni normal JSX gibi kullanmanızı sağlar.[^7]

```tsx
// apps/shell/src/main.tsx
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

const CartWidget = lazy(() => import('cart/CartWidget'))

createRoot(document.getElementById('root')!).render(
  <Suspense fallback="Yükleniyor...">
    <CartWidget count={2} />
  </Suspense>,
)
```

Çalıştırın: iki uygulamayı da `dev` ile ayağa kaldırıp `localhost:5173` adresini açın. Sepet widget'ı kabuğun içinde görünür.

### Tip desteği

Remote'un tipleri olmadan TypeScript `cart/CartWidget` modülünü bulamaz (`TS2307`). Module Federation tipleri otomatik üretir ve tüketici uygulama çalışırken bunları indirir. Tüketicinin `tsconfig.json` dosyasında bu klasörü göstermeniz yeterli:[^8]

```json
// apps/shell/tsconfig.json
{
  "compilerOptions": {
    "paths": { "*": ["./@mf-types/*"] }
  },
  "include": ["src", "@mf-types"]
}
```

`@mf-types` üretilmiş bir klasör, `.gitignore`'a ekleyin. Tipler gelmiyorsa `FEDERATION_DEBUG=true` ile başlatın ve `.mf/typesGenerate.log` dosyasına bakın.[^8]

## Paylaşılan bağımlılıklar

`shared` bölümü micro frontend'in en kırılgan noktası. Üç seçenek yeter:[^9]

- **`singleton: true`:** Paylaşım kapsamında yalnızca tek sürüm yüklenir. Host ve remote farklı sürümler isterse yüksek olan yüklenir, düşük olan taraf konsolda uyarı alır.[^9] React gibi tek kopya olması gereken kütüphaneler için bu şart.
- **`requiredVersion`:** İstenen sürüm aralığı. Mevcut sürüm bunun altındaysa konsolda uyarı çıkar. Varsayılanı uygulamanın kendi bağımlılık sürümüdür.[^9]
- **`eager`:** Paylaşılan modülü hemen yükler ama giriş dosyasına gömdüğü için boyutu büyütür, dikkatli kullanın.[^9]

Yalnızca gerçekten tek kopya olması gerekenleri paylaşın, örneğin UI framework'ü. Paylaşılmayan kütüphane her uygulamanın bundle'ına girer, paylaşılanlar ise sıkı yönetilmelidir.[^2] `'react/'` gibi sonu `/` ile biten anahtarlar `react/jsx-runtime` gibi alt yolları da paylaşır.[^5]

## Dikkat edilecekler

- **Remote tipi:** Vite ile üretilmiş remote'larda `type: 'module'` yazın. Yazmazsanız eklenti `"var"` değerine düşer ve uyarı verir.[^6]
- **Chunk ayarlarına dokunmayın:** Eklenti chunk grafiğini kendisi yönetir. `codeSplitting: false` yok sayılır, Vite 8 ve sonrasında `manualChunks` yok sayılır ve uyarı verir.[^6]
- **Eski tarayıcılar:** Chrome 89 altını hedefliyorsanız `vite-plugin-top-level-await` eklentisini kullanmanız gerekiyor.[^5]
- **Adresi koda gömmeyin:** `localhost:5174` yalnızca yerel geliştirme için. Ortama göre değişen bir değişkenden okuyun, aksi hâlde deploy'da adresleri elle değiştirmeniz gerekir.[^7]
- **Deploy sırası:** Remote'u yeniden yayınlamak host'u yeniden derlemeden güncel haliyle yükletir.[^7] Bu bağımsızlığın bedeli, uyumsuz sürümlerin yalnızca üretimde karşılaşıp hata vermesi olabilir.[^2]
- **Haberleşmeyi en aza indirin:** Uygulamalar arası iletişim gerekiyorsa custom event, yukarıdan geçilen callback veya URL kullanın. Ortak state ve ortak veri modeli ağır bağımlılık yaratır.[^1]
- **Ekibi dikey kesin:** Ekipleri stil ya da form gibi teknik kabiliyetlere göre değil, sepet gibi ürün dilimlerine göre kurun.[^1]

> [!NOTE]
>
> Dokümana göre Vite entegrasyonunda tüketilen remote'lar için hot update henüz yok.[^5] Remote'taki değişiklikte host sayfasını yenilemeniz gerekebilir.

## Kendin dene

1. Yukarıdaki `shell` ve `cart` uygulamalarını oluşturun ve ikisini de `dev` ile çalıştırın. Sepet widget'ının kabukta göründüğünü doğrulayın.
2. `cart` içindeki butonun metnini değiştirin. Kabuğu yeniden derlemeden, sayfayı yenileyince güncellendiğini görün.
3. `shell` içindeki `shared` ayarından `react` satırını silip tekrar deneyin. Konsol uyarılarına ve ağ sekmesindeki yüklenen bundle boyutlarına bakın.
4. `tsconfig.json`'daki `paths` ayarını kaldırın ve `TS2307` hatasını görün. Sonra geri ekleyip hatanın gittiğini doğrulayın.
5. Kendinize sorun: bu uygulamada iki ekibin gerçekten bağımsız deploy etmesi gerekiyor mu? Cevabınız hayırsa bu kurulumu bir modüler monolite çevirin.

## Kaynaklar

1. [Martin Fowler: Micro Frontends](https://martinfowler.com/articles/micro-frontends.html) *(article)* — Tanım, faydalar, entegrasyon yaklaşımları, bağımlılık tekrarı ve iletişim maliyeti. Yazar Cam Jackson, 2019.
2. [Nx: Micro Frontend Architecture](https://nx.dev/concepts/module-federation/micro-frontend-architecture) *(article)* — Ne zaman mantıklı olduğu, sürüm kayması ve paylaşılan bağımlılık riskleri.
3. [heise: Why many teams are better off with monoliths than with micro front ends](https://www.heise.de/en/background/Why-many-teams-are-better-off-with-monoliths-than-with-micro-front-ends-10639162.html) *(article)* — Modüler monolit, dağıtık monolit ve kullanım istatistikleri.
4. [Module Federation: Quick Start](https://module-federation.io/guide/start/quick-start.html) *(article)* — Provider/consumer rolleri, `remotes`, `shared` ve manifest.
5. [Module Federation: Vite entegrasyonu](https://module-federation.io/integrations/build-tool/vite) *(article)* — Kurulum, `exposes`, `shared` örnekleri ve tarayıcı hedefi notu.
6. [module-federation/vite](https://github.com/module-federation/vite) *(repo)* — Host ve remote yapılandırması, `server.origin`, `type: 'module'`, manifest ve chunk kısıtları.
7. [freeCodeCamp: How to Build Micro Frontends in React with Vite and Module Federation](https://www.freecodecamp.org/news/how-to-build-micro-frontends-in-react-with-vite-and-module-federation/) *(article)* — `React.lazy` ve `Suspense` deseni. `@originjs/vite-plugin-federation` kullandığı için yapılandırması bu rehberden farklı.
8. [Module Federation: Type Prompt](https://module-federation.io/guide/basic/type-prompt.html) *(article)* — Uzak tiplerin otomatik üretimi, `paths` ayarı ve sorun giderme.
9. [Module Federation: shared](https://module-federation.io/configure/shared.html) *(article)* — `singleton`, `requiredVersion` ve `eager` seçenekleri.
