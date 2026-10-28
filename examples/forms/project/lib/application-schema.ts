import { z } from "zod";

export const categories = [
  { value: "fashion", label: "Moda" },
  { value: "electronics", label: "Elektronik" },
  { value: "home", label: "Home and living" },
] as const;

export const parsePrice = (value: string) => Number(value.replace(",", "."));

const productSchema = z.object({
  name: z.string().trim().min(2, "The product name must be at least 2 characters."),
  // Fiyat metin olarak kalır; "249,90" de "249.90" de geçerlidir.
  price: z
    .string()
    .trim()
    .min(1, "Fiyat girin.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Enter the price as 249,90.")
    .refine((value) => parsePrice(value) > 0, "The price must be greater than zero."),
});

export const applicationSchema = z.object({
  storeName: z.string().trim().min(2, "The store name must be at least 2 characters."),
  taxNumber: z.string().regex(/^\d{10}$/, "A tax number must be 10 digits."),
  category: z.enum(["fashion", "electronics", "home"], { error: "Choose a category." }),
  products: z
    .array(productSchema)
    .min(1, "Add at least one product.")
    .max(3, "You can add at most 3 products."),
  contactName: z.string().trim().min(2, "The full name must be at least 2 characters."),
  email: z.email("Enter the email address as name@example.com."),
  phone: z.string().regex(/^5\d{9}$/, "A phone number must be 10 digits starting with 5."),
  // Maske yalnızca rakamları saklar; ülke kodunu ekleyip IBAN sağlamasını yapıyoruz.
  iban: z
    .string()
    .regex(/^\d{24}$/, "An IBAN must have 24 digits after TR.")
    .refine((value) => z.iban().validate(`TR${value}`), "The IBAN is invalid; check the number."),
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
