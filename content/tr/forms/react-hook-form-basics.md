---
title: "React Hook Form temelleri"
description: "useForm ve defaultValues, register ve yerleşik kurallar, handleSubmit, formState ve Proxy kuralı, doğrulama modları, değer okuma yolları ve React Compiler notu."
lastVerified: "2026-10-22"
translationKey: "forms/react-hook-form-basics"
---

## Kurulum ve İlk Form

[!react-hook-form] *(RHF)* bu dersin yazıldığı tarihte 7.90 sürümündedir. v8 beta aşamasında; derste fark eden yerler not edildi.[^1]

```command
npm install react-hook-form
```

İletişim formu üç alandan oluşsun. `useForm` formu kurar, `register` alanı forma bağlar, `handleSubmit` gönderimi yönetir:[^1][^2]

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";

type ContactForm = { name: string; email: string; message: string };

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    defaultValues: { name: "", email: "", message: "" },
  });

  const onSubmit: SubmitHandler<ContactForm> = async (data) => {
    await sendMessage(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Ad</label>
      <input id="name" {...register("name", { required: "Ad zorunlu." })} />
      {errors.name && <p>{errors.name.message}</p>}

      <label htmlFor="email">E-posta</label>
      <input
        id="email"
        type="email"
        {...register("email", {
          required: "E-posta zorunlu.",
          pattern: { value: /^\S+@\S+\.\S+$/, message: "E-posta adresini ad@ornek.com biçiminde girin." },
        })}
      />
      {errors.email && <p>{errors.email.message}</p>}

      <label htmlFor="message">Mesaj</label>
      <textarea
        id="message"
        {...register("message", { minLength: { value: 10, message: "En az 10 karakter." } })}
      />
      {errors.message && <p>{errors.message.message}</p>}

      <button disabled={isSubmitting}>{isSubmitting ? "Gönderiliyor..." : "Gönder"}</button>
    </form>
  );
}
```

Bu derste kurallar `register`'a yazıldı. Gerçek projelerde kuralları bir Zod şemasına taşıyacaksınız *(bkz. [React Hook Form ile Zod](/academy/forms/react-hook-form-with-zod))*. Hata mesajlarını alana erişilebilir şekilde bağlamak [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility) dersinde.

## defaultValues

`defaultValues` formun ilk hâlidir. Doküman her alan için vermeyi önerir: `undefined` ile başlayan alan controlled bileşenlerde uyarıya yol açar, `isDirty` *(form değişti mi)* de bu değerle karşılaştırılarak hesaplanır.[^3]

İlk değerler sunucudan geliyorsa iki yol var:[^3]

- **`defaultValues: async () => ...`**: Form açılışta bir kez yüklenir. Yüklenirken `formState.isLoading` `true` olur.
- **`values` prop'u**: Değer değiştikçe form güncellenir. [!tanstack-query] ile çekilen veri için uygundur.

```tsx
const { data: profile } = useQuery(profileQueries.detail());

const form = useForm<ProfileForm>({
  defaultValues: { name: "", city: "" },
  values: profile, // veri gelince ve değişince form güncellenir
});
```

## register

`register("name")` bir nesne döndürür: `name`, `ref`, `onChange` ve `onBlur`. Spread ile input'a verirsiniz. RHF değeri DOM'dan okur; input uncontrolled kalır ve yazarken form component'i render olmaz.[^4]

Alan adı nokta içerebilir. `register("address.city")` değeri `{ address: { city } }` olarak, `register("tags.0")` dizi olarak toplar.[^4]

**Yerleşik kurallar:** `required`, `min`, `max`, `minLength`, `maxLength`, `pattern` ve özel `validate`. Her biri doğrudan mesaj ya da `{ value, message }` alır. `validate` bir fonksiyondur ve geçerliyse `true`, değilse mesaj döndürür:[^4]

```tsx
<input
  {...register("username", {
    validate: async (value) => (await isUsernameFree(value)) || "Bu kullanıcı adı alınmış.",
  })}
