import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

const ErrorState = ({
  title = "Unable to load data",
  message = "Something went wrong.",
  onRetry,
}: ErrorStateProps) => {
  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-center

        gap-4

        rounded-xl

        border
        border-red-200

        bg-red-50

        p-8

        text-center

        dark:border-red-900
        dark:bg-red-950/30
      "
    >
      <div className="text-4xl">⚠️</div>

      <h2
        className="
          text-xl
          font-bold
          text-slate-900
          dark:text-white
        "
      >
        {title}
      </h2>

      <p
        className="
          text-slate-600
          dark:text-slate-400
        "
      >
        {message}
      </p>

      {onRetry && <Button onClick={onRetry}>Try Again</Button>}
    </div>
  );
};

export default ErrorState;
