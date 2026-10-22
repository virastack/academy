"use client";

import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useViraMask } from "@virastack/mask";
import { submitApplication } from "@/app/actions";
import {
  applicationSchema,
  stepOf,
  steps,
  type ApplicationField,
  type ApplicationInput,
} from "@/lib/application-schema";
import { toInputProps } from "@/lib/mask-input";
import { ContactStep } from "./contact-step";
import { PaymentStep } from "./payment-step";
import { StoreStep } from "./store-step";

const defaultValues: ApplicationInput = {
  storeName: "",
  taxNumber: "",
  category: "" as ApplicationInput["category"],
  products: [{ name: "", price: "" }],
  contactName: "",
  email: "",
  phone: "",
  iban: "",
  acceptTerms: false,
};

export function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues,
    mode: "onTouched",
  });
  const masks = useViraMask({
    form,
    schema: {
      taxNumber: "taxNumber",
      phone: { preset: "phone", mask: "(999) 999 99 99" },
      iban: "iban",
    },
  });

  const isLastStep = step === steps.length - 1;

  async function goNext() {
    const valid = await form.trigger([...steps[step].fields], { shouldFocus: true });
    if (valid) setStep((s) => s + 1);
  }

  const onSubmit = form.handleSubmit((values) => {
    form.clearErrors("root.server");
    startTransition(async () => {
      const result = await submitApplication(values);
      if (result.status === "success") {
        startTransition(() => setApplicationId(result.applicationId));
        return;
      }
      const fields = Object.keys(result.fieldErrors) as ApplicationField[];
      for (const field of fields) {
        form.setError(field, { type: "server", message: result.fieldErrors[field] });
      }
      form.setError("root.server", { type: "server", message: result.message });
      if (fields.length > 0) {
        startTransition(() => setStep(Math.min(...fields.map(stepOf))));
      }
    });
  });

  if (applicationId) {
    return (
      <div role="status" className="rounded border border-green-700 p-4">
        <h2 className="text-xl font-semibold">Başvurunuz alındı</h2>
        <p>Başvuru numaranız: {applicationId}</p>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <ol className="mb-6 flex gap-4" aria-label="Adımlar">
        {steps.map((s, index) => (
          <li
            key={s.title}
            aria-current={index === step ? "step" : undefined}
            className={index === step ? "font-semibold underline" : "text-gray-600"}
          >
            {index + 1}. {s.title}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{steps[step].title}</h2>

        {step === 0 && <StoreStep taxNumber={toInputProps(masks.taxNumber)} />}
        {step === 1 && <ContactStep phone={toInputProps(masks.phone)} />}
        {step === 2 && <PaymentStep iban={toInputProps(masks.iban)} />}

        {form.formState.errors.root?.server && (
          <p role="alert" className="text-red-700">
            {form.formState.errors.root.server.message}
          </p>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded border px-4 py-2">
              Geri
            </button>
          )}
          {isLastStep ? (
            <button type="submit" disabled={isPending} className="rounded bg-black px-4 py-2 text-white">
              {isPending ? "Gönderiliyor..." : "Başvuruyu gönder"}
            </button>
          ) : (
            <button type="button" onClick={goNext} className="rounded bg-black px-4 py-2 text-white">
              İleri
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
