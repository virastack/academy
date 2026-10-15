# AI Alışveriş Asistanı

İki klasör var:

- `starter/`: Boş iskelet. `TODO` yerlerini siz yazarsınız.
- `solution/`: Çalışan çözüm. Takıldığınızda karşılaştırın.

## Sahte model

Gerçek modeller ücretli olduğu için proje varsayılan olarak `src/lib/fake-model.ts` içindeki sahte modelle çalışır. Anahtar gerekmez, testler her zaman aynı sonucu verir.

Gerçek modelle denemek isterseniz (kullanım ücretlidir), proje köküne `.env.local` ekleyin:

```
AI_MODEL=<AI Gateway model adı>
AI_GATEWAY_API_KEY=<anahtarınız>
```

Testler sahte modele göre yazıldı. Gerçek model yolu test edilmedi.

## Çalıştırma

```bash
cd starter   # ya da solution
npm install
npx playwright install chromium
npm test
```

`npm run dev` ile arayüzü açabilirsiniz (http://localhost:3000).
