# Ürün Kataloğu ve Sepet

[Zustand rehberindeki](https://virastack.com/academy/zustand/project) proje dersinin çalışan hali. Ders adım adım bu dosyaları yazdırır; takıldığınızda karşılaştırın.

Gerçek bir sunucu yok. `src/project/api.ts` gecikmeli, sahte bir API'dir. Sepet `localStorage`'da `shop-cart` anahtarıyla saklanır.

## Çalıştırma

```bash
npm install
npm run dev
```

http://localhost:5173 adresini açın. Redux DevTools eklentisi kuruluysa store'u `ShopStore` adıyla görürsünüz.

## Kontrol

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test`, Playwright ile filtrelerin sorguyu sürmesini, sepete ekleme ve toplamı, stok sınırını, sepetin sayfa yenilendikten sonra korunmasını ve stok uyarısının sunucu verisinden türetilmesini tarayıcıda dener.
