---
title: "Dynamic fields and multi-step forms"
description: "useFieldArray, Controller and validating step by step."
lastVerified: "2026-10-22"
translationKey: "forms/dynamic-and-multi-step-forms"
---

## useFieldArray

Think of a "sample products" list in a seller application: the user adds and removes rows, and each row has a name and a price. In the schema that is an array of objects:[^1]

```ts
const productSchema = z.object({
  name: z.string().trim().min(2, "The product name must be at least 2 characters."),
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter the price as 249.90."),
});

const storeSchema = z.object({
  storeName: z.string().trim().min(2, "The store name must be at least 2 characters."),
  products: z
    .array(productSchema)
    .min(1, "Add at least one product.")
    .max(3, "You can add at most 3 products."),
});
```

In [!react-hook-form], `useFieldArray` manages the array. `fields` gives you the rows, and `append` and `remove` the adding and removing:[^2]

```tsx
const { register, control } = useForm({
  resolver: zodResolver(storeSchema),
  defaultValues: { storeName: "", products: [{ name: "", price: "" }] },
});
const { fields, append, remove } = useFieldArray({ control, name: "products" });

return (
  <fieldset>
    <legend>Sample products</legend>
    {fields.map((field, index) => (
      <div key={field.id}>
        <label htmlFor={`products-${index}-name`}>Product {index + 1} name</label>
        <input id={`products-${index}-name`} {...register(`products.${index}.name`)} />

        <label htmlFor={`products-${index}-price`}>Product {index + 1} price (€)</label>
        <input
          id={`products-${index}-price`}
          inputMode="decimal"
          {...register(`products.${index}.price`)}
        />

        <button
          type="button"
          onClick={() => remove(index)}
          disabled={fields.length === 1}
          aria-label={`Remove product ${index + 1}`}
        >
          Remove
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => append({ name: "", price: "" })}
      disabled={fields.length >= 3}
    >
      Add product
    </button>
  </fieldset>
);
```

The documentation's rules:[^2]

- **`key={field.id}`, not `index`.** RHF gives every row a unique `id`. With `index` as the key, React mixes the inputs up when a row is removed from the middle. In v8 this field is called `field.key`.
- **`append` wants a complete object.** Do not pass partial data such as `append({ name: "" })`; give every field of the row with its default value.
- **Do not stack operations in one event.** Do not call both `append` and `remove` on a single click.
- **Do not forget `type="button"`.** Every `<button>` inside a form submits by default.

`append` focuses the first field of the new row. That is right for keyboard and screen reader users; if you do not want it, use `append(value, { shouldFocus: false })`.[^2] The `aria-label` on the remove button tells each row's button apart; five buttons that all say "Remove" sound identical in a screen reader.

## The array's own error

`min(1)` and `max(3)` are errors of the array, not of a single row. So that they do not clash with the row errors, the resolver writes them to `errors.products.root`. When the array is completely empty there is no row name, so the error lands directly on `errors.products.message`. Read both together:[^2][^3]

```tsx
const { errors } = useFormState({ control, name: "products" });
const listError = errors.products?.root?.message ?? errors.products?.message;

{listError && <p role="alert">{listError}</p>}
```

Because the form above stops the last row being removed and a fourth being added, these messages do not appear in normal use. The limit in the schema still protects the server.

## Controller: controlled components

