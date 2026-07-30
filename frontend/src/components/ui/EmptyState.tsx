import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <div
      className="
      flex
      flex-col
      items-center
      justify-center
      rounded-2xl
      border
      border-dashed
      border-slate-300
      p-10
      text-center

      dark:border-slate-700
      "
    >
      <h3 className="text-lg font-semibold">{title}</h3>

      {description && (
        <p
          className="
          mt-2
          max-w-md
          text-sm
          text-slate-500
          dark:text-slate-400
          "
        >
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
