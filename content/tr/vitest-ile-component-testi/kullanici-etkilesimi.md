---
title: "Kullanıcı Etkileşimi"
description: "userEvent, arama kutusu ve kupon formu."
lastVerified: "2026-10-14"
translationKey: "vitest-ile-component-testi/kullanici-etkilesimi"
---

## userEvent kullanın

Kullanıcı hareketlerini simüle etmek için iki araç vardır.

| Araç | Ne yapar | Ne zaman kullanılır |
| --- | --- | --- |
| `fireEvent` | Tek bir DOM olayı gönderir.[^1] | Nadiren. `userEvent` desteklemeyen olaylar için.[^1] |
| `userEvent` | Gerçek kullanıcının olay zincirini simüle eder. Eleman görünür ve etkileşilebilir mi diye kontrol eder.[^1] | **Varsayılan tercih.** |

## userEvent kurulumu

Her testte `userEvent.setup()` çağırın. Bu çağrıyı `render` çağrısından **önce** yapın.[^1] Dönen `user` nesnesini kullanın:[^2]

```tsx
const user = userEvent.setup();
render(<CouponForm onApply={vi.fn()} />);

await user.click(screen.getByRole("button", { name: "Uygula" }));
```

Tüm `user.*` metotları Promise döndürür. Her çağrıya `await` yazın.[^3]

## En sık kullanılan metotlar

| Metot | Ne yapar |
| --- | --- |
| `user.click(el)` | Elemana tıklar. Checkbox ve radio için de kullanılır.[^3] |
| `user.type(el, "metin")` | Elemana tıklar ve karakter karakter yazar.[^4] |
| `user.clear(el)` | Alanın içeriğini siler.[^4] |
| `user.selectOptions(el, "değer")` | `<select>` içinden seçenek seçer.[^4] |
| `user.tab()` | Odağı sonraki elemana taşır.[^3] |
| `user.keyboard("{Enter}")` | Odaktaki elemana klavye tuşu gönderir.[^5] |

<details>
<summary>Diğer metotlar</summary>

- `user.dblClick(el)`: çift tıklama. `user.hover(el)` ve `user.unhover(el)`: işaretçiyi elemanın üzerine getirir veya çeker.[^3]
- `user.upload(el, file)`: dosya yükler.[^4] `user.paste("metin")`: odaktaki elemana metin yapıştırır.[^6]
- `user.type` mevcut metni silmez. Yeni karakterleri sona ekler. Dolu bir alanı değiştirmek için önce `user.clear` çağırın.[^4]

</details>

## Arama kutusu testi

Kullanıcı arama kutusuna yazdığında liste filtrelenir. Alanı temizleyince tüm ürünler geri gelir:

```tsx
test("aramaya göre ürünleri filtreler", async () => {
  const user = userEvent.setup();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={vi.fn()}
    />,
  );

  const search = await screen.findByLabelText("Ürün ara");
  await user.type(search, "klavye");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.queryByRole("heading", { name: "Oyuncu Faresi" }),
  ).not.toBeInTheDocument();

  await user.clear(search);

  expect(screen.getAllByRole("article")).toHaveLength(3);
});
```

## Klavye erişimi testi

Kullanıcıların bir bölümü fare kullanmaz.[^7] Aynı işlemi klavye ile yapın. İlk `Tab` arama kutusuna, ikinci `Tab` ilk ürünün butonuna gider:[^3]

```tsx
test("klavye ile ürünü sepete ekler", async () => {
  const user = userEvent.setup();
  const onAddToCart = vi.fn();
  render(
    <ProductList
      loadProducts={() => Promise.resolve(products)}
      onAddToCart={onAddToCart}
    />,
  );

  await screen.findAllByRole("article");
  await user.tab();
  await user.tab();
  await user.keyboard("{Enter}");

  expect(onAddToCart).toHaveBeenCalledWith(products[0]);
});
```

## Form testi: kupon kodu

Sepet sayfasında kullanıcı bir kupon kodu girer. Boş kod hata verir. Kod, baştaki ve sondaki boşluklar silinerek gönderilir.

```tsx
import { useState, type FormEvent } from "react";

type CouponFormProps = {
  onApply: (code: string) => void;
};

export function CouponForm({ onApply }: CouponFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError("Kupon kodu zorunludur.");
      return;
    }

    setError(null);
    onApply(trimmedCode);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="coupon">Kupon kodu</label>
      <input
        id="coupon"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "coupon-error" : undefined}
      />
      {error ? (
        <p id="coupon-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Uygula</button>
    </form>
  );
}
```

