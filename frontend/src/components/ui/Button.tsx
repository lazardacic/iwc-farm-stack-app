import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Button = ({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={clsx(
        "rounded-xl font-medium transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
         "cursor-pointer rounded-xl font-medium transition-all duration-200",

        {
          "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",

          "bg-slate-800 text-white hover:bg-slate-700": variant === "secondary",

          "border border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800":
            variant === "outline",

          "bg-red-600 text-white hover:bg-red-700": variant === "danger",

          "hover:bg-slate-100 dark:hover:bg-slate-800": variant === "ghost",
        },

        {
          "px-3 py-2 text-sm": size === "sm",
          "px-5 py-3": size === "md",
          "px-7 py-4 text-lg": size === "lg",
        },

        {
          "w-full": fullWidth,
        },

        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