/>
```

**Değer dönüşümü:** Input her zaman metin verir. `valueAsNumber: true` değeri sayıya, `valueAsDate: true` tarihe çevirir; boş alan `NaN` olur. `setValueAs` metni kendi fonksiyonunuzdan geçirir. Dönüşüm doğrulamadan **önce** çalışır ve `defaultValues`'a uygulanmaz.[^4]

```tsx
<input type="number" {...register("age", { valueAsNumber: true })} />
```

## handleSubmit

`handleSubmit(onValid, onInvalid?)` önce formu doğrular. Hata yoksa `onValid(data)` çalışır; varsa hatalar `formState.errors`'a yazılır ve ilk hatalı alana odaklanılır.[^5][^3]

İki ayrıntı:[^5]

- `onValid` bir Promise döndürürse `isSubmitting`, Promise bitene kadar `true` kalır. `await`'i unutmayın.
- `handleSubmit`, `onValid` içindeki hatayı yutmaz. İsteği `try/catch` ile sarın ve sunucu hatasını `setError` ile forma yazın.

```tsx
const onSubmit: SubmitHandler<ContactForm> = async (data) => {
  try {
    await sendMessage(data);
  } catch {
    setError("root.server", { message: "Mesaj gönderilemedi. Tekrar deneyin." });
  }
};
```

`root` ile başlayan hatalar bir alana ait değildir; formun genel hatasıdır ve bir sonraki gönderimde silinir.[^6]

## formState ve Proxy Kuralı

`formState` formun durumunu verir:[^7]

| Alan | Anlamı |
| :-- | :-- |
| `errors` | Alan hataları |
| `isSubmitting` | `onValid` çalışıyor |
| `isSubmitSuccessful` | Son gönderim hatasız bitti |
| `isDirty`, `dirtyFields` | `defaultValues`'tan farklı alanlar |
| `touchedFields` | Odaktan çıkılmış alanlar |
| `isValid` | Formda hata yok |

`formState` bir **Proxy**'dir. RHF yalnızca render sırasında okuduğunuz alanlara abone olur ve yalnızca onlar değişince render eder. Bu yüzden ihtiyacınız olan alanları render'da, koşulsuz okuyun:[^7]

```tsx
// ❌ isDirty false iken isValid hiç okunmaz; ona abone olunmaz
return <button disabled={!formState.isDirty || !formState.isValid} />;

// ✅
const { isDirty, isValid } = formState;
return <button disabled={!isDirty || !isValid} />;
```

## Doğrulama Modu

`mode` doğrulamanın ilk ne zaman çalışacağını, `reValidateMode` gönderimden sonra ne zaman tekrarlanacağını seçer:[^3]

| `mode` | İlk doğrulama |
| :-- | :-- |
| `onSubmit` *(varsayılan)* | Gönderimde |
| `onBlur` | Alandan çıkınca |
| `onChange` | Her değişiklikte |
| `onTouched` | İlk çıkışta, sonra her değişiklikte |
| `all` | Çıkışta ve her değişiklikte |

Doküman emin değilseniz `onTouched`'ı önerir: hata kullanıcı alandan çıkınca görünür, sonra yazdıkça güncellenir; ilk kez yazarken kimse azarlanmaz.[^3] Bu zamanlamanın arkasındaki UX araştırması [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility) dersinde.

## Formu Sıfırlamak

Gönderimden sonra formu temizlemek için `reset`'i `onSubmit` içinde çağırmayın. `handleSubmit` gönderim durumunu `onSubmit` bittikten **sonra** günceller; `reset` değerleri temizler ama `isSubmitSuccessful` gibi alanlar eski kalır. Doküman `isSubmitSuccessful`'u bir effect'te izlemeyi önerir:[^8]

```tsx
const { reset, formState: { isSubmitSuccessful } } = form;

