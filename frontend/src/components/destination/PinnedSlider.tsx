import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiStar,
} from "react-icons/fi";

import { getPinnedDestinations } from "../../api/destinationsApi";
import { formatPrice, formatRating } from "../../utils/formatters";

import DestinationImage from "./DestinationImage";
import Skeleton from "../ui/Skeleton";

const arrowClasses = `
  absolute
  top-1/2
  z-10
  hidden
  h-11
  w-11
  -translate-y-1/2
  items-center
  justify-center
  rounded-full
  bg-white/90
  text-slate-900
  shadow-md
  transition
  hover:bg-white
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-white
  disabled:opacity-0
  sm:flex
`;

// Destinations admins pinned to the top of the home page (at most 5).
// Scroll-snap slider: native swipe and scrolling, no autoplay, no animation library.
const PinnedSlider = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["destinations", "pinned"],
    queryFn: getPinnedDestinations,
  });

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading highlighted destinations" className="mb-12">
        <Skeleton className="h-105 w-full rounded-3xl sm:h-120" />
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (track && track.clientWidth > 0) {
      setActive(Math.round(track.scrollLeft / track.clientWidth));
    }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlighted destinations"
      className="relative mb-12 overflow-hidden rounded-3xl bg-slate-900"
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {slides.map((destination, index) => (
          <div
            key={destination.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            className="relative h-105 w-full shrink-0 snap-start sm:h-120"
          >
            <DestinationImage
              src={destination.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/40 to-transparent"
              aria-hidden="true"
            />

            <div className="relative flex h-full max-w-2xl flex-col justify-end p-6 sm:p-10">
              {destination.featured && (
                <span className="mb-4 w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                  Featured
                </span>
              )}

              <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                <FiMapPin aria-hidden="true" />
                {destination.country}
              </p>

              <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-5xl">
                {destination.title}
              </h2>

              <p className="mt-3 flex items-center gap-4 text-sm text-white/85">
                <span className="flex items-center gap-1">
                  <FiStar className="fill-amber-400 text-amber-400" aria-hidden="true" />
                  {formatRating(destination.rating)}
                </span>
                <span>From {formatPrice(destination.price)}</span>
              </p>

              <Link
                to={`/destination/${destination.id}`}
                className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Explore destination
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className={`${arrowClasses} left-4`}
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous highlighted destination"
          >
            <FiChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${arrowClasses} right-4`}
            onClick={() => goTo(active + 1)}
            disabled={active === slides.length - 1}
            aria-label="Next highlighted destination"
          >
            <FiChevronRight size={22} aria-hidden="true" />
          </button>

          <div className="absolute bottom-6 right-6 z-10 flex gap-2 sm:bottom-10 sm:right-10">
            {slides.map((destination, index) => (
              <button
                key={destination.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show highlighted destination ${index + 1}`}
                aria-current={index === active}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  index === active ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default PinnedSlider;
