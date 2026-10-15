---
title: "AI ile Test ve Code Review"
description: "Test yazdırma, Playwright MCP ile kontrol ve AI çıktısını gözden geçirme."
lastVerified: "2026-10-15"
translationKey: "ai/testing-and-code-review"
---

AI test yazmakta hızlıdır. Ama geçen test, işe yarayan test demek değildir. Bu rehberde üç şeyi göreceksiniz: AI'a nasıl test yazdıracağınızı, Playwright MCP ile tarayıcıda nasıl kontrol ettireceğinizi ve çıktısını nasıl gözden geçireceğinizi. Örnekler [Modeller ve Araçlar](/academy/ai/models-and-tools) rehberindeki e-ticaret sepetinden gidiyor: `CartItem` bileşeni, adet butonları ve stok sınırı.

> [!NOTE]
>
> Bu rehberdeki kodlar `vitest@5.0.4`, `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.8`, `@testing-library/jest-dom@7.0.1`, `@playwright/test@1.64.1` ve `@playwright/mcp@0.0.83` ile Node 22'de çalıştırıldı. Playwright MCP Node 18 veya üstünü istiyor.[^1] MCP'yi bağlamayı bilmiyorsanız önce [MCP](/academy/ai/mcp) rehberine bakın.

## Önce testleri çalıştırın

Simon Willison, mevcut bir projede oturumu şu cümleyle açmayı öneriyor: *"First run the tests"*. Ajan testlerin nasıl çalıştığını öğrenir, değişiklikten sonra tekrar çalıştırma ihtimali artar ve test yazma moduna girer.[^2] Willison'a göre ajanlarla çalışırken otomatik test artık isteğe bağlı değil. Ajan testi hızlıca yazabildiği için eski *"zaman alıyor"* itirazı kalmadı.[^2]

Claude Code dokümanındaki test tarifi dört adımdan oluşuyor.[^3] Aynı sırayı `CartItem` için şöyle yazabilirsiniz:

```text
CartItem.tsx içinde testle kapsanmayan davranışları listele
CartItem için test yaz
Stok sınırı ve en düşük adet için sınır durumu testleri ekle
Yeni testleri çalıştır, hata varsa düzelt
```

Doküman iki şey daha söylüyor. Claude mevcut test dosyalarına bakıp aynı çatıyı ve assertion stilini kullanır. Ne doğrulanacağını somut söylemeniz gerekir.[^3]

> [!TIP]
>
> *"Test yaz"* demeyin. *"Stok bitince Artır butonu kapanmalı"* deyin. Davranışı siz söylerseniz AI, bileşenin iç yapısını test etmeye kaymaz.

## İyi test neye benzer

Kent C. Dodds'a göre iç ayrıntıları test eden testler iki şekilde yanıltır. İç yapıyı yeniden düzenleyince uygulama çalıştığı hâlde test kırılır (yanlış negatif). Uygulama bozulunca da test geçebilir (yanlış pozitif).[^4] Çözüm, bileşeni kullanıcı gibi test etmek.

Testing Library bunun için bir sorgu sırası öneriyor:[^5]

| Öncelik | Sorgular |
| --- | --- |
| 1. Herkesin erişebildiği | `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue` |
| 2. Anlamsal | `getByAltText`, `getByTitle` |
| 3. Son çare | `getByTestId` |

`getByRole` çoğu durumda ilk tercih. Bu sorguyla bir öğeyi bulamıyorsanız arayüz erişilebilir olmayabilir.[^5]

Kent'in "Common mistakes" yazısı aynı çizgide birkaç somut düzeltme veriyor:[^6]

| Zayıf | Güçlü |
| --- | --- |
| `container.querySelector('li')` | `screen.getByRole(...)` |
| `fireEvent.click(...)` | `userEvent` ile tıklama |
| `expect(button.disabled).toBe(true)` | `expect(button).toBeDisabled()` |
| `waitFor(() => getBy...)` | `await findBy...` |
| Varlığı `queryBy` ile kontrol etmek | `getBy`. `queryBy` yalnızca yokluk için |

