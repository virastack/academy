# Ürün Yönetim Paneli

[TanStack Query rehberindeki](https://virastack.com/academy/tanstack-query/project) proje dersinin çalışan hali. Ders adım adım bu dosyaları yazdırır; takıldığınızda karşılaştırın.

Gerçek bir sunucu yok. `src/project/api.ts` bellekte duran, gecikmeli sahte bir API'dir. Sayfa yenilenince veriler sıfırlanır.

## Çalıştırma

```bash
npm install
npm run dev
```

http://localhost:5173 adresini açın. Sağ alttaki TanStack logosu Devtools panelini açar.

## Kontrol

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test`, Playwright ile listeleme, sayfalama, arama, stok güncelleme, sonsuz yorum listesi ve favori butonunun iyimser güncellemesini (başarılı ve geri alınan) tarayıcıda dener.
