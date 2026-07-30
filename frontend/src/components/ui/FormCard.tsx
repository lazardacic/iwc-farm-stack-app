import type { ReactNode } from "react";
import clsx from "clsx";

interface FormCardProps {
  children: ReactNode;
  className?: string;
}

const FormCard = ({ children, className }: FormCardProps) => {
  return (
    <div
      className={clsx(
        `
        rounded-2xl

        bg-transparent

        p-0

        `,
        className,
      )}
    >
      {children}
    </div>
  );
};

export default FormCard;
