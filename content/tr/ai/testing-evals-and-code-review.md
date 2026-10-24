---
title: "Test, eval ve code review"
description: "Test yazdırma, Playwright MCP ile kontrol, model çıktısını ölçme (eval) ve AI kodunu gözden geçirme."
lastVerified: "2026-10-15"
translationKey: "ai/testing-evals-and-code-review"
---

AI test yazmakta hızlıdır. Ama geçen test, işe yarayan test demek değildir. Bu rehberde dört şeyi göreceksiniz: AI'a nasıl test yazdıracağınızı, Playwright MCP ile tarayıcıda nasıl kontrol ettireceğinizi, modelin cevaplarını nasıl ölçeceğinizi ve AI çıktısını nasıl gözden geçireceğinizi. Test örnekleri [Modeller ve Araçlar](/academy/ai/models-and-tools) rehberindeki e-ticaret sepetinden gidiyor: `CartItem` bileşeni, adet butonları ve stok sınırı.

> [!NOTE]
>
> Bu rehberdeki kodlar `vitest@5.0.4`, `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.8`, `@testing-library/jest-dom@7.0.1`, `@playwright/test@1.64.1` ve `@playwright/mcp@0.0.83` ile Node 22'de çalıştırıldı. Playwright MCP Node 18 veya üstünü istiyor.[^1] MCP'yi bağlamayı bilmiyorsanız önce [MCP](/academy/ai/mcp) rehberine bakın.

## Önce testleri çalıştırın

