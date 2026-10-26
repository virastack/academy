# AI ekibiyle özellik

Sepete kupon kodu özelliğini spec, frontend, test ve inceleme ajanlarından oluşan bir ekiple geliştirme projesi. Anlatım rehberde, burada yalnızca dosyalar var.

- `starter/`: Buradan başlayın. Kuponsuz bir sepet, geçen testler, `CLAUDE.md` ve `.claude/` altında dört ajan, iki hook ve `/feature-team` skill'i.
- `solution/`: Ekibin çıkardığı örnek sonuç. `SPEC.md`, kupon kodu, testler ve `test-report.md`. Sizin sonucunuz farklı olabilir.

```bash
cd starter
npm install
npx playwright install chromium
npm test        # başlangıçta tüm testler geçer
claude          # sonra: /feature-team sepete kupon kodu
```

Hook'lar `jq` kullanır. macOS'ta `brew install jq` ile kurun.
