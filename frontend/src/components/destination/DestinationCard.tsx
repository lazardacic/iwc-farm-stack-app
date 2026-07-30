import { Link } from "react-router-dom";

import type { Destination } from "../../types/destination";

import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

interface Props {
  destination: Destination;
}

const DestinationCard = ({ destination }: Props) => {
  return (
    <Card
      className="
        group
        overflow-hidden
        p-0
      "
    >
      {/* Image */}

      <div className="relative overflow-hidden">
        <img
          src={destination.image}
          alt={destination.title}
          className="
            h-60
            w-full
            object-cover
            transition-transform
            duration-500
            group-hover:scale-110
          "
        />

        {destination.featured && (
          <div
            className="
            absolute
            left-4
            top-4
            "
          >
            <Badge variant="yellow">Featured</Badge>
          </div>
        )}
      </div>

      {/* Content */}

      <div
        className="
        flex
        flex-col
        gap-5
        p-5
        "
      >
        <div>
          <h3
            className="
            text-xl
            font-bold
            line-clamp-1
            "
          >
            {destination.title}
          </h3>

          <p
            className="
            mt-1
            text-sm
            text-slate-500

            dark:text-slate-400
            "
          >
            {destination.country}
          </p>
        </div>

        <div
          className="
          flex
          items-center
          justify-between
          "
        >
          <span
            className="
            text-lg
            font-bold
            text-blue-600
            "
          >
            ${destination.price}
          </span>

          <span
            className="
            rounded-lg
            bg-yellow-50
            px-3
            py-1
            text-sm

            dark:bg-yellow-900/20
            "
          >
            ⭐ {destination.rating}
          </span>
        </div>

        <Link to={`/destination/${destination.id}`} className="block">
          <Button fullWidth>View Details</Button>
        </Link>
      </div>
    </Card>
  );
};

export default DestinationCard;
