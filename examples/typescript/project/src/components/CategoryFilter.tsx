import { CATEGORIES, type Category } from "../types";

export type CategoryFilterValue = Category | "all";

const LABELS: Record<CategoryFilterValue, string> = {
  all: "All",
  audio: "Audio",
  computer: "Computers",
  accessory: "Accessories",
};

function isCategoryFilterValue(value: string): value is CategoryFilterValue {
  return value === "all" || CATEGORIES.some((category) => category === value);
}

type CategoryFilterProps = {
  value: CategoryFilterValue;
  onChange: (value: CategoryFilterValue) => void;
};

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.currentTarget.value;
    if (isCategoryFilterValue(next)) {
      onChange(next);
    }
  }

  return (
    <label>
      Kategori{" "}
      <select value={value} onChange={handleChange}>
        {(["all", ...CATEGORIES] as const).map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
