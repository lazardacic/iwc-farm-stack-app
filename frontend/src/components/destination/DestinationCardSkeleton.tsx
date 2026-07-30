import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";

const DestinationCardSkeleton = () => {
  return (
    <Card
      className="
        overflow-hidden
        p-0
      "
    >
      <Skeleton
        className="
          h-60
          w-full
          rounded-none
        "
      />

      <div
        className="
          space-y-4
          p-5
        "
      >
        <Skeleton
          className="
            h-6
            w-3/4
          "
        />

        <Skeleton
          className="
            h-4
            w-1/2
          "
        />

        <div
          className="
            flex
            justify-between
          "
        >
          <Skeleton
            className="
              h-6
              w-20
            "
          />

          <Skeleton
            className="
              h-6
              w-16
            "
          />
        </div>

        <Skeleton
          className="
            h-10
            w-full
          "
        />
      </div>
    </Card>
  );
};

export default DestinationCardSkeleton;
