import { z } from "zod";

export const categories = [
  { value: "fashion", label: "Moda" },
  { value: "electronics", label: "Elektronik" },
  { value: "home", label: "Ev ve yaşam" },
] as const;

export const parsePrice = (value: string) => Number(value.replace(",", "."));

const productSchema = z.object({
  name: z.string().trim().min(2, "Ürün adı en az 2 karakter olmalı."),
  // Fiyat metin olarak kalır; "249,90" de "249.90" de geçerlidir.
  price: z
    .string()
    .trim()
    .min(1, "Fiyat girin.")
    .regex(/^\d+([.,]\d{1,2})?$/, "Fiyatı 249,90 biçiminde girin.")
    .refine((value) => parsePrice(value) > 0, "Fiyat sıfırdan büyük olmalı."),
});

export const applicationSchema = z.object({
  storeName: z.string().trim().min(2, "Mağaza adı en az 2 karakter olmalı."),
  taxNumber: z.string().regex(/^\d{10}$/, "Vergi numarası 10 haneli olmalı."),
  category: z.enum(["fashion", "electronics", "home"], { error: "Bir kategori seçin." }),
  products: z
    .array(productSchema)
    .min(1, "En az bir ürün ekleyin.")
    .max(3, "En fazla 3 ürün ekleyebilirsiniz."),
  contactName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı."),
  email: z.email("E-posta adresini ad@ornek.com biçiminde girin."),
  phone: z.string().regex(/^5\d{9}$/, "Telefon numarası 5 ile başlayan 10 haneli olmalı."),
  // Maske yalnızca rakamları saklar; ülke kodunu ekleyip IBAN sağlamasını yapıyoruz.
  iban: z
    .string()
    .regex(/^\d{24}$/, "IBAN, TR'den sonra 24 haneli olmalı.")
    .refine((value) => z.iban().validate(`TR${value}`), "IBAN hatalı; numarayı kontrol edin."),
  acceptTerms: z.boolean().refine((value) => value, "Devam etmek için koşulları kabul edin."),
});

export type ApplicationInput = z.input<typeof applicationSchema>;
export type ApplicationValues = z.output<typeof applicationSchema>;
export type ApplicationField = keyof ApplicationValues;

export const steps = [
  { title: "Mağaza", fields: ["storeName", "taxNumber", "category", "products"] },
  { title: "İletişim", fields: ["contactName", "email", "phone"] },
  { title: "Ödeme", fields: ["iban", "acceptTerms"] },
] as const satisfies { title: string; fields: ApplicationField[] }[];

export const stepOf = (field: ApplicationField) =>
  steps.findIndex((step) => (step.fields as readonly ApplicationField[]).includes(field));