useEffect(() => {
  if (isSubmitSuccessful) reset();
}, [isSubmitSuccessful, reset]);
```

## Değeri Okumak

Değer okumanın birkaç yolu var ve her biri farklı şeyi render eder:[^9]

| API | Render olan | Ne için |
| :-- | :-- | :-- |
| `watch` | `useForm`'u çağıran component | Form düzeyinde bir değer göstermek. Basit ama tüm formu render eder. |
| `useWatch` | Yalnızca çağıran component | Derindeki bir değer: canlı toplam, koşullu alan. Çoğu zaman en iyisi. |
| `subscribe` | Hiçbiri | Yan etki: otomatik kayıt, analitik. |
| `getValues` | Hiçbiri | Olay içinde son değeri okumak. Render'da kullanmayın. |

```tsx
function MessageCounter({ control }: { control: Control<ContactForm> }) {
  const message = useWatch({ control, name: "message" });
  return <span>{message.length} / 500</span>;
}
```

> [!WARNING]
>
> [React Compiler](https://react.dev/learn/react-compiler) kullanıyorsanız `watch` ve `getValues` render'da eski değer gösterebilir: ikisi her render'da aynı referansı döndürür ve compiler sonucu önbelleğe alır. Render için `useWatch`, yan etki için `subscribe` kullanın. v8 compiler desteği getiriyor.[^9][^10]

## v8'e Hazırlık

v8 hâlâ beta. Bu rehberdeki kodu etkileyen en görünür değişiklik: `useFieldArray`'deki `field.id`, v8'de `field.key` oluyor.[^10][^11] Geçiş zamanı gelince resmi migration rehberini takip edin.

## Kendin Dene

- İletişim formunu kurun ve `mode`'u sırayla `onSubmit`, `onBlur`, `onTouched` yapın. Hata mesajları ne zaman görünüyor?
- `formState.isDirty`'yi butonda kullanın; `defaultValues`'u silip tekrar deneyin.
- `MessageCounter`'ı önce `watch` ile formun içinde, sonra `useWatch` ile ayrı component'te yazın. React DevTools'ta "Highlight updates" ile hangisinin daha az render ettiğine bakın.
- `sendMessage`'ı her seferinde hata fırlatacak şekilde değiştirin ve `root.server` hatasını gösterin.

## Detaylı Öğrenmek İçin

- **Resmi doküman:** "Get Started"; kayıt, doğrulama, controlled bileşenler ve tasarım felsefesi.[^1]
- **Resmi doküman:** "useForm"; tüm seçenekler, `mode`, `values` ve async `defaultValues`.[^3]
- **Resmi doküman:** "FAQs"; değer okuma yollarının karşılaştırması ve React Compiler.[^9]

## Kaynaklar

1. [React Hook Form: Get Started](https://react-hook-form.com/get-started) *(doc)* — Kurulum, `register`, yerleşik kurallar ve hata gösterimi.
2. [React Hook Form: handleSubmit](https://react-hook-form.com/docs/useform/handlesubmit) *(doc)* — Gönderim akışı ve async `onSubmit`.
3. [React Hook Form: useForm](https://react-hook-form.com/docs/useform) *(doc)* — `defaultValues`, `values`, `mode`, `reValidateMode`, `shouldFocusError` ve `onTouched` önerisi.
4. [React Hook Form: register](https://react-hook-form.com/docs/useform/register) *(doc)* — Dönen nesne, kurallar, `valueAsNumber`, `setValueAs` ve iç içe alan adları.
5. [React Hook Form: handleSubmit](https://react-hook-form.com/docs/useform/handlesubmit#rules) *(doc)* — `isSubmitting`'in Promise'i beklemesi ve hataların yutulmaması.
6. [React Hook Form: setError](https://react-hook-form.com/docs/useform/seterror) *(doc)* — `root` ile form düzeyinde hata.
7. [React Hook Form: formState](https://react-hook-form.com/docs/useform/formstate) *(doc)* — Durum alanları ve Proxy abonelik kuralı.
8. [React Hook Form: reset](https://react-hook-form.com/docs/useform/reset) *(doc)* — `onSubmit` içinde sıfırlamamak ve `isSubmitSuccessful` ile effect.
9. [React Hook Form: FAQs](https://react-hook-form.com/faqs) *(doc)* — `watch`, `useWatch`, `subscribe` ve `getValues` karşılaştırması, React Compiler uyarısı.
10. [React Hook Form: Migrating from v7 to v8](https://react-hook-form.com/migrate-v7-to-v8) *(doc)* — React Compiler desteği ve değişen API'ler.
11. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `field.id` ve v8'deki `field.key`.
