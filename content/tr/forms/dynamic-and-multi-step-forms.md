---
title: "Dinamik alanlar ve çok adımlı formlar"
description: "useFieldArray, Controller ve adım adım doğrulama."
lastVerified: "2026-10-22"
translationKey: "forms/dynamic-and-multi-step-forms"
---

## useFieldArray

Bir satıcı başvurusunda "örnek ürünler" listesi düşünün: kullanıcı satır ekler, siler; her satırın adı ve fiyatı var. Şemada bu bir nesne dizisidir:[^1]

```ts
const productSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı en az 2 karakter olmalı."),
  price: z
    .string()
    .trim()
    .min(1, "Fiyat girin.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Fiyatı 249,90 biçiminde girin."),
});

const storeSchema = z.object({
  storeName: z.string().trim().min(2, "Mağaza adı en az 2 karakter olmalı."),
  products: z
    .array(productSchema)
    .min(1, "En az bir ürün ekleyin.")
    .max(3, "En fazla 3 ürün ekleyebilirsiniz."),
});
```

[!react-hook-form]'da `useFieldArray` diziyi yönetir. `fields` satırları, `append` ve `remove` ekleme ve silmeyi verir:[^2]

```tsx
const { register, control } = useForm({
  resolver: zodResolver(storeSchema),
  defaultValues: { storeName: "", products: [{ name: "", price: "" }] },
});
const { fields, append, remove } = useFieldArray({ control, name: "products" });

return (
  <fieldset>
    <legend>Örnek ürünler</legend>
    {fields.map((field, index) => (
      <div key={field.id}>
        <label htmlFor={`products-${index}-name`}>Ürün {index + 1} adı</label>
        <input id={`products-${index}-name`} {...register(`products.${index}.name`)} />

        <label htmlFor={`products-${index}-price`}>Ürün {index + 1} fiyatı (₺)</label>
        <input
          id={`products-${index}-price`}
          inputMode="decimal"
          {...register(`products.${index}.price`)}
        />

        <button
          type="button"
          onClick={() => remove(index)}
          disabled={fields.length === 1}
          aria-label={`Ürün ${index + 1} kaldır`}
        >
          Kaldır
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => append({ name: "", price: "" })}
      disabled={fields.length >= 3}
    >
      Ürün ekle
    </button>
  </fieldset>
);
```

Dokümanın kuralları:[^2]

- **`key={field.id}`, `index` değil.** RHF her satıra benzersiz bir `id` verir. `index` anahtar olursa ortadan bir satır silindiğinde React input'ları karıştırır. v8'de bu alanın adı `field.key` oluyor.
- **`append` tam nesne ister.** `append({ name: "" })` gibi eksik veri vermeyin; satırın tüm alanlarını varsayılan değerleriyle verin.
- **Aynı olayda işlem yığmayın.** Bir tıklamada hem `append` hem `remove` çağırmayın.
- **Butonların `type="button"`'ı unutulmasın.** Formun içindeki her `<button>` varsayılan olarak gönderir.

`append` yeni satırın ilk alanına odaklanır. Klavye ve ekran okuyucu kullanıcısı için doğrudur; istemezseniz `append(value, { shouldFocus: false })`.[^2] Silme butonundaki `aria-label` her satırın butonunu ayırt eder; yalnızca "Kaldır" yazan beş buton ekran okuyucuda aynı duyulur.

## Dizinin kendi hatası

`min(1)` ve `max(3)` tek bir satırın değil dizinin hatasıdır. Resolver bu hatayı satır hatalarıyla çakışmasın diye `errors.products.root`'a yazar. Dizi tamamen boşsa satır adı olmadığından hata doğrudan `errors.products.message`'a düşer. İkisini birlikte okuyun:[^2][^3]

```tsx
const { errors } = useFormState({ control, name: "products" });
const listError = errors.products?.root?.message ?? errors.products?.message;

{listError && <p role="alert">{listError}</p>}
```

Yukarıdaki form son satırın silinmesini ve dördüncü satırı engellediği için bu mesajlar normal kullanımda görünmez. Yine de şemadaki sınır sunucuyu korur.