### Örnek: CartItem

```tsx
// src/cart-item.tsx
import { useState } from 'react';

const tl = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

type Props = { name: string; price: number; stock: number };

export function CartItem({ name, price, stock }: Props) {
  const [qty, setQty] = useState(1);

  return (
    <li>
      <span>{name}</span>
      <button type="button" onClick={() => setQty(q => q - 1)} disabled={qty <= 1}>
        Azalt
      </button>
      <span>{qty} adet</span>
      <button type="button" onClick={() => setQty(q => q + 1)} disabled={qty >= stock}>
        Artır
      </button>
      <strong>{tl.format(price * qty)}</strong>
    </li>
  );
}
```

Kurulum dosyaları:

```ts
// src/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', setupFiles: ['./src/setup.ts'], include: ['src/**/*.test.tsx'] },
});
```

> [!WARNING]
>
> Vitest'te `globals` açık değilse Testing Library testler arasında temizlik yapmaz. Çünkü otomatik temizlik, global `afterEach` varsa devreye girer.[^7] Belirti: testler tek tek geçer ama birlikte çalışınca "Found multiple elements with the role..." hatası çıkar. Bu kurulumda aynı hata oluştu. Çözüm iki yoldan biri: `globals: true` açmak ya da yukarıdaki gibi `afterEach(() => cleanup())` yazmak.[^7]

Şimdi iki test dosyası. İlki, *"bu bileşene test yaz"* dendiğinde yüzeyde yeterli görünen türden:

```tsx
// src/weak.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CartItem } from './cart-item';

it('renders', () => {
  const { container } = render(<CartItem name="Kulaklık" price={100} stock={3} />);
  expect(container).toBeTruthy();
  expect(container.querySelector('li')).not.toBeNull();
});

it('increases quantity', () => {
  render(<CartItem name="Kulaklık" price={100} stock={3} />);
  fireEvent.click(screen.getByText('Artır'));
  expect(screen.getByText('2 adet')).toBeTruthy();
});
```

İkincisi kullanıcının gördüğünü ve yaptığını test ediyor:

```tsx
// src/good.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { CartItem } from './cart-item';

it('adet arttıkça tutarı günceller', async () => {
  const user = userEvent.setup();
  render(<CartItem name="Kulaklık" price={100} stock={3} />);

  await user.click(screen.getByRole('button', { name: 'Artır' }));

  expect(screen.getByText('2 adet')).toBeInTheDocument();
  expect(screen.getByText('₺200,00')).toBeInTheDocument();
});

it('stok bitince Artır butonunu kapatır', async () => {
  const user = userEvent.setup();
  render(<CartItem name="Kulaklık" price={100} stock={3} />);

  await user.click(screen.getByRole('button', { name: 'Artır' }));
  await user.click(screen.getByRole('button', { name: 'Artır' }));

  expect(screen.getByText('3 adet')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Artır' })).toBeDisabled();
});

it('1 adetin altına inmez', () => {
  render(<CartItem name="Kulaklık" price={100} stock={3} />);
  expect(screen.getByRole('button', { name: 'Azalt' })).toBeDisabled();
});
```

Temiz kodda ikisi de geçer (5 test, 5 yeşil). Asıl fark kodu bozunca ortaya çıkar:

| Bilerek eklenen hata | Zayıf test | Güçlü test |
| --- | --- | --- |
| Stok sınırı: `qty >= stock` yerine `qty > stock` | Geçti | Kırıldı |
| Tutar adetle çarpılmıyor: `price * qty` yerine `price` | Geçti | Kırıldı |

Zayıf test iki hatayı da kaçırdı. Stok aşılabiliyor ve tutar yanlış, ama ekran yeşil. Yeşil çıktı burada yanlış güven veriyor.

> [!DO]
>
> AI testi yazdıktan sonra kodu bilerek bozun. Test kırılmıyorsa o test sizi korumuyor.

