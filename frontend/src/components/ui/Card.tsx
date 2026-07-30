import type { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={clsx(
        `
        rounded-2xl
        border
        border-slate-200
        bg-white

        shadow-lg

        transition-all
        duration-300

        hover:-translate-y-1
        hover:shadow-2xl

        dark:border-slate-800
        dark:bg-slate-900
        dark:shadow-white/5
        dark:hover:shadow-white/10
        `,
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Card;
