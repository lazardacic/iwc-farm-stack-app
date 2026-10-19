import Button from "./Button";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  itemLabel: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  page,
  pages,
  total,
  pageSize,
  itemLabel,
  disabled = false,
  onPageChange,
}: PaginationProps) => {
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
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
        {total === 0
          ? `0 ${itemLabel}`
          : `Showing ${firstItem}-${lastItem} of ${total} ${itemLabel}`}
      </p>

      <nav className="flex items-center gap-3" aria-label={`${itemLabel} pages`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm text-slate-600 dark:text-slate-300">
          Page {pages === 0 ? 0 : page} of {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages || disabled}
          aria-label="Next page"
        >
          Next
        </Button>
      </nav>
    </div>
  );
};

export default Pagination;
