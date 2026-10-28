import { z } from "zod";

export const categories = [
  { value: "fashion", label: "Fashion" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home and living" },
] as const;

export const parsePrice = (value: string) => Number(value.replace(",", "."));

const productSchema = z.object({
  name: z.string().trim().min(2, "The product name must be at least 2 characters."),
  // The price stays text; both "249,90" and "249.90" are valid.
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter the price as 249.90.")
    .refine((value) => parsePrice(value) > 0, "The price must be greater than zero."),
});

export const applicationSchema = z.object({
  storeName: z.string().trim().min(2, "The store name must be at least 2 characters."),
  taxNumber: z.string().regex(/^\d{9}$/, "A VAT number must be 9 digits after DE."),
  category: z.enum(["fashion", "electronics", "home"], { error: "Choose a category." }),
  products: z
    .array(productSchema)
    .min(1, "Add at least one product.")
    .max(3, "You can add at most 3 products."),
  contactName: z.string().trim().min(2, "The full name must be at least 2 characters."),
  email: z.email("Enter the email address as name@example.com."),
  phone: z.string().regex(/^\d{8,15}$/, "Enter the phone number with its country code."),
  // The mask stores digits only, so we prepend the country code and run the IBAN checksum.
  iban: z
    .string()
    .regex(/^\d{20}$/, "An IBAN must have 20 digits after DE.")
    .refine((value) => z.iban().validate(`DE${value}`), "The IBAN is invalid; check the number."),
  acceptTerms: z.boolean().refine((value) => value, "Accept the terms to continue."),
});

export type ApplicationInput = z.input<typeof applicationSchema>;
export type ApplicationValues = z.output<typeof applicationSchema>;
export type ApplicationField = keyof ApplicationValues;

export const steps = [
  { title: "Store", fields: ["storeName", "taxNumber", "category", "products"] },
  { title: "Contact", fields: ["contactName", "email", "phone"] },
  { title: "Payment", fields: ["iban", "acceptTerms"] },
] as const satisfies { title: string; fields: ApplicationField[] }[];

export const stepOf = (field: ApplicationField) =>
  steps.findIndex((step) => (step.fields as readonly ApplicationField[]).includes(field));
