const formatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

export function formatPrice(value: number) {
  return formatter.format(value);
}
