"use client";

import { useFormContext } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import type { ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function ContactStep({ phone }: { phone: MaskInputProps }) {
  const { register } = useFormContext<ApplicationInput>();

  return (
    <>
      <Field name="contactName" label="Ad soyad">
        {(a11y) => (
          <input {...a11y} autoComplete="name" {...register("contactName")} className={inputClass} />
        )}
      </Field>
      <Field name="email" label="E-posta">
        {(a11y) => (
          <input
            {...a11y}
            type="email"
            autoComplete="email"
            {...register("email")}
            className={inputClass}
          />
        )}
      </Field>
      <Field name="phone" label="Cep telefonu" description="Example: (532) 123 45 67">
        {(a11y) => <input {...phone} {...a11y} autoComplete="tel-national" className={inputClass} />}
      </Field>
    </>
  );
}
