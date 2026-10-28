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
      <Field name="contactName" label="Full name">
        {(a11y) => (
          <input {...a11y} autoComplete="name" {...register("contactName")} className={inputClass} />
        )}
      </Field>
      <Field name="email" label="Email">
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
      <Field name="phone" label="Mobile phone" description="Example: +49 30 12345678">
        {(a11y) => <input {...phone} {...a11y} autoComplete="tel" className={inputClass} />}
      </Field>
    </>
  );
}
