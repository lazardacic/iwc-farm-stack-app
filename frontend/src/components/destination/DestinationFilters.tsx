import type {
  DestinationFilters as DestinationFiltersValue,
  FeaturedFilter,
} from "../../types/destination";

import { hasActiveFilters } from "../../utils/destinationFilters";

import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

interface DestinationFiltersProps {
  filters: DestinationFiltersValue;
  countries: string[];
  priceError?: string;
  onChange: (filters: DestinationFiltersValue) => void;
  onReset: () => void;
}

const RATING_OPTIONS = [
  { value: "", label: "Any rating" },
  ...["3", "3.5", "4", "4.5"].map((rating) => ({
    value: rating,
    label: `${rating}+`,
  })),
];

const FEATURED_OPTIONS: { value: FeaturedFilter; label: string }[] = [
  { value: "all", label: "All destinations" },
  { value: "featured", label: "Featured only" },
  { value: "regular", label: "Not featured" },
];

const DestinationFilters = ({
  filters,
  countries,
  priceError,
  onChange,
  onReset,
}: DestinationFiltersProps) => {
  const update = (changes: Partial<DestinationFiltersValue>) => {
    onChange({ ...filters, ...changes });
  };

  return (
    <div
      className="
        mb-8
        rounded-2xl
        border
        border-slate-200
        bg-white
        p-5

        dark:border-slate-800
        dark:bg-slate-900/60
      "
    >
      <div
        className="
          grid
          grid-cols-1
          gap-4

          sm:grid-cols-2

          lg:grid-cols-5
          lg:items-start
        "
      >
        <Select
          label="Country"
          value={filters.country}
          options={[
            { value: "", label: "All countries" },
            ...countries.map((country) => ({ value: country, label: country })),
          ]}
          onChange={(country) => update({ country })}
        />

        <Input
          id="filter-min-price"
          label="Min price"
          type="number"
          min={0}
          placeholder="Any"
          value={filters.minPrice}
          onChange={(event) => update({ minPrice: event.target.value })}
        />

        <Input
          id="filter-max-price"
          label="Max price"
          type="number"
          min={0}
          placeholder="Any"
          value={filters.maxPrice}
          error={priceError}
          onChange={(event) => update({ maxPrice: event.target.value })}
        />

        <Select
          label="Rating"
          value={filters.minRating}
          options={RATING_OPTIONS}
          onChange={(minRating) => update({ minRating })}
        />

        <Select
          label="Featured"
          value={filters.featured}
          options={FEATURED_OPTIONS}
          onChange={(featured) => update({ featured })}
        />
      </div>

      {hasActiveFilters(filters) && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default DestinationFilters;
