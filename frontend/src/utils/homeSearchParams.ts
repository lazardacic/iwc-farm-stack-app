import {
  EMPTY_DESTINATION_FILTERS,
  type DestinationFilters,
  type DestinationSort,
} from "../types/destination";

export interface HomeListState {
  search: string;
  page: number;
  sort: DestinationSort;
  filters: DestinationFilters;
}

export const DEFAULT_SORT: DestinationSort = "oldest";

const SORTS: DestinationSort[] = [
  "oldest",
  "newest",
  "price_asc",
  "price_desc",
  "rating_desc",
  "title_asc",
];

// URL keys match the API query params, so a shared link reads like the request it makes.
const isNonNegativeNumber = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;

const numberParam = (params: URLSearchParams, key: string, max?: number) => {
  const value = params.get(key) ?? "";

  if (!isNonNegativeNumber(value) || (max !== undefined && Number(value) > max)) {
    return "";
  }

  return value;
};

// Unknown or malformed values fall back to defaults, so a hand-edited URL never breaks the page.
export const parseHomeSearchParams = (params: URLSearchParams): HomeListState => {
  const page = Number(params.get("page"));
  const sort = params.get("sort") as DestinationSort | null;
  const featured = params.get("featured");

  return {
    search: params.get("search") ?? "",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_SORT,
    filters: {
      country: params.get("country") ?? "",
      minPrice: numberParam(params, "min_price"),
      maxPrice: numberParam(params, "max_price"),
      minRating: numberParam(params, "min_rating", 5),
      featured:
        featured === "true" ? "featured" : featured === "false" ? "regular" : "all",
    },
  };
};

// Default values are left out to keep links short.
export const toHomeSearchParams = (state: HomeListState): URLSearchParams => {
  const params = new URLSearchParams();
  const { filters } = state;

  if (state.search) params.set("search", state.search);
  if (filters.country) params.set("country", filters.country);
  if (filters.minPrice) params.set("min_price", filters.minPrice);
  if (filters.maxPrice) params.set("max_price", filters.maxPrice);
  if (filters.minRating) params.set("min_rating", filters.minRating);
  if (filters.featured !== "all") {
    params.set("featured", filters.featured === "featured" ? "true" : "false");
  }
  if (state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  return params;
};

export const EMPTY_HOME_LIST_STATE: HomeListState = {
  search: "",
  page: 1,
  sort: DEFAULT_SORT,
  filters: EMPTY_DESTINATION_FILTERS,
};
