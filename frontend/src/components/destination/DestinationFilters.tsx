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

const RATING_OPTIONS = ["3", "3.5", "4", "4.5"];

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
        p-5

        dark:border-slate-800
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
          id="filter-country"
          label="Country"
          value={filters.country}
          onChange={(event) => update({ country: event.target.value })}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </Select>

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
          id="filter-min-rating"
          label="Rating"
          value={filters.minRating}
          onChange={(event) => update({ minRating: event.target.value })}
        >
          <option value="">Any rating</option>
          {RATING_OPTIONS.map((rating) => (
            <option key={rating} value={rating}>
              {rating}+
            </option>
          ))}
        </Select>

        <Select
          id="filter-featured"
          label="Featured"
          value={filters.featured}
          onChange={(event) =>
            update({ featured: event.target.value as FeaturedFilter })
          }
        >
          <option value="all">All destinations</option>
          <option value="featured">Featured only</option>
          <option value="regular">Not featured</option>
        </Select>
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
