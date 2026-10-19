import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex w-full flex-col gap-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="
              text-sm
              font-medium
              text-slate-700
              dark:text-slate-200
            "
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            `
            min-h-36
            w-full
            rounded-xl
            border
            border-slate-300
            bg-white
            px-4
            py-3
            text-slate-900
            placeholder:text-slate-400

            transition-all
            duration-200

            focus:border-blue-500
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500/20

            dark:border-slate-700
            dark:bg-slate-900
            dark:text-white
            dark:placeholder:text-slate-500

            disabled:cursor-not-allowed
            disabled:opacity-50
            resize-none
            `,
            className,
          )}
          {...props}
        />

        {error && (
          <p
            className="
              text-sm
              text-red-500
            "
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
