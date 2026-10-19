import type { DestinationFilters } from "../types/destination";

export const hasActiveFilters = (filters: DestinationFilters) =>
  filters.country !== "" ||
  filters.minPrice !== "" ||
  filters.maxPrice !== "" ||
  filters.minRating !== "" ||
  filters.featured !== "all";

export const getPriceRangeError = (filters: DestinationFilters) => {
  if (filters.minPrice === "" || filters.maxPrice === "") {
    return undefined;
  }

  return Number(filters.minPrice) > Number(filters.maxPrice)
    ? "Max price must be greater than min price"
    : undefined;
};
