import type { ProductFilters } from "./api";
import { useCategory, useFilterActions, useSearch } from "./filter-store";

const categories: { value: ProductFilters["category"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shoes", label: "Shoes" },
  { value: "clothing", label: "Clothing" },
  { value: "accessories", label: "Accessories" },
];

export function Filters() {
  const category = useCategory();
  const search = useSearch();
  const { setCategory, setSearch, reset } = useFilterActions();

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        aria-label="Search products"
        placeholder="Search products"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        aria-label="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value as ProductFilters["category"])}
      >
        {categories.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button onClick={reset}>Clear filters</button>
    </div>
  );
}