> [!DONT]
>
> Yalnızca *"tüm testler geçti"* çıktısına bakıp ilerlemeyin. Yukarıdaki zayıf test iki hatayı da kaçırdı.

Bu fikir ciddi bir ölçekte de kullanılıyor. Meta'nın ACH sistemi önce bilerek hatalı kod sürümleri (mutant) üretiyor, sonra bunları yakalayan testleri bir LLM'e yazdırıyor. Messenger ve WhatsApp'taki test-a-thon'larda mühendisler üretilen testlerin %73'ünü kabul etmiş.[^8] Çalışma Android Kotlin sınıfları üzerinde yapıldı. Frontend için doğrudan karşılığı yok, ama *"önce hatayı üret, testin yakaladığını göster"* mantığı aynı.

Simon Willison da aynı şeyi şöyle söylüyor: her değişiklik, uygulama geri alınınca kırılan bir test içermeli.[^9]

## Playwright ile tarayıcıda test

Vitest ve jsdom bileşeni tek başına sınar. Gerçek tarayıcıda sayfanın bütününü Playwright sınar. Playwright'ın en iyi pratikler sayfası şunları öneriyor:[^10]

- Kullanıcının gördüğü davranışı test edin. Fonksiyon adlarına veya CSS sınıflarına bağlanmayın.
- `getByRole` gibi dayanıklı locator'lar kullanın. CSS ve XPath seçicileri DOM değişince kırılır.
- Web-first assertion kullanın. `toBeVisible()` koşul sağlanana kadar bekler, `isVisible()` beklemez.
- Her testi diğerlerinden bağımsız tutun.
- Yalnızca kontrol ettiğiniz sistemi test edin. Üçüncü taraf yanıtlarını mock'layın.
- CI hatalarında video yerine trace'e bakın. Trace kaydı pahalı olduğu için yalnızca yeniden denemelerde açmanız öneriliyor.

Aşağıdaki sayfa `CartItem`'ın düz HTML karşılığı:

```html
<!-- demo/index.html -->
<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><title>Sepet</title></head>
<body>
  <h1>Sepet</h1>
  <ul>
    <li>
      <span>Kulaklık</span>
      <button type="button" id="dec">Azalt</button>
      <span id="qty">1 adet</span>
      <button type="button" id="inc">Artır</button>
      <strong id="total">₺100,00</strong>
    </li>
  </ul>
  <script>
    const stock = 3, price = 100;
    let qty = 1;
    const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
    const dec = document.getElementById('dec'), inc = document.getElementById('inc');
    function render() {
      document.getElementById('qty').textContent = qty + ' adet';
      document.getElementById('total').textContent = fmt.format(price * qty);
      dec.disabled = qty <= 1;
      inc.disabled = qty >= stock;
    }
    dec.onclick = () => { qty--; render(); };
    inc.onclick = () => { qty++; render(); };
    render();
  </script>
</body>
</html>
```

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'python3 -m http.server 4173 -d demo',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:4173' },
});
```

Burada demo sayfayı statik sunucuyla açıyoruz. Kendi projenizde `command` alanına dev sunucu komutunuzu yazın.

```ts
// e2e/cart.spec.ts
import { expect, test } from '@playwright/test';

test('stok bitince Artır butonu kapanır', async ({ page }) => {
  await page.goto('/');

  const inc = page.getByRole('button', { name: 'Artır' });
  await inc.click();
  await inc.click();

  await expect(page.getByText('3 adet')).toBeVisible();
  await expect(page.getByText('₺300,00')).toBeVisible();
  await expect(inc).toBeDisabled();
});
```

Sayfadaki `inc.disabled = qty >= stock` satırını `qty > stock` yapınca test şu hatayla kırıldı:

```text
Error: expect(locator).toBeDisabled() failed
Expected: disabled
Received: enabled
```

Geri alınca test yeniden geçti.

## Playwright MCP ile AI'a tarayıcı vermek

Playwright MCP, AI'a tarayıcıyı kullandıran bir MCP sunucusu. Sayfayı ekran görüntüsüyle değil, Playwright'ın erişilebilirlik ağacından aldığı yapısal anlık görüntüyle (snapshot) okuyor. Bu yüzden görsel model gerektirmiyor.[^1]

Kurulum için standart ayar çoğu istemcide çalışıyor:[^1]

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless", "--isolated"]
    }
  }
}
```

