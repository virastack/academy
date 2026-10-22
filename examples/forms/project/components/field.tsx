"use client";

import type { ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";

type FieldA11y = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

type FieldProps = {
  name: string;
  label: string;
  description?: string;
  children: (a11y: FieldA11y) => ReactNode;
};

export function Field({ name, label, description, children }: FieldProps) {
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name });
  const { error } = getFieldState(name, formState);
  const id = name.replaceAll(".", "-");
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
      })}
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {description}
        </p>
      )}
      {/* Hata için yer ayrılır; mesaj gelince düğmeler kaymaz. */}
      <p id={errorId} className="min-h-5 text-sm text-red-700">
        {error?.message}
      </p>
    </div>
  );
}
