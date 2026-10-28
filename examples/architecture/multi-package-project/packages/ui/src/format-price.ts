const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

export function formatPrice(value: number) {
  return formatter.format(value);
}
