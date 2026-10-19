import { useDeferredValue, useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  getAllDestinations,
  getDestinationCountries,
} from "../api/destinationsApi";
import {
  EMPTY_DESTINATION_FILTERS,
  type DestinationFilters as DestinationFiltersValue,
} from "../types/destination";
import {
  getPriceRangeError,
  hasActiveFilters,
} from "../utils/destinationFilters";

import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import SearchBar from "../components/ui/SearchBar";

import DestinationCard from "../components/destination/DestinationCard";
import DestinationCardSkeleton from "../components/destination/DestinationCardSkeleton";
import DestinationFilters from "../components/destination/DestinationFilters";
import Button from "../components/ui/Button";

const PAGE_SIZE = 9;

const Home = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<DestinationFiltersValue>(
    EMPTY_DESTINATION_FILTERS,
  );
  const deferredSearch = useDeferredValue(search.trim());
  const deferredFilters = useDeferredValue(filters);
  const priceError = getPriceRangeError(filters);
  const filtersActive = hasActiveFilters(filters);

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
      },
    ],
    queryFn: () =>
      getAllDestinations({
        page,
        pageSize: PAGE_SIZE,
        search: deferredSearch,
        filters: deferredFilters,
      }),
    placeholderData: keepPreviousData,
    enabled: !getPriceRangeError(deferredFilters),
  });

  useEffect(() => {
    if (isPlaceholderData) {
      return;
    }

    if (data.pages === 0 && page !== 1) {
      setPage(1);
    } else if (data.pages > 0 && page > data.pages) {
      setPage(data.pages);
    }
  }, [data.pages, isPlaceholderData, page]);

  if (isLoading) {
    return (
      <section
        className="
          mx-auto
          grid
          max-w-7xl

          grid-cols-1
          gap-6

          px-6
          py-10

          sm:grid-cols-2

          lg:grid-cols-3
        "
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <DestinationCardSkeleton key={index} />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="
          mx-auto
          max-w-7xl

          px-6
          py-20
        "
      >
        <ErrorState
          message="Unable to load destinations. Please try again."
          onRetry={() => refetch()}
        />
      </section>
    );
  }

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

        <SearchBar
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      <DestinationFilters
        filters={filters}
        countries={countries}
        priceError={priceError}
        onChange={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
        onReset={() => {
          setFilters(EMPTY_DESTINATION_FILTERS);
          setPage(1);
        }}
      />

      {/* Content */}

      {data.items.length === 0 ? (
        <EmptyState
          title="No destinations found"
          description={
            filtersActive
              ? "Try changing your search query or filters."
              : "Try changing your search query."
          }
          action={
            filtersActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters(EMPTY_DESTINATION_FILTERS);
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="
            grid

            grid-cols-1

            gap-6

            sm:grid-cols-2

            lg:grid-cols-3
          "
        >
          {data.items.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      )}

      <div
        className="
          mt-8
          flex
          flex-col
          items-center
          justify-between
          gap-4
          border-t
          border-slate-200
          pt-5
          dark:border-slate-800
          sm:flex-row
        "
      >
        <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
          {data.total === 0
            ? "0 destinations"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(
                page * PAGE_SIZE,
                data.total,
              )} of ${data.total} destinations`}
        </p>

        <nav className="flex items-center gap-3" aria-label="Destination pages">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => currentPage - 1)}
            disabled={page <= 1 || isPlaceholderData}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="min-w-20 text-center text-sm text-slate-600 dark:text-slate-300">
            Page {page} of {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => currentPage + 1)}
            disabled={page >= data.pages || isPlaceholderData}
            aria-label="Next page"
          >
            Next
          </Button>
        </nav>
      </div>
    </section>
  );
};

export default Home;
