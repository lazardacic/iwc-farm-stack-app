import Card from "../ui/Card";
import Skeleton from "../ui/Skeleton";

const DestinationCardSkeleton = () => {
  return (
    <Card className="overflow-hidden p-0">
      <Skeleton className="aspect-4/3 w-full rounded-none" />

      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        <div className="flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </Card>
  );
};

export default DestinationCardSkeleton;
