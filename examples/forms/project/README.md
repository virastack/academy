# Satıcı Başvuru Formu

[Formlar rehberindeki](https://virastack.com/academy/forms/project) proje dersinin çalışan hali. Ders adım adım bu dosyaları yazdırır; takıldığınızda karşılaştırın.

Üç adımlı bir başvuru formu: mağaza bilgileri ve dinamik ürün listesi, iletişim, ödeme. React Hook Form formu yönetir, Zod şeması hem tarayıcıda hem Server Action'da doğrular, [@virastack/mask](https://virastack.com/mask) vergi numarası, telefon ve IBAN alanlarını biçimlendirir.

Gerçek bir veritabanı yok. `app/actions.ts` gecikmeli bir Server Action'dır. `taken@example.com` adresiyle başvuru yaparsanız sunucu hatası döner.

## Çalıştırma

```bash
npm install
npm run dev
```

http://localhost:3000 adresini açın.

> Bu klasördeki `package-lock.json` ile kurulum npm 10'da da çalışır. Projeyi sıfırdan kurarken `@hookform/resolvers` 6.0.0 npm 10'da `ERESOLVE` hatası verebilir; Node.js 24 ile gelen npm 11'i ya da pnpm'i kullanın.

## Kontrol

```bash
npm run lint
npm run build
npx playwright install chromium
npm test
```

`npm test` önce production build alır, sonra Playwright ile adım doğrulamasını ve odaklanmayı, maskeleri, ürün ekleyip çıkarmayı, geri dönünce değerlerin korunmasını, IBAN sağlamasını, sunucudan gelen alan hatasını, başarılı başvuruyu ve her adımda axe ile erişilebilirlik taramasını tarayıcıda dener.
