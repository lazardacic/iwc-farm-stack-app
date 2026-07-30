import type { ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps {
  children: ReactNode;
  variant?: "blue" | "green" | "yellow" | "red";
}

const Badge = ({ children, variant = "blue" }: BadgeProps) => {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        {
          "bg-blue-100 text-blue-700": variant === "blue",

          "bg-green-100 text-green-700": variant === "green",

          "bg-yellow-100 text-yellow-700": variant === "yellow",

          "bg-red-100 text-red-700": variant === "red",
        },
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
