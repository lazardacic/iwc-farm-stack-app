import { useDeferredValue, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getAllDestinations,
  getDestinationCountries,
} from "../api/destinationsApi";
import { useAuth } from "../hooks/useAuth";
import {
  EMPTY_DESTINATION_FILTERS,
  type DestinationFilters as DestinationFiltersValue,
  type DestinationSort,
} from "../types/destination";
import {
  getPriceRangeError,
  hasActiveFilters,
} from "../utils/destinationFilters";
import {
  EMPTY_HOME_LIST_STATE,
  parseHomeSearchParams,
  toHomeSearchParams,
  type HomeListState,
} from "../utils/homeSearchParams";

import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import SearchBar from "../components/ui/SearchBar";
import Select from "../components/ui/Select";

import DestinationCard from "../components/destination/DestinationCard";
import DestinationCardSkeleton from "../components/destination/DestinationCardSkeleton";
import DestinationFilters from "../components/destination/DestinationFilters";
import FeaturedSlider from "../components/destination/FeaturedSlider";
import Button from "../components/ui/Button";

const PAGE_SIZE = 9;

const SORT_OPTIONS: { value: DestinationSort; label: string }[] = [
  { value: "oldest", label: "Default" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top rated" },
  { value: "title_asc", label: "Title: A to Z" },
];

const gridClasses = `
  grid

  grid-cols-1

  gap-6

  sm:grid-cols-2

  lg:grid-cols-3
`;

const Home = () => {
  const { isAuthenticated, canPublish } = useAuth();
  // Search, filters, sort and page live in the URL, so a view can be shared,
  // bookmarked and restored with the browser's Back button.
  const [searchParams, setSearchParams] = useSearchParams();
  const listState = useMemo(
    () => parseHomeSearchParams(searchParams),
    [searchParams],
  );
  const { search, page, sort, filters } = listState;
  const deferredSearch = useDeferredValue(search.trim());
  const deferredFilters = useDeferredValue(filters);
  const priceError = getPriceRangeError(filters);
  const filtersActive = hasActiveFilters(filters);
  const narrowed = filtersActive || deferredSearch !== "";

  const { data: countries = [] } = useQuery({
    queryKey: ["destinations", "countries"],
    queryFn: getDestinationCountries,
  });

  const {
    data = { items: [], total: 0, page, page_size: PAGE_SIZE, pages: 0 },
    isLoading,
    isPlaceholderData,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "destinations",
      {
        page,
        pageSize: PAGE_SIZE,
        search: deferredSearch,
        filters: deferredFilters,
        sort,
      },
    ],
    queryFn: () =>
      getAllDestinations({
        page,
        pageSize: PAGE_SIZE,
        search: deferredSearch,
        filters: deferredFilters,
        sort,
      }),
    placeholderData: keepPreviousData,
    enabled: !getPriceRangeError(deferredFilters),
  });

  // Any change except paging starts again from page 1. Typing replaces the
  // current history entry, so Back skips keystrokes and returns to the last view.
  const updateList = (
    changes: Partial<HomeListState>,
    { replace = false }: { replace?: boolean } = {},
  ) => {
    setSearchParams(toHomeSearchParams({ ...listState, page: 1, ...changes }), {
      replace,
    });
  };

  // A page past the end (an old link, or rows deleted since) moves to the last page.
  const lastPage = Math.max(data.pages, 1);
  const pageOutOfRange = !isPlaceholderData && !isLoading && page > lastPage;

  useEffect(() => {
    if (pageOutOfRange) {
      setSearchParams(toHomeSearchParams({ ...listState, page: lastPage }), {
        replace: true,
      });
    }
  }, [pageOutOfRange, lastPage, listState, setSearchParams]);

  const changeFilters = (nextFilters: DestinationFiltersValue) => {
    const typingPrice =
      nextFilters.minPrice !== filters.minPrice ||
      nextFilters.maxPrice !== filters.maxPrice;

    updateList({ filters: nextFilters }, { replace: typingPrice });
  };

  const clearFilters = () => {
    setSearchParams(toHomeSearchParams(EMPTY_HOME_LIST_STATE));
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={gridClasses} aria-busy="true" aria-label="Loading destinations">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <ErrorState
          message="Unable to load destinations. Please try again."
          onRetry={() => refetch()}
        />
      );
    }

    if (data.items.length === 0) {
      return narrowed ? (
        <EmptyState
          title="No destinations match"
          description="Try a different search or loosen your filters."
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear search and filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No destinations yet"
          description={
            canPublish
              ? "Add the first destination to get started."
              : isAuthenticated
                ? "Editors and admins can add destinations."
                : "Sign in to add the first destination."
          }
          action={
            canPublish || !isAuthenticated ? (
              <Link
                to={canPublish ? "/create" : "/login"}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                {canPublish ? "Create destination" : "Sign in"}
              </Link>
            ) : undefined
          }
        />
      );
    }

    return (
      <div
        className={`${gridClasses} transition-opacity ${
          isPlaceholderData ? "opacity-60" : ""
        }`}
        aria-busy={isPlaceholderData}
      >
        {data.items.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
    );
  };

  return (
    <section
      className="
        mx-auto
        max-w-7xl

        px-4
        py-8
        sm:px-6
        sm:py-10
      "
    >
      <FeaturedSlider />

      {/* Header */}

      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Explore
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Find your next destination
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Search by place or country, then narrow down by price, rating and more.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-2xl">
          <SearchBar
            value={search}
            onChange={(value) => updateList({ search: value }, { replace: true })}
          />

          <div className="sm:w-56">
            <Select
              aria-label="Sort by"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(nextSort: DestinationSort) => updateList({ sort: nextSort })}
            />
          </div>
        </div>
      </div>

      <DestinationFilters
        filters={filters}
        countries={countries}
        priceError={priceError}
        onChange={changeFilters}
        onReset={() => updateList({ filters: EMPTY_DESTINATION_FILTERS })}
      />

      {/* Content */}

      {renderContent()}

      {!isLoading && !error && data.total > 0 && (
        <Pagination
          page={page}
          pages={data.pages}
          total={data.total}
          pageSize={PAGE_SIZE}
          itemLabel="destinations"
          disabled={isPlaceholderData}
          onPageChange={(nextPage) => updateList({ page: nextPage })}
        />
      )}
    </section>
  );
};

export default Home;
