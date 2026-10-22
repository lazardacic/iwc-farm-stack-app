import { Link } from "react-router-dom";
import { FiArrowRight, FiMapPin, FiStar } from "react-icons/fi";

import DestinationImage from "./DestinationImage";

import type { Destination } from "../../types/destination";
import { destinationPath } from "../../utils/destinationLinks";
import { formatPrice, formatRating } from "../../utils/formatters";

interface Props {
  destination: Destination;
}

const DestinationCard = ({ destination }: Props) => {
  return (
    <Link
      to={destinationPath(destination)}
      className="
        group
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition-shadow
        duration-200

        hover:shadow-md
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-600
        focus-visible:ring-offset-2

        dark:border-slate-800
        dark:bg-slate-900
        dark:focus-visible:ring-offset-slate-950
      "
    >
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <DestinationImage
          src={destination.image}
          alt={destination.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {destination.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
            Featured
          </span>
        )}

        <span
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm"
          aria-label={`Rated ${formatRating(destination.rating)} out of 5`}
        >
          <FiStar className="fill-amber-400 text-amber-400" aria-hidden="true" />
          {formatRating(destination.rating)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <FiMapPin aria-hidden="true" />
          {destination.country}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900 dark:text-white">
          {destination.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {destination.description}
        </p>

        <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <p>
            <span className="block text-xs text-slate-500 dark:text-slate-400">From</span>
            <span className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {formatPrice(destination.price)}
            </span>
          </p>

          <span className="flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400">
            View
            <FiArrowRight
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DestinationCard;