Claude Code'da tek komut yetiyor:[^1]

```command
claude mcp add playwright npx @playwright/mcp@latest
```

`--headless` tarayıcıyı arayüzsüz çalıştırır. Varsayılan hâli arayüzlü. `--isolated` ise tarayıcı profilini diske yazmadan bellekte tutar.[^1]

### Gerçek bir oturum

`0.0.83` sürümü 25 araç sundu. Sık kullanacaklarınız: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_find`, `browser_fill_form`, `browser_wait_for`, `browser_console_messages`, `browser_network_requests` ve `browser_take_screenshot`. Demo sayfada `browser_navigate` ve `browser_snapshot` çağrılınca şu çıktı geldi:

```yaml
- heading "Sepet" [level=1] [ref=e2]
- list [ref=e3]:
  - listitem [ref=e4]:
    - text: Kulaklık
    - button "Azalt" [disabled] [ref=e5]
    - text: 1 adet
    - button "Artır" [ref=e6]
    - strong [ref=e7]: ₺100,00
```

`browser_click` iki kez `Artır` butonunun `e6` referansıyla çağrılınca anlık görüntü şuna döndü:

```yaml
    - button "Azalt" [ref=e5]
    - text: 3 adet
    - button "Artır" [disabled] [ref=e6]
    - strong [ref=e7]: ₺300,00
