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
| `fireEvent` | Tek bir DOM olayı gönderir. | Nadiren. `userEvent` desteklemeyen olaylar için. |
| `userEvent` | Gerçek kullanıcının olay zincirini simüle eder. Eleman görünür ve etkileşilebilir mi diye kontrol eder. | **Varsayılan tercih.** |

## userEvent kurulumu

Her testte `userEvent.setup()` çağırın. Bu çağrıyı `render` çağrısından **önce** yapın. Dönen `user` nesnesini kullanın:

```tsx
const user = userEvent.setup();
render(<CouponForm onApply={vi.fn()} />);

await user.click(screen.getByRole("button", { name: "Uygula" }));
```

Tüm `user.*` metotları Promise döndürür. Her çağrıya `await` yazın.

## En sık kullanılan metotlar

| Metot | Ne yapar |
| --- | --- |
| `user.click(el)` | Elemana tıklar. Checkbox ve radio için de kullanılır. |
| `user.type(el, "metin")` | Elemana tıklar ve karakter karakter yazar. |
| `user.clear(el)` | Alanın içeriğini siler. |
| `user.selectOptions(el, "değer")` | `<select>` içinden seçenek seçer. |
| `user.tab()` | Odağı sonraki elemana taşır. |
| `user.keyboard("{Enter}")` | Odaktaki elemana klavye tuşu gönderir. |

<details>
<summary>Diğer metotlar</summary>

<ul>
<li>`user.dblClick(el)`: çift tıklama. `user.hover(el)` ve `user.unhover(el)`: işaretçiyi elemanın üzerine getirir veya çeker.</li>
<li>`user.upload(el, file)`: dosya yükler. `user.paste("metin")`: odaktaki elemana metin yapıştırır.</li>
<li>`user.type` mevcut metni silmez. Yeni karakterleri sona ekler. Dolu bir alanı değiştirmek için önce `user.clear` çağırın.</li>
</ul>

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

Kullanıcıların bir bölümü fare kullanmaz. Aynı işlemi klavye ile yapın. İlk `Tab` arama kutusuna, ikinci `Tab` ilk ürünün butonuna gider:

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
> `Enter` ile gönderme yalnızca formda bir submit butonu varsa çalışır. Bu davranış HTML standardından gelir. Gerçek tarayıcıda da aynıdır.

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

## Sonucu kontrol edin

Kullanıcının gördüğü sonucu kontrol edin.

> [!DO]
>
> - `expect(screen.getByRole("alert")).toHaveTextContent(...)`
> - `expect(input).toHaveValue("abc")`
> - `expect(button).toBeDisabled()`

> [!DONT]
>
> - Component'in iç state değerini okumak.
> - `isDisabled` gibi iç değişkenlere bakmak.

## Kendin dene

`CouponForm` boşlukları siler. Bunu test edin:

- Kullanıcı `"  YAZ2026  "` yazar ve gönderir.
- `onApply` fonksiyonu `"YAZ2026"` ile çağrılır.

- [user-event: Giriş](https://testing-library.com/docs/user-event/intro)
- [user-event: Kurulum](https://testing-library.com/docs/user-event/setup)
