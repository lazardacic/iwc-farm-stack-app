import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FiPlus } from "react-icons/fi";

import { getAllDestinations } from "../api/destinationsApi";
import { useAuth } from "../hooks/useAuth";

import DestinationCard from "../components/destination/DestinationCard";
import DestinationCardSkeleton from "../components/destination/DestinationCardSkeleton";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Pagination from "../components/ui/Pagination";

const PAGE_SIZE = 9;

const gridClasses = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

const createLinkClasses =
  "flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700";

const MyDestinations = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isInteger(requestedPage) && requestedPage > 1 ? requestedPage : 1;

  const { data, isLoading, isPlaceholderData, error, refetch } = useQuery({
    // The user id is part of the key, so another account never sees cached results.
    queryKey: ["destinations", "mine", { userId: user?.id, page }],
    queryFn: () =>
      getAllDestinations({
        page,
        pageSize: PAGE_SIZE,
        search: "",
        sort: "newest",
        mine: true,
      }),
    placeholderData: keepPreviousData,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={gridClasses} aria-busy="true" aria-label="Loading your destinations">
          {Array.from({ length: 3 }).map((_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error || !data) {
      return (
        <ErrorState
          message="Unable to load your destinations. Please try again."
          onRetry={() => refetch()}
        />
      );
    }

    if (data.items.length === 0) {
      return (
        <EmptyState
          title="You have not published any destinations yet"
          description="Destinations you create appear here, newest first."
          action={
            <Link to="/create" className={createLinkClasses}>
              <FiPlus aria-hidden="true" />
              Create destination
            </Link>
          }
        />
      );
    }

    return (
      <>
        <div
          className={`${gridClasses} transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
          aria-busy={isPlaceholderData}
        >
          {data.items.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>

        <Pagination
          page={page}
          pages={data.pages}
          total={data.total}
          pageSize={PAGE_SIZE}
          itemLabel="destinations"
          disabled={isPlaceholderData}
          onPageChange={(nextPage) =>
            setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {})
          }
        />
      </>
    );
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            My destinations
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {data && data.total > 0
              ? `You have published ${data.total} ${data.total === 1 ? "destination" : "destinations"}.`
              : "Everything you have published, in one place."}
          </p>
        </div>

        <Link to="/create" className={createLinkClasses}>
          <FiPlus aria-hidden="true" />
          Create destination
        </Link>
      </div>

      {renderContent()}
    </section>
  );
};

export default MyDestinations;
