# Ürün Detay Sayfası

[React rehberindeki](https://virastack.com/academy/react/project) proje dersinin çalışan hali. Takıldığınızda karşılaştırın.

Sahte bir API'den yüklenen ürün sayfası: Suspense ve hata sınırı, sepet context'i, `useOptimistic` ile favori butonu, `useActionState` ile yorum formu, `<Activity>` ile sekmeler ve `<ViewTransition>` ile kayan sepet çekmecesi. Tüm proje dosyaları `src/project/` altında.

## Çalıştırma

```bash
npm install
npm run dev
```

## Kontrol

```bash
npm run lint
npm run build
```

`lint` önce şablondaki Oxlint'i, sonra `eslint-plugin-react-hooks` ile ESLint'i çalıştırır. Oxlint `cart.tsx` için iki `only-export-components` uyarısı verir: provider ile hook'lar aynı dosyada durduğu için beklenen bir uyarıdır.
