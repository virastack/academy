"use client";

import { useFieldArray, useFormContext, useFormState } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import { categories, type ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function StoreStep({ taxNumber }: { taxNumber: MaskInputProps }) {
  const { register, control } = useFormContext<ApplicationInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "products" });
  const { errors } = useFormState({ control, name: "products" });
  // An array-level error goes to root while rows exist, and straight to the field when the array is empty.
  const listError = errors.products?.root?.message ?? errors.products?.message;

  return (
    <>
      <Field name="storeName" label="Store name">
        {(a11y) => <input {...a11y} {...register("storeName")} className={inputClass} />}
      </Field>

      <Field name="taxNumber" label="Tax number" description="10-digit tax identification number">
        {(a11y) => <input {...taxNumber} {...a11y} className={inputClass} />}
      </Field>

      <Field name="category" label="Kategori">
        {(a11y) => (
          <select {...a11y} {...register("category")} className={inputClass}>
            <option value="">Choose</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium">Sample products</legend>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <Field name={`products.${index}.name`} label={`Product ${index + 1} name`}>
              {(a11y) => (
                <input {...a11y} {...register(`products.${index}.name`)} className={inputClass} />
              )}
            </Field>
            <Field name={`products.${index}.price`} label={`Product ${index + 1} price (₺)`}>
              {(a11y) => (
                <input
                  {...a11y}
                  inputMode="decimal"
                  {...register(`products.${index}.price`)}
                  className={inputClass}
                />
              )}
            </Field>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              aria-label={`Remove product ${index + 1}`}
              className="mt-7 rounded border px-2 py-2 disabled:opacity-40"
            >Remove</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: "", price: "" })}
          disabled={fields.length >= 3}
          className="self-start rounded border px-3 py-2 disabled:opacity-40"
        >Add product</button>
        {listError && (
          <p role="alert" className="text-sm text-red-700">
            {listError}
          </p>
        )}
      </fieldset>
    </>
  );
}