```

İki şey dikkat çekiyor:

- Anlık görüntüdeki rol ve isimler (`button "Artır"`), testte kullandığınız `getByRole('button', { name: 'Artır' })` locator'ıyla eşleşiyor.
- `browser_click` çalıştırdığı Playwright kodunu da döndürüyor: `await page.getByRole('button', { name: 'Artır' }).click();`. Bu satırı doğrudan teste taşıyabilirsiniz.

Yanıtta ayrıca `Console: 1 errors` satırı da var. Demo sayfada bu, statik sunucunun `favicon.ico` için döndürdüğü 404'tü. Gerçek bir hatayı da aynı yerden görürsünüz.

> [!WARNING]
>
> Araç parametreleri sürümle değişiyor. `0.0.83`'te `browser_click` için `target` zorunlu. Eski öğreticilerdeki `ref` parametresiyle çağrı `Invalid arguments for tool "browser_click"` hatası verdi. Öğretici kodunu kopyalamadan önce `listTools` çıktısına veya sunucunun sürümüne bakın.

### Akış: önce elle gör, sonra teste çevir

Willison'ın önerdiği sıra şu: önce değişikliği çalışırken görün, sonra geri alınınca kırılan bir otomatik test yazın. Ona göre ajanlar için elle test ile otomatik test pratikte aynı şey.[^9] Playwright MCP ile bu akış kısalıyor:

```text
Tarayıcıda http://localhost:4173 sayfasını aç.
Artır butonuna stok bitene kadar bas.
Buton kapandı mı ve tutar doğru mu kontrol et.
Sonra bu akışı e2e/cart.spec.ts içine Playwright testi olarak yaz.
Testi çalıştır.
```

Ardından üstteki gibi kodu bozup testin kırıldığını görün.

> [!CAUTION]
>
> Playwright MCP bir güvenlik sınırı değil. Proje bunu kendi README'sinde açıkça yazıyor.[^1] `browser_run_code_unsafe` aracı Playwright sunucu sürecinde rastgele JavaScript çalıştırıyor ve README bunu uzaktan kod çalıştırmaya eşdeğer sayıyor. `--allowed-origins` ve `--blocked-origins` ayarları da güvenlik sınırı değil.[^1] Güvenmediğiniz sitelerde kullanmayın ve ajanın araç iznini gözden geçirin.

## Playwright Test Agents

Playwright'ın kendi içinde üç hazır ajan var:[^11]

| Ajan | Ne yapar |
| --- | --- |
| Planner | Uygulamayı gezer ve `specs/` altına Markdown test planı yazar. Bir seed test ister |
| Generator | Planı `tests/` altında Playwright testlerine çevirir ve seçicileri canlı doğrular. İlk çıktıda hata olabilir |
| Healer | Başarısız testleri yeniden çalıştırır, arayüze bakar, düzeltme önerir. Test geçer ya da işlev bozuk görünüyorsa atlanır |

Kurulum tek komut. Claude Code için şöyle çalıştı:

```command
npx playwright init-agents --loop=claude
```

Komut `.claude/agents/` altına üç ajan tanımını, bir `.mcp.json` dosyasını, `specs/README.md` dosyasını ve `e2e/seed.spec.ts` seed testini oluşturdu. `.mcp.json` içindeki sunucu `npx playwright run-test-mcp-server` komutuyla çalışıyor. Bu, yukarıdaki `@playwright/mcp` paketinden ayrı bir sunucu. Doküman VS Code, Claude Code, Codex ve OpenCode'u listeliyor. VS Code ajanları için v1.105 gerekiyor. Playwright'ı güncelleyince ajan tanımlarını yeniden üretmeniz öneriliyor.[^11]

> [!TIP]
>
> Healer'ın değiştirdiği testi diff olarak okuyun. Test geçti diye doğru olduğu anlamına gelmez. Beklentiyi gevşetmiş olabilir. Testi bozup kırıldığını yine kontrol edin.

## AI çıktısını gözden geçirme

Willison'a göre sizin işiniz *"çalıştığını kanıtladığınız kod teslim etmek"*. Büyük ve test edilmemiş bir PR göndermek, asıl işi gözden geçirene yüklemek demek. Kanıt olarak PR'a komut ve çıktısını yapıştırabilir, zor gösterilen değişiklikte ekran kaydı ekleyebilirsiniz. AI kullanmanız sorumluluğu değiştirmiyor, teslim edilen işten yine siz sorumlusunuz.[^9]

Addy Osmani, AI kodunda sık gördüğü kalıpları sıralıyor. Bunlar yazarın gözlemi, ölçülmüş veri değil:[^12]

- **Yanlış varsayım:** Model baştaki bir yanlış anlamanın üstüne kurar. Birkaç PR sonra ortaya çıkabilir.
- **Gereksiz soyutlama:** İş için gerekenden çok daha fazla yapı ekler.
- **Ölü kod:** Eski uygulama kalır, ilgisiz yerlerde yorum veya kod değişir.
- **Onaylama eğilimi:** Model nadiren itiraz eder veya soru sorar.

Osmani'nin önerileri: doğrulamayı CI, linter, tip denetimi ve testlerle otomatikleştirin, görevlere net başarı ölçütü koyun, tekrar eden hatayı lint kuralına çevirin ve modele kendi kodunu yeni bir bağlam penceresinde inceletin.[^12]

Güvenlik tarafı ayrı bir risk. Veracode'un Mart 2026 güncellemesi Java, JavaScript, C# ve Python'da 80 kodlama görevi ölçtü. Görevlerin yalnızca %55'inde güvenli kod çıktı. JavaScript'te oran %57. XSS'te güvenli çıkan oran %15, log injection'da %13. Model büyüklüğünün etkisi çok küçük çıktı.[^13]

Bunları kısa bir kontrol listesine çevirebilirsiniz:

| Bakılacak şey | Nasıl bakılır |
| --- | --- |
| Çalıştığı kanıtlandı mı? | PR'da komut çıktısı veya ekran kaydı arayın |
| Test koruyor mu? | Kodu bilerek bozun, test kırılmalı |
| Test kullanıcı gibi mi? | `getByRole`, `userEvent`, `toBeDisabled` gibi sorgu ve assertion'lara bakın[^6] |
| Gereksiz kod var mı? | Yeni soyutlamalara, kullanılmayan dosya ve fonksiyonlara bakın |
| Kullanıcı girdisi nereye gidiyor? | HTML'e çevrilen yerlere (`dangerouslySetInnerHTML`, `innerHTML`) özellikle bakın |

İkinci bir göz için modele şunu yazdırabilirsiniz (yeni bir oturumda):

```text
Bu diff'i incele. Yanlış varsayım, gereksiz soyutlama, ölü kod ve kullanıcı girdisiyle ilgili güvenlik sorunu ara. Her bulgu için dosya ve satır ver. Sorun yoksa "sorun bulamadım" de.
```

> [!NOTE]
>
> Bu ikinci inceleme insan incelemesinin yerini tutmaz. Yalnızca gözden kaçanları azaltır.

## Kendin dene

1. `CartItem` ve iki test dosyasını kurun. Önce `afterEach(() => cleanup())` satırını silip "Found multiple elements" hatasını görün, sonra geri ekleyin.
2. `qty >= stock` satırını `qty > stock` yapın. Hangi testin kırıldığına, hangisinin geçtiğine bakın. Sonra geri alın.
3. Kendi bir bileşeniniz için AI'a *"test yaz"* dedirtin. Çıktıdaki testleri bilerek bozduğunuz kodla deneyin. Kaçırdığı bir hata var mı?
4. Demo sayfayı Playwright MCP ile gezdirin, akışı `e2e/cart.spec.ts` olarak yazdırın ve çalıştırın.
5. Son değişikliğiniz için yukarıdaki inceleme istemini yeni bir oturumda çalıştırın. Bulduklarını kendiniz doğrulayın.

## Kaynaklar

1. [Playwright MCP](https://github.com/microsoft/playwright-mcp) *(repo)* — Erişilebilirlik anlık görüntüsü, kurulum ayarı, seçenekler ve güvenlik notları.
2. [Simon Willison: First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/) *(article)* — Ajanla çalışırken oturumu testleri çalıştırarak başlatma ve otomatik testin neden zorunlu olduğu.
3. [Claude Code: Common workflows](https://code.claude.com/docs/en/common-workflows) *(article)* — "Work with tests" tarifi: test edilmemiş kodu bulma, test yazdırma, sınır durumları ve çalıştırıp doğrulama.
4. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — İç ayrıntıları test etmenin yanlış negatif ve yanlış pozitif üretmesi (Ağustos 2020).
5. [Testing Library: About Queries](https://testing-library.com/docs/queries/about/#priority) *(article)* — Sorgu öncelik sırası ve `getByRole` önerisi.
6. [Kent C. Dodds: Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) *(article)* — Sık yapılan sorgu, etkileşim ve assertion hataları ve düzeltmeleri (Mayıs 2020).
7. [Testing Library: React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/) *(article)* — Otomatik temizlik ve Vitest için `globals` ya da elle `cleanup`.
8. [Foster ve ark.: Mutation-Guided LLM-based Test Generation at Meta](https://arxiv.org/abs/2501.12862) *(research)* — Mutant üretip onları yakalayan testleri LLM'e yazdırma (Ocak 2025).
9. [Simon Willison: Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work) *(article)* — Elle test, geri alınca kırılan otomatik test ve ajanlardan kanıt isteme (18 Aralık 2025).
10. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(article)* — Kullanıcı davranışını test etme, locator'lar, web-first assertion, izolasyon ve trace.
11. [Playwright: Test Agents](https://playwright.dev/docs/test-agents) *(article)* — Planner, generator ve healer ajanları ve `init-agents` kurulumu.
12. [Addy Osmani: The 80% Problem in Agentic Coding](https://addyosmani.com/blog/the-80-problem-in-agentic-coding/) *(article)* — AI kodunda sık hata kalıpları ve doğrulama önerileri (28 Ocak 2026).
13. [Veracode: Spring 2026 GenAI Code Security Update](https://www.veracode.com/blog/spring-2026-genai-code-security) *(research)* — AI kodunda güvenlik başarı oranları, dil ve zafiyet türüne göre (24 Mart 2026).