[Simon Willison](https://simonwillison.net), mevcut bir projede oturumu şu cümleyle açmayı öneriyor: *"First run the tests"*. Ajan testlerin nasıl çalıştığını öğrenir, değişiklikten sonra tekrar çalıştırma ihtimali artar ve test yazma moduna girer.[^2]

Claude Code dokümanındaki test tarifi dört adımdan oluşuyor.[^3] Aynı sırayı `CartItem` için şöyle yazabilirsiniz:

```text
CartItem.tsx içinde testle kapsanmayan davranışları listele
CartItem için test yaz
Stok sınırı ve en düşük adet için sınır durumu testleri ekle
Yeni testleri çalıştır, hata varsa düzelt
```

Doküman, Claude'un mevcut test dosyalarındaki çatıyı ve assertion stilini kullandığını da söylüyor. Ne doğrulanacağını somut yazmanız gerekir.[^3]

> [!TIP]
>
> *"Test yaz"* demeyin. *"Stok bitince Artır butonu kapanmalı"* deyin. Davranışı siz söylerseniz AI, bileşenin iç yapısını test etmeye kaymaz.

## İyi test neye benzer

[Kent C. Dodds](https://kentcdodds.com)'a göre iç ayrıntıları test eden testler iki şekilde yanıltır. İç yapıyı yeniden düzenleyince uygulama çalıştığı hâlde test kırılır. Uygulama bozulunca da test geçebilir.[^4] Çözüm, bileşeni kullanıcı gibi test etmek.

Testing Library bunun için bir sorgu sırası öneriyor:[^5]

| Öncelik | Sorgular |
| --- | --- |
| 1. Herkesin erişebildiği | `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue` |
| 2. Anlamsal | `getByAltText`, `getByTitle` |
| 3. Son çare | `getByTestId` |

`getByRole` çoğu durumda ilk tercih. Bu sorguyla bir öğeyi bulamıyorsanız arayüz erişilebilir olmayabilir.[^5]

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
> Vitest'te `globals` açık değilse Testing Library testler arasında temizlik yapmaz, çünkü otomatik temizlik global `afterEach` varsa devreye girer. Belirti: testler tek tek geçer ama birlikte çalışınca "Found multiple elements with the role..." hatası çıkar. Çözüm: `globals: true` açmak ya da yukarıdaki gibi `afterEach(() => cleanup())` yazmak.[^6]

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

Zayıf test iki hatayı da kaçırdı. Stok aşılabiliyor ve tutar yanlış, ama ekran yeşil.

> [!DO]
>
> AI testi yazdıktan sonra kodu bilerek bozun. Test kırılmıyorsa o test sizi korumuyor. [Willison](https://simonwillison.net) da aynısını söylüyor: her değişiklik, uygulama geri alınınca kırılan bir test içermeli.[^7]

> [!DONT]
>
> Yalnızca *"tüm testler geçti"* çıktısına bakıp ilerlemeyin.

## Playwright ile tarayıcıda test

Vitest ve jsdom bileşeni tek başına sınar. Gerçek tarayıcıda sayfanın bütününü Playwright sınar. En iyi pratikler sayfasından işinize yarayacaklar:[^8]

- Kullanıcının gördüğü davranışı test edin. Fonksiyon adlarına veya CSS sınıflarına bağlanmayın.
- `getByRole` gibi dayanıklı locator'lar kullanın. CSS ve XPath seçicileri DOM değişince kırılır.
- Web-first assertion kullanın. `toBeVisible()` koşul sağlanana kadar bekler, `isVisible()` beklemez.
- Her testi diğerlerinden bağımsız tutun.

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

Playwright MCP, AI'a tarayıcıyı kullandıran bir MCP sunucusu. Sayfayı ekran görüntüsüyle değil, erişilebilirlik ağacından aldığı yapısal anlık görüntüyle (snapshot) okuyor. Bu yüzden görsel model gerektirmiyor.[^1] Claude Code'da tek komut yetiyor:[^1]

```command
claude mcp add playwright npx @playwright/mcp@latest
```

Demo sayfada `browser_navigate` ve `browser_snapshot` çağrılınca şu çıktı geldi:

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

`browser_click` iki kez `Artır` butonuyla çağrılınca anlık görüntü şuna döndü:

```yaml
    - button "Azalt" [ref=e5]
    - text: 3 adet
    - button "Artır" [disabled] [ref=e6]
    - strong [ref=e7]: ₺300,00
```

Anlık görüntüdeki rol ve isimler (`button "Artır"`), testte kullandığınız `getByRole('button', { name: 'Artır' })` ile eşleşiyor. `browser_click` ayrıca çalıştırdığı Playwright kodunu da döndürüyor, bu satırı doğrudan teste taşıyabilirsiniz.

[Willison](https://simonwillison.net)'ın önerdiği akış şu: önce değişikliği çalışırken görün, sonra geri alınınca kırılan bir otomatik test yazın.[^7] Playwright MCP ile bu kısalıyor:

```text
Tarayıcıda http://localhost:4173 sayfasını aç.
Artır butonuna stok bitene kadar bas.
Buton kapandı mı ve tutar doğru mu kontrol et.
Sonra bu akışı e2e/cart.spec.ts içine Playwright testi olarak yaz.
Testi çalıştır.
```

Ardından yukarıdaki gibi kodu bozup testin kırıldığını görün.

> [!CAUTION]
>
> Playwright MCP bir güvenlik sınırı değil. Proje bunu kendi README'sinde açıkça yazıyor. `browser_run_code_unsafe` aracı sunucu sürecinde rastgele JavaScript çalıştırıyor ve README bunu uzaktan kod çalıştırmaya eşdeğer sayıyor. `--allowed-origins` ve `--blocked-origins` da güvenlik sınırı değil.[^1] Güvenmediğiniz sitelerde kullanmayın ve ajanın araç iznini gözden geçirin.

## Playwright Test Agents

Playwright'ın kendi içinde üç hazır ajan var:[^9]

| Ajan | Ne yapar |
| --- | --- |
| Planner | Uygulamayı gezer ve `specs/` altına Markdown test planı yazar. Bir seed test ister |
| Generator | Planı `tests/` altında Playwright testlerine çevirir ve seçicileri canlı doğrular. İlk çıktıda hata olabilir |
| Healer | Başarısız testleri yeniden çalıştırır, arayüze bakar, düzeltme önerir |

Kurulum tek komut. Claude Code için şöyle çalıştı:

```command
npx playwright init-agents --loop=claude
```

Komut `.claude/agents/` altına üç ajan tanımını, bir `.mcp.json` dosyasını ve `e2e/seed.spec.ts` seed testini oluşturdu. Playwright'ı güncelleyince ajan tanımlarını yeniden üretmeniz öneriliyor.[^9]

> [!TIP]
>
> Healer'ın değiştirdiği testi diff olarak okuyun. Test geçti diye doğru olduğu anlamına gelmez, beklentiyi gevşetmiş olabilir.

## Model çıktısını ölçmek (eval)

Testler kodunuzu sınar. Eval ise modelin cevabının işe yarayıp yaramadığını ölçer. Model ya da prompt değişince cevaplar değişebilir, bu yüzden "elle denedim, iyi göründü" yetmez. Eval üç parçadan oluşur: sabit bir girdi listesi, her cevap için bir notlandırıcı ve bir geçme oranı.

- **Küçük başlayın.** Anthropic, gerçek hatalardan çıkarılmış 20–50 basit görevi iyi bir başlangıç sayıyor.[^10]
- **Kenar durumları ekleyin.** Boş, çok uzun ve belirsiz girdiler listede olmalı.[^11]
- **En basit notlandırıcıyı seçin.** Önce kodla notlandırmayı deneyin, nüans gerektiriyorsa modelle notlandırın.[^10][^11]
- **Kayıtları okuyun.** Notlandırıcının doğru çalıştığını ancak cevapları ve notları okuyarak anlarsınız.[^10]

| Yöntem | Artısı | Eksisi |
| --- | --- | --- |
| Kodla (tam eşleşme, içerir mi) | En hızlı ve güvenilir | Nüanslı yargıda yetersiz |
| Modelle (LLM-as-judge) | Esnek ve ölçeklenir | Önce insan etiketleriyle doğrulanmalı |
| İnsan | En kaliteli | Yavaş ve pahalı |

Model ile notlandırırken cevabı üreten modelden farklı bir model kullanmak ve net bir rubrik vermek öneriliyor.[^11] [Hamel Husain](https://hamel.dev) da modelin verdiği notu insan etiketleriyle karşılaştırıp hizalamayı öneriyor.[^12]

Aşağıdaki örnek, kullanıcı cümlesinden en yüksek fiyatı çıkaran bir göreve eval kuruyor. Gerçekte `v1` ve `v2` iki farklı prompt ya da model sürümü olur. Burada çevrimdışı çalışsın diye iki fonksiyon kullandık:

```ts
// eval.ts
type Case = { input: string; expected: number | null };

const cases: Case[] = [
  { input: 'koşu ayakkabısı 1500 TL altı', expected: 1500 },
  { input: '2.500 TL bütçem var', expected: 2500 },
  { input: 'en fazla 800 tl', expected: 800 },
  { input: 'koşu ayakkabısı göster', expected: null }, // fiyat yok
  { input: '', expected: null },                       // boş girdi
];

function runEval(name: string, fn: (s: string) => number | null) {
  const failed = cases.filter((c) => fn(c.input) !== c.expected);
  const pass = cases.length - failed.length;
  console.log(`${name}: ${pass}/${cases.length}`);
  for (const c of failed) console.log(`  ✗ "${c.input}" → ${fn(c.input)} (beklenen ${c.expected})`);
  return pass / cases.length;
}

const v1 = (s: string) => Number(s.match(/(\d+)\s*tl/i)?.[1] ?? NaN) || null;
const v2 = (s: string) => {
  const m = s.match(/(\d{1,3}(?:\.\d{3})*|\d+)\s*tl/i);
  return m ? Number(m[1].replaceAll('.', '')) : null;
};

const a = runEval('v1', v1);
const b = runEval('v2', v2);
if (b < a || b < 1) process.exitCode = 1;
```

```command
node eval.ts
```

```text
v1: 4/5
  ✗ "2.500 TL bütçem var" → 500 (beklenen 2500)
v2: 5/5
```

`v1` nokta ile yazılan binlik ayracını okuyamıyor, eval bunu hemen gösteriyor. Sürüm değiştirdiğinizde oran düşerse (`b < a`) çıkış kodu 1 olur ve CI'da kırmızı görürsünüz.

Gerçek modelde aynı döngüyü model çağrısıyla kurun. Cevap her seferinde değişebileceği için her vakayı birkaç kez çalıştırın. Tutarlılık önemliyse, tüm denemelerin geçme olasılığını ölçen `pass^k` ölçütünü kullanın.[^10]

## AI çıktısını gözden geçirme

[Willison](https://simonwillison.net)'a göre sizin işiniz *"çalıştığını kanıtladığınız kod teslim etmek"*. Büyük ve test edilmemiş bir PR göndermek, asıl işi gözden geçirene yüklemek demek. Kanıt olarak PR'a komut ve çıktısını yapıştırabilir, zor gösterilen değişiklikte ekran kaydı ekleyebilirsiniz.[^7]

[Addy Osmani](https://addyosmani.com), AI kodunda sık gördüğü kalıpları sıralıyor. Bunlar yazarın gözlemi, ölçülmüş veri değil:[^13]

- **Yanlış varsayım:** Model baştaki bir yanlış anlamanın üstüne kurar. Birkaç PR sonra ortaya çıkabilir.
- **Gereksiz soyutlama:** İş için gerekenden çok daha fazla yapı ekler.
- **Ölü kod:** Eski uygulama kalır, ilgisiz yerlerde yorum veya kod değişir.

Önerisi: doğrulamayı CI, linter, tip denetimi ve testlerle otomatikleştirin ve modele kendi kodunu yeni bir bağlam penceresinde inceletin.[^13]

Güvenlik ayrı bir risk. Veracode'un Mart 2026 güncellemesi Java, JavaScript, C# ve Python'da 80 kodlama görevi ölçtü. Görevlerin yalnızca %55'inde güvenli kod çıktı. JavaScript'te oran %57, XSS'te %15.[^14]

Bunları kısa bir kontrol listesine çevirebilirsiniz:

| Bakılacak şey | Nasıl bakılır |
| --- | --- |
| Çalıştığı kanıtlandı mı? | PR'da komut çıktısı veya ekran kaydı arayın |
| Test koruyor mu? | Kodu bilerek bozun, test kırılmalı |
| Test kullanıcı gibi mi? | `getByRole`, `userEvent`, `toBeDisabled` gibi sorgu ve assertion'lara bakın[^5] |
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

1. `CartItem` ve iki test dosyasını kurun. `qty >= stock` satırını `qty > stock` yapın. Hangi testin kırıldığına, hangisinin geçtiğine bakın. Sonra geri alın.
2. Kendi bir bileşeniniz için AI'a *"test yaz"* dedirtin ve bilerek bozduğunuz kodla deneyin. Kaçırdığı bir hata var mı?
3. Demo sayfayı Playwright MCP ile gezdirin, akışı `e2e/cart.spec.ts` olarak yazdırın ve çalıştırın.
4. `eval.ts` dosyasına kendi bir vakanızı ekleyin (örneğin `"bin TL"`). `v2`'yi bozmadan geçmesini sağlayın.
5. Son değişikliğiniz için yukarıdaki inceleme istemini yeni bir oturumda çalıştırın. Bulduklarını kendiniz doğrulayın.

## Kaynaklar

1. [Playwright MCP](https://github.com/microsoft/playwright-mcp) *(repo)* — Erişilebilirlik anlık görüntüsü, kurulum ayarı, seçenekler ve güvenlik notları.
2. [Simon Willison: First run the tests](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/) *(article)* — Ajanla çalışırken oturumu testleri çalıştırarak başlatma.
3. [Claude Code: Common workflows](https://code.claude.com/docs/en/common-workflows) *(doc)* — "Work with tests" tarifi: test edilmemiş kodu bulma, test yazdırma, sınır durumları ve çalıştırıp doğrulama.
4. [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) *(article)* — İç ayrıntıları test etmenin yanlış negatif ve yanlış pozitif üretmesi (Ağustos 2020).
5. [Testing Library: About Queries](https://testing-library.com/docs/queries/about/#priority) *(doc)* — Sorgu öncelik sırası ve `getByRole` önerisi.
6. [Testing Library: React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/) *(doc)* — Otomatik temizlik ve Vitest için `globals` ya da elle `cleanup`.
7. [Simon Willison: Your job is to deliver code you have proven to work](https://simonwillison.net/2025/Dec/18/code-proven-to-work) *(article)* — Elle test, geri alınca kırılan otomatik test ve ajanlardan kanıt isteme (18 Aralık 2025).
8. [Playwright: Best Practices](https://playwright.dev/docs/best-practices) *(doc)* — Kullanıcı davranışını test etme, locator'lar, web-first assertion ve izolasyon.
9. [Playwright: Test Agents](https://playwright.dev/docs/test-agents) *(doc)* — Planner, generator ve healer ajanları ve `init-agents` kurulumu.
10. [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) *(article)* — Küçük başlama, üç notlandırıcı türü, kayıt okuma ve `pass^k` (9 Ocak 2026).
11. [Anthropic: Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) *(doc)* — Ölçülebilir kriterler, kenar durumlar, notlandırma yöntemleri ve LLM notlandırıcı ipuçları.
12. [Hamel Husain: Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) *(article)* — Hızlı assertion'lar, kayıtları okuma ve modelle notlandırıcıyı insan etiketiyle hizalama (29 Mart 2024).
13. [Addy Osmani: The 80% Problem in Agentic Coding](https://addyosmani.com/blog/the-80-problem-in-agentic-coding/) *(article)* — AI kodunda sık hata kalıpları ve doğrulama önerileri (28 Ocak 2026).
14. [Veracode: Spring 2026 GenAI Code Security Update](https://www.veracode.com/blog/spring-2026-genai-code-security) *(research)* — AI kodunda güvenlik başarı oranları, dil ve zafiyet türüne göre (24 Mart 2026).
