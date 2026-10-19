import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
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

import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";
import SearchBar from "../components/ui/SearchBar";
import Select from "../components/ui/Select";

import DestinationCard from "../components/destination/DestinationCard";
import DestinationCardSkeleton from "../components/destination/DestinationCardSkeleton";
import DestinationFilters from "../components/destination/DestinationFilters";
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
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DestinationSort>("oldest");
  const [filters, setFilters] = useState<DestinationFiltersValue>(
    EMPTY_DESTINATION_FILTERS,
  );
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

  // Clamp during render when the result set shrinks below the current page
  // (for example after a deletion), instead of syncing state in an effect.
  if (!isPlaceholderData && !isLoading) {
    const lastPage = Math.max(data.pages, 1);

    if (page > lastPage) {
      setPage(lastPage);
    }
  }

  const changeFilters = (nextFilters: DestinationFiltersValue) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    changeFilters(EMPTY_DESTINATION_FILTERS);
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
            isAuthenticated
              ? "Add the first destination to get started."
              : "Sign in to add the first destination."
          }
          action={
            <Link
              to={isAuthenticated ? "/create" : "/login"}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {isAuthenticated ? "Create destination" : "Sign in"}
            </Link>
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

        px-6
        py-10
      "
    >
      {/* Header */}

      <div
        className="
          mb-10

          flex
          flex-col
          gap-6

          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <div>
          <h1
            className="
              text-3xl
              font-bold
              tracking-tight

              text-slate-900

              dark:text-white
            "
          >
            Destinations
          </h1>

          <p
            className="
              mt-2

              text-slate-500

              dark:text-slate-400
            "
          >
            Explore amazing places around the world.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:max-w-2xl">
          <SearchBar
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />

          <div className="sm:w-56">
            <Select
              aria-label="Sort by"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as DestinationSort);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <DestinationFilters
        filters={filters}
        countries={countries}
        priceError={priceError}
        onChange={changeFilters}
        onReset={() => changeFilters(EMPTY_DESTINATION_FILTERS)}
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
          onPageChange={setPage}
        />
      )}
    </section>
  );
};

export default Home;
