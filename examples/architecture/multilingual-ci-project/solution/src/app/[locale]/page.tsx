import { useLocale, useTranslations } from "next-intl";

import { product } from "@/data/product";
import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

export default function ProductPage() {
  const t = useTranslations("ProductPage");
  const locale = useLocale() as Locale;

  return (
    <main>
      <h1>{product.name[locale]}</h1>
      <p data-testid="price">{t("price", { price: product.price })}</p>
      <p data-testid="stock">{t("stock", { count: product.stock })}</p>
      <p data-testid="updated">{t("updated", { date: product.updatedAt })}</p>
      <button type="button">{t("addToCart")}</button>
    </main>
  );
}
