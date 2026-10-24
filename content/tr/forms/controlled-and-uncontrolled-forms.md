---
title: "Controlled ve uncontrolled formlar"
description: "Değeri kimin tuttuğu, FormData ve yaygın hatalar."
lastVerified: "2026-10-22"
translationKey: "forms/controlled-and-uncontrolled-forms"
---

## Değeri Kim Tutuyor?

Bir `<input>`'a yazılan metin bir yerde saklanır. Bu derste iki seçenek var:[^1][^2]

| | Uncontrolled | Controlled |
| :-- | :-- | :-- |
| Değeri tutan | DOM *(tarayıcı)* | React state'i |
| Başlangıç değeri | `defaultValue` / `defaultChecked` | `value` / `checked` |
| Değeri okumak | Gönderirken `FormData` ile | Her an state'ten |
| Her tuşta render | Yok | State'in sahibi component render olur |

[Josh W. Comeau](https://www.joshwcomeau.com/) farkı şöyle özetler: React varsayılan olarak form alanına karışmaz; alan **uncontrolled**'dır. `value` verdiğiniz anda React değeri yönetmeye başlar ve alan **controlled** olur.[^2]

## Uncontrolled: DOM'a Bırakmak

En basit form state tutmaz. Değerler gönderim anında `FormData` ile okunur. Her alanın bir `name`'i olmalı; `FormData` alanları adıyla toplar:[^3][^4]

```tsx
export function NewsletterForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    subscribe(email);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email">E-posta</label>
      <input id="email" name="email" type="email" defaultValue="" />
      <button>Abone ol</button>
    </form>
  );
}
```

`FormData.get` her zaman `string`, `File` ya da `null` döndürür. Sayı beklediğiniz alan da metin gelir; dönüştürmek ve doğrulamak sizin işinizdir.[^4] Bu yüzden sunucuya giden her formda bir şema kullanacaksınız *(bkz. [Zod ile şema ve doğrulama](/academy/forms/zod-schema-and-validation))*.

[!react] 19'da `action` prop'una fonksiyon da verebilirsiniz. Fonksiyon `FormData`'yı doğrudan alır; `preventDefault` gerekmez:[^3]

```tsx
<form action={(formData) => subscribe(String(formData.get("email") ?? ""))}>
```

`action` ile gönderilen form, işlem başarıyla bitince uncontrolled alanları **sıfırlar**. Tarayıcının kendi davranışı da budur. Hata durumunda kullanıcının yazdıklarını korumak için ne yapacağınız [Server Actions ile form](/academy/forms/forms-with-server-actions) dersinde.[^5]

## Controlled: State'e Bağlamak

Alanın değeri state'ten gelir; her tuşta `onChange` state'i günceller ve React alanı yeni değerle çizer:[^1]

```tsx
export function SearchBox() {
  const [query, setQuery] = useState("");

  return (
    <>
      <label htmlFor="search">Ara</label>
      <input id="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p>{query.length} karakter</p>
    </>
  );
}
```

Değer her an elinizde olduğu için yazarken arayüzü değiştirmek kolaydır: karakter sayacı, canlı filtre, bir alana göre başka alanı açmak. Bedeli, state'in sahibi component'in **her tuşta** yeniden render olmasıdır. Küçük bir formda fark edilmez; onlarca alanlı ve ağır component'li bir formda yazarken takılma hissedilir.

## Yaygın Hatalar

React dokümanı controlled alanlarla ilgili üç uyarıyı ayrıca anlatır:[^1]

- **`value` var, `onChange` yok.** Alan salt okunur olur, kullanıcı yazamaz. React konsolda uyarır. Gerçekten salt okunursa `readOnly` verin; değilse `onChange` ekleyin ya da `defaultValue`'ya geçin.
- **`value={undefined}` ile başlamak.** Başlangıçta `undefined` olan alan uncontrolled sayılır; sonra bir değer gelince controlled olur ve React "uncontrolled'dan controlled'a geçiş" uyarısı verir. Metin alanlarını `""` ile başlatın; `null` da vermeyin.
- **Checkbox'ta `value`.** Checkbox ve radio için durum `checked` ile kontrol edilir; `value` gönderilen değerdir.

Josh W. Comeau select için de aynı kuralı hatırlatır: başlangıç değeri seçeneklerden biriyle eşleşmelidir.[^2]

> [!WARNING]
>
> Aynı alanda `value` ve `defaultValue`'yu birlikte kullanmayın. Alan ya controlled ya uncontrolled olmalı; ömrü boyunca değişmemeli.[^1]

## Tarayıcının Doğrulaması

`required`, `type="email"`, `minLength` ve `pattern` tarayıcıya ücretsiz doğrulama verir. Ama mesajlar tarayıcıya göre değişir, tasarıma uymaz ve ekran okuyucularla iyi çalışmaz. [Adrian Roselli](https://adrianroselli.com/) testlerinde alanın odak alır almaz "geçersiz" okunduğunu, desenin hiç açıklanmadığını ve alan düzelince bunun duyurulmadığını gösterir. Önerisi kendi doğrulamanızı yazmaktır.[^6] GOV.UK Design System da `novalidate` ile tarayıcı doğrulamasını kapatıp kendi hata mesajlarını göstermeyi önerir.[^7]

```html
<form novalidate>
```

`novalidate` yalnızca tarayıcının balonlarını kapatır. `type="email"` mobil klavyeyi değiştirmeye, `autocomplete` otomatik doldurmaya devam eder. Hata mesajlarını nasıl göstereceğiniz [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility) dersinde.

## Form Kütüphanesi Neden?

İki alanlı bir formu iki yaklaşımla da elle yazabilirsiniz. Gerçek formlarda şunlar birikir: her alan için hata state'i, "alana dokunuldu mu", gönderiliyor mu, ilk değerden değişti mi, ilk hatalı alana odaklanmak, sunucudan gelen hatayı alana yazmak.

[!react-hook-form] uncontrolled yaklaşımı temel alır: alanlara `ref` ile bağlanır, değeri DOM'dan okur ve yalnızca gereken component'i render eder.[^8] Kendi bileşeni `value`/`onChange` isteyen bir tarih seçici gibi controlled alanlar için de `Controller` sunar *(bkz. [Dinamik alanlar ve çok adımlı formlar](/academy/forms/dynamic-and-multi-step-forms))*.

## Ne Zaman Hangisi

| Durum | Öneri |
| :-- | :-- |
| Bir iki alanlı, yalnızca gönderilen form *(arama, bülten)* | Uncontrolled + `FormData` |
| Yazarken arayüzü değiştiren tek alan *(canlı filtre, sayaç)* | Controlled |
| Doğrulamalı, çok alanlı form | [!react-hook-form] |
| `value`/`onChange` isteyen üçüncü parti bileşen | React Hook Form'da `Controller` |
| JavaScript yüklenmeden de çalışması gereken form | Uncontrolled + `action` *(Server Action)* |

## Kendin Dene

- Bülten formunu uncontrolled yazın, `console.log(Object.fromEntries(formData))` ile gelen nesneye bakın. Yaş alanı ekleyin; tipi ne?
- Arama kutusunu `useState("")` yerine `useState<string>()` ile başlatın ve bir şey yazın. Konsolda ne çıkıyor?
- `value` verip `onChange`'i silin. Alana yazabiliyor musunuz?
- Formu `novalidate` olmadan, `required` ve `type="email"` ile gönderin. Sonra bir ekran okuyucuyla *(VoiceOver, NVDA)* deneyin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** React, "`<input>`"; controlled alan, `defaultValue` ve sık yapılan hatalar.[^1]
- **Yazı:** [Josh W. Comeau](https://www.joshwcomeau.com/), "Data Binding in React"; text, checkbox, radio ve select ile bağlama.[^2]
- **Yazı:** [Adrian Roselli](https://adrianroselli.com/), "Avoid Default Field Validation"; tarayıcı doğrulamasının erişilebilirlik sorunları.[^6]

## Kaynaklar

1. [React: `<input>`](https://react.dev/reference/react-dom/components/input) *(doc)* — Controlled ve uncontrolled alan, `value` ve `defaultValue`, `onChange` olmadan `value` ve `undefined` uyarıları.
2. [Josh W. Comeau](https://www.joshwcomeau.com/): [Data Binding in React](https://www.joshwcomeau.com/react/data-binding/) *(article)* — 9 Ocak 2023, güncelleme Aralık 2025. Controlled alan, iki yönlü bağlama ve select başlangıç değeri.
3. [React: `<form>`](https://react.dev/reference/react-dom/components/form) *(doc)* — `action` prop'una fonksiyon vermek ve `FormData`.
4. [MDN: FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData) *(doc)* — Form alanlarını adıyla okumak ve `get`'in dönüş tipi.
5. [React: Issue #29034](https://github.com/react/react/issues/29034) *(repo)* — Form action sonrası otomatik sıfırlama, tarayıcı davranışıyla uyumu ve önerilen çözümler.
6. [Adrian Roselli](https://adrianroselli.com/): [Avoid Default Field Validation](https://adrianroselli.com/2019/02/avoid-default-field-validation.html) *(article)* — Şubat 2019, güncelleme Ağustos 2023. Tarayıcı doğrulamasının ekran okuyucudaki sorunları.
7. [GOV.UK Design System: Validation](https://design-system.service.gov.uk/patterns/validation/) *(doc)* — `novalidate`, sunucuda doğrulama ve hata mesajı yerleşimi.
8. [React Hook Form: Get Started](https://react-hook-form.com/get-started) *(doc)* — Uncontrolled alanlarla kayıt ve izole render tasarımı.
