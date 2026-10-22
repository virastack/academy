"use client";

import { useFormContext } from "react-hook-form";
import type { MaskInputProps } from "@/lib/mask-input";
import type { ApplicationInput } from "@/lib/application-schema";
import { Field } from "./field";

const inputClass = "rounded border border-gray-400 px-3 py-2 aria-invalid:border-red-700";

export function PaymentStep({ iban }: { iban: MaskInputProps }) {
  const { register } = useFormContext<ApplicationInput>();

  return (
    <>
      <Field name="iban" label="IBAN" description="Ödemeler bu hesaba yapılır.">
        {(a11y) => <input {...iban} {...a11y} className={inputClass} />}
      </Field>
      <Field name="acceptTerms" label="Satıcı sözleşmesini okudum ve kabul ediyorum.">
        {(a11y) => <input {...a11y} type="checkbox" {...register("acceptTerms")} className="size-5" />}
      </Field>
    </>
  );
}