## Controller: Controlled bileşenler

`register` DOM input'ları içindir. Kendi `value` ve `onChange` prop'larını isteyen bir bileşen *(tarih seçici, yıldız puanı, bir UI kütüphanesinin select'i)* için `Controller` kullanılır. `render` fonksiyonuna `field` *(value, onChange, onBlur, name, ref)* ve `fieldState` *(error, invalid)* gelir:[^4]

```tsx
<Controller
  control={control}
  name="rating"
  render={({ field, fieldState }) => (
    <StarRating
      ref={field.ref}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      aria-invalid={fieldState.invalid}
    />
  )}
/>
```

Üç ayrıntı:[^4]

- `onBlur`'u bağlayın; yoksa `onTouched` ve `onBlur` modları bu alanda çalışmaz.
- `ref`'i bileşenin odaklanabilen öğesine verin; yoksa ilk hatalı alana odaklanma bu alanı atlar.
- Başlangıç değeri `undefined` olmasın. `onChange(undefined)` da çağırmayın; boş değer için `null` ya da `""` kullanın.

Bir alanın değerini yalnızca dışarıdan güncellemek istiyorsanız `Controller` gerekmez; `useForm`'un `values` seçeneği yeterlidir.[^4]

## FormProvider ile bölmek

Uzun bir formu component'lere bölünce `register`'ı ve `control`'ü prop olarak geçmek yorar. `FormProvider` form nesnesini Context'e koyar; alt component'ler `useFormContext` ile alır:[^5]

```tsx
// application-form.tsx
const form = useForm({ resolver: zodResolver(applicationSchema), defaultValues });

return (
  <FormProvider {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <StoreStep />
    </form>
  </FormProvider>
);
```

```tsx
// store-step.tsx
export function StoreStep() {
  const { register, control } = useFormContext<ApplicationInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  // ...
}
```

Context, form durumu değişince altındaki ağacı render eder. Hata göstermek gibi alana özel durumları `useFormState({ name })` ile okuyun; yalnızca o alan değişince render olur. [Hata gösterimi ve erişilebilirlik](/academy/forms/errors-and-accessibility) dersindeki `Field` component'i bu yüzden `useFormState` kullanır.[^5][^6]

## Çok adımlı form

Mağaza, iletişim ve ödeme bilgileri üç adımda istensin. İki yaklaşım var:

| | Tek form, adımlar | Adım başına form |
| :-- | :-- | :-- |
| Yapı | Bir `useForm`, adım yalnızca neyin görüneceğini seçer | Her adım ayrı `useForm`, veri bir store'da toplanır |
| Geri dönme | Değerler formda durur | Store'dan geri yüklenir |
| Ne zaman | Adımlar aynı sayfada, veri birlikte gönderilecek | Adımlar ayrı URL'lerde, ara kayıt gerekiyor |

React Hook Form dokümanı ayrı sayfalı akışlar için ikinci yolu bir state kütüphanesiyle gösterir.[^7] Aynı sayfadaki bir sihirbaz için tek form daha basittir; bu derste o anlatılıyor.

**Adımların alanları.** Hangi alanın hangi adımda olduğunu şemanın yanında tutun:

```ts
export const steps = [
  { title: "Mağaza", fields: ["storeName", "taxNumber", "category", "products"] },
  { title: "İletişim", fields: ["contactName", "email", "phone"] },
  { title: "Ödeme", fields: ["iban", "acceptTerms"] },
] as const satisfies { title: string; fields: ApplicationField[] }[];
```

**İleri.** `trigger` yalnızca verilen alanları doğrular ve sonucu döndürür. `shouldFocus: true` ilk hatalı alana odaklanır:[^8]

```tsx
const [step, setStep] = useState(0);

async function goNext() {
  const valid = await form.trigger([...steps[step].fields], { shouldFocus: true });
  if (valid) setStep((s) => s + 1);
}
```

`trigger("products")` dizinin tüm satırlarını da doğrular.

**Geri.** Doğrulama gerekmez: `setStep((s) => s - 1)`. Ekrandan kalkan adımın değerleri kaybolmaz; RHF varsayılan olarak unmount olan alanın değerini saklar *(`shouldUnregister: false`)*.[^9]

**Gönder.** Son adımda `handleSubmit` tüm şemayı doğrular. Sunucu önceki bir adımdaki alan için hata döndürürse o adıma geri gidin; nasıl yapılacağı [Server Actions ile form](/academy/forms/forms-with-server-actions) dersinde.

**Adım göstergesi.** Mevcut adımı `aria-current="step"` ile işaretleyin ve her adımın başlığını bir `<h2>` yapın. Ekran okuyucu kullanıcısı nerede olduğunu duyar.

```tsx
<ol aria-label="Adımlar">
  {steps.map((s, index) => (
    <li key={s.title} aria-current={index === step ? "step" : undefined}>
      {index + 1}. {s.title}
    </li>
  ))}
</ol>
<h2>{steps[step].title}</h2>
```

## Next.js'te Suspense notu

[!nextjs] 16'da `cacheComponents` açıkken sayfalar build sırasında önceden render edilir. `useFieldArray` satır `id`'lerini `crypto.randomUUID()` ile üretir. Next.js, rastgele değer üreten bir Client Component'i önceden render etmeyi reddeder ve build hatası verir: her ziyaretçiye aynı `id` gitmesin diye. Çözüm formu `<Suspense>` ile sarıp istek anında render etmektir:[^10]

```tsx
// app/page.tsx
export default function Page() {
  return (
    <main>
      <h1>Satıcı başvurusu</h1>
      <Suspense fallback={<p>Form yükleniyor...</p>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
```

## Kendin dene

- `key={field.id}`'yi `key={index}` yapın. Üç satıra farklı adlar yazıp ortadakini silin. Ne oluyor?
- `append({ name: "" })` yazın. TypeScript ne diyor?
- `StoreStep`'i `FormProvider` olmadan, `register` ve `control`'ü prop geçerek yazın.
- `goNext`'teki `shouldFocus`'u silip boş formla "İleri"ye basın. Odak nerede?
- İkinci adıma geçin, geri dönün. Ürün satırları ve değerleri duruyor mu? `useForm({ shouldUnregister: true })` ile tekrar deneyin.

## Detaylı öğrenmek için

- **Resmi doküman:** "useFieldArray"; tüm işlemler, kurallar ve örnekler.[^2]
- **Resmi doküman:** "Controller"; controlled bileşenleri bağlamak.[^4]
- **Resmi doküman:** "Advanced Usage"; sihirbaz formlar ve FormProvider performansı.[^7]

## Kaynaklar

1. [Zod: Arrays](https://zod.dev/api#arrays) *(doc)* — Nesne dizisi, `min` ve `max`.
2. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `fields`, `append`, `remove`, `field.id`, odak seçenekleri, kurallar ve `root` hatası.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — Resolver hatalarının forma yerleştirilmesi.
4. [React Hook Form: Controller](https://react-hook-form.com/docs/usecontroller/controller) *(doc)* — `render`, `field`, `fieldState`, `onBlur`, `ref` ve `undefined` kuralı.
5. [React Hook Form: FormProvider](https://react-hook-form.com/docs/formprovider) *(doc)* — Form nesnesini Context'le paylaşmak.
6. [React Hook Form: useFormState](https://react-hook-form.com/docs/useformstate) *(doc)* — Belirli bir alanın durumuna abone olmak.
7. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#WizardFormFunnel) *(doc)* — Sihirbaz form ve FormProvider performansı.
8. [React Hook Form: trigger](https://react-hook-form.com/docs/useform/trigger) *(doc)* — Seçili alanları doğrulamak ve `shouldFocus`.
9. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#shouldUnregister) *(doc)* — `shouldUnregister` ve unmount olan alanların değeri.
10. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching#random-values-and-timestamps) *(doc)* — `crypto.randomUUID()` gibi rastgele değerlerin önceden render'da açıkça ele alınması ve Suspense ile istek anına bırakılması.
