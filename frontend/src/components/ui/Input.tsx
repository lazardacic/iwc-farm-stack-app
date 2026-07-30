import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}

      <input
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

          placeholder:text-slate-400

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
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