Başarılı gönderimi tıklama ve `Enter` ile test edin:

```tsx
test("kullanıcı kodu yazıp gönderir", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.type(screen.getByLabelText("Kupon kodu"), "YAZ2026");
  await user.click(screen.getByRole("button", { name: "Uygula" }));

  expect(onApply).toHaveBeenCalledWith("YAZ2026");
});

test("Enter tuşu formu gönderir", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.type(screen.getByLabelText("Kupon kodu"), "YAZ2026{Enter}");

  expect(onApply).toHaveBeenCalledWith("YAZ2026");
});
```

> [!TIP]
>
> Bir metin alanında `Enter`, formdaki ilk gönder butonuna tıklar. Bu buton devre dışıysa form gönderilmez. Formda gönder butonu yoksa `Enter` yalnızca formda tek bir metin alanı varsa gönderir. Bu davranış HTML standardında tanımlıdır.[^8]

Hata durumunu ve hatanın kaybolmasını test edin:

```tsx
test("boş kod için hata gösterir ve göndermez", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<CouponForm onApply={onApply} />);

  await user.click(screen.getByRole("button", { name: "Uygula" }));

  expect(screen.getByRole("alert")).toHaveTextContent("Kupon kodu zorunludur.");
  expect(screen.getByLabelText("Kupon kodu")).toBeInvalid();
  expect(onApply).not.toHaveBeenCalled();
});

test("geçerli kod girilince hata kaybolur", async () => {
  const user = userEvent.setup();
  render(<CouponForm onApply={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "Uygula" }));
  await user.type(screen.getByLabelText("Kupon kodu"), "YAZ2026");
  await user.click(screen.getByRole("button", { name: "Uygula" }));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

`toBeInvalid()`, `aria-invalid="true"` olan veya `checkValidity()` sonucu `false` olan elemanı geçersiz sayar. Bu alanda `required` gibi bir kısıt olmadığı için `checkValidity()` `true` döner, test `aria-invalid` sayesinde geçer.[^9]

## Sonucu kontrol edin

Kullanıcının gördüğü sonucu kontrol edin.[^10]

> [!DO]
>
> - `expect(screen.getByRole("alert")).toHaveTextContent(...)`[^9]
> - `expect(input).toHaveValue("abc")`[^9]
> - `expect(button).toBeDisabled()`[^9]

> [!DONT]
>
> - Component'in iç state değerini okumak.[^10]
> - `isDisabled` gibi iç değişkenlere bakmak.[^10]

## Kendin dene

`CouponForm` boşlukları siler. Bunu test edin:

- Kullanıcı `"  YAZ2026  "` yazar ve gönderir.
- `onApply` fonksiyonu `"YAZ2026"` ile çağrılır.

[^1]: [user-event: Introduction](https://testing-library.com/docs/user-event/intro) · Doküman — `fireEvent` ile farkı, `userEvent.setup()` ve `render` sırası.
[^2]: [user-event: Setup](https://testing-library.com/docs/user-event/setup) · Doküman — `setup()` ile oluşturulan örnek ve doğrudan API'lerle farkı.
[^3]: [user-event: Convenience APIs](https://testing-library.com/docs/user-event/convenience) · Doküman · Resmi — `click`, `dblClick`, `hover`, `unhover` ve `tab`.
[^4]: [user-event: Utility APIs](https://testing-library.com/docs/user-event/utility) · Doküman — `type`, `clear`, `selectOptions` ve `upload`.
[^5]: [user-event: Keyboard](https://testing-library.com/docs/user-event/keyboard) · Doküman — `keyboard` ve tuş sözdizimi.
[^6]: [user-event: Clipboard](https://testing-library.com/docs/user-event/clipboard) · Doküman — `paste`.
[^7]: [W3C: Understanding SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html) · Doküman — Tüm işlevlerin klavyeyle yapılabilmesi ve bunun kimlere fayda sağladığı.
[^8]: [HTML Standard: Implicit submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission) · Doküman — `Enter` ile örtük form gönderimi kuralları.
[^9]: [jest-dom](https://github.com/testing-library/jest-dom) · Repo — `toBeInvalid`, `toHaveTextContent`, `toHaveValue` ve `toBeDisabled`.
[^10]: [Kent C. Dodds: Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) · Makale — Kullanıcının görmediği iç state'i test etmenin sorunları.