`register` is for DOM inputs. For a component that wants its own `value` and `onChange` props *(a date picker, a star rating, a UI library's select)*, you use `Controller`. The `render` function receives `field` *(value, onChange, onBlur, name, ref)* and `fieldState` *(error, invalid)*:[^4]

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

Three details:[^4]

- Bind `onBlur`; without it, the `onTouched` and `onBlur` modes do not work on this field.
- Give the `ref` to the component's focusable element; without it, focusing the first invalid field skips this one.
- Do not let the initial value be `undefined`. Do not call `onChange(undefined)` either; use `null` or `""` for an empty value.

If you only want to update a field's value from outside, you do not need `Controller`; `useForm`'s `values` option is enough.[^4]

## Splitting with FormProvider

Once a long form is split into components, passing `register` and `control` as props gets tiring. `FormProvider` puts the form object into Context, and the child components take it with `useFormContext`:[^5]

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

Context renders the tree below it when the form state changes. Read field-specific state, such as showing an error, with `useFormState({ name })`; it only renders when that field changes. That is why the `Field` component in the [Showing errors and accessibility](/academy/forms/errors-and-accessibility) lesson uses `useFormState`.[^5][^6]

## A multi-step form

Say the store, contact and payment details are asked for in three steps. There are two approaches:

| | One form with steps | A form per step |
| :-- | :-- | :-- |
| Structure | One `useForm`; the step only chooses what is visible | A separate `useForm` per step, with the data gathered in a store |
| Going back | The values stay in the form | They are restored from the store |
| When | The steps are on one page and the data is submitted together | The steps are on separate URLs and an intermediate save is needed |

The React Hook Form documentation shows the second route with a state library, for flows across separate pages.[^7] For a wizard on one page, a single form is simpler; that is what this lesson covers.

**The steps' fields.** Keep which field belongs to which step next to the schema:

```ts
export const steps = [
  { title: "Store", fields: ["storeName", "taxNumber", "category", "products"] },
  { title: "Contact", fields: ["contactName", "email", "phone"] },
  { title: "Payment", fields: ["iban", "acceptTerms"] },
] as const satisfies { title: string; fields: ApplicationField[] }[];
```

**Next.** `trigger` validates only the fields given and returns the result. `shouldFocus: true` focuses the first invalid field:[^8]

```tsx
const [step, setStep] = useState(0);

async function goNext() {
  const valid = await form.trigger([...steps[step].fields], { shouldFocus: true });
  if (valid) setStep((s) => s + 1);
}
```

`trigger("products")` validates all the rows of the array too.

**Back.** No validation is needed: `setStep((s) => s - 1)`. The values of the step leaving the screen are not lost; by default RHF keeps the value of a field that unmounts *(`shouldUnregister: false`)*.[^9]

**Submit.** On the last step, `handleSubmit` validates the whole schema. If the server returns an error for a field on an earlier step, go back to that step; how to do that is in the [Forms with Server Actions](/academy/forms/forms-with-server-actions) lesson.

**The step indicator.** Mark the current step with `aria-current="step"` and make each step's title an `<h2>`. A screen reader user then hears where they are.

```tsx
<ol aria-label="Steps">
  {steps.map((s, index) => (
    <li key={s.title} aria-current={index === step ? "step" : undefined}>
      {index + 1}. {s.title}
    </li>
  ))}
</ol>
<h2>{steps[step].title}</h2>
```

## A Suspense note for Next.js

In [!nextjs] 16, with `cacheComponents` on, pages are prerendered at build time. `useFieldArray` produces its row `id`s with `crypto.randomUUID()`. Next.js refuses to prerender a Client Component that produces a random value and fails the build, so that the same `id` does not go to every visitor. The fix is to wrap the form in a `<Suspense>` and render it at request time:[^10]

```tsx
// app/page.tsx
export default function Page() {
  return (
    <main>
      <h1>Seller application</h1>
      <Suspense fallback={<p>Loading form...</p>}>
        <ApplicationForm />
      </Suspense>
    </main>
  );
}
```

## Try it yourself

- Change `key={field.id}` to `key={index}`. Type different names into three rows and remove the middle one. What happens?
- Write `append({ name: "" })`. What does TypeScript say?
- Write `StoreStep` without `FormProvider`, passing `register` and `control` as props.
- Delete the `shouldFocus` in `goNext` and press "Next" with an empty form. Where is the focus?
- Move to the second step and come back. Are the product rows and their values still there? Try again with `useForm({ shouldUnregister: true })`.

## Going deeper

- **Official docs:** "useFieldArray"; all the operations, the rules and the examples.[^2]
- **Official docs:** "Controller"; binding controlled components.[^4]
- **Official docs:** "Advanced Usage"; wizard forms and FormProvider performance.[^7]

## Sources

1. [Zod: Arrays](https://zod.dev/api#arrays) *(doc)* — An array of objects, `min` and `max`.
2. [React Hook Form: useFieldArray](https://react-hook-form.com/docs/usefieldarray) *(doc)* — `fields`, `append`, `remove`, `field.id`, the focus options, the rules and the `root` error.
3. [React Hook Form: Resolvers](https://github.com/react-hook-form/resolvers) *(repo)* — How resolver errors are placed into the form.
4. [React Hook Form: Controller](https://react-hook-form.com/docs/usecontroller/controller) *(doc)* — `render`, `field`, `fieldState`, `onBlur`, `ref` and the `undefined` rule.
5. [React Hook Form: FormProvider](https://react-hook-form.com/docs/formprovider) *(doc)* — Sharing the form object through Context.
6. [React Hook Form: useFormState](https://react-hook-form.com/docs/useformstate) *(doc)* — Subscribing to the state of a particular field.
7. [React Hook Form: Advanced Usage](https://react-hook-form.com/advanced-usage#WizardFormFunnel) *(doc)* — Wizard forms and FormProvider performance.
8. [React Hook Form: trigger](https://react-hook-form.com/docs/useform/trigger) *(doc)* — Validating selected fields, and `shouldFocus`.
9. [React Hook Form: useForm](https://react-hook-form.com/docs/useform#shouldUnregister) *(doc)* — `shouldUnregister` and the value of fields that unmount.
10. [Next.js: Caching](https://nextjs.org/docs/app/getting-started/caching#random-values-and-timestamps) *(doc)* — Handling random values such as `crypto.randomUUID()` explicitly during prerendering, and leaving them to request time with Suspense.
