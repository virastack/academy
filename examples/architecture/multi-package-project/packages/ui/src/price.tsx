import { formatPrice } from "#format-price.ts";

export function Price({ value }: { value: number }) {
  return <span className="ui-price">{formatPrice(value)}</span>;
}
