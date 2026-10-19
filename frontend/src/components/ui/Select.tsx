import { useId, type SelectHTMLAttributes } from "react";
import clsx from "clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = ({ label, id, className, children, ...props }: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium">
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={clsx(
          `
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          px-4
          py-3
          text-slate-900
          outline-none
          transition

          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-500/20

          dark:border-slate-700
          dark:bg-slate-900
          dark:text-white
          `,
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;
