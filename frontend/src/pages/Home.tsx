import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAllDestinations } from "../api/destinationsApi";

import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import SearchBar from "../components/ui/SearchBar";

import DestinationCard from "../components/destination/DestinationCard";
import DestinationCardSkeleton from "../components/destination/DestinationCardSkeleton";

const Home = () => {
  const [search, setSearch] = useState("");

  const {
    data: destinations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: getAllDestinations,
  });

  const filtered = destinations.filter((destination) =>
    `${destination.title} ${destination.country}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

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

        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Content */}

      {filtered.length === 0 ? (
        <EmptyState
          title="No destinations found"
          description="Try changing your search query."
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
          {filtered.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Home;
