import {
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import clsx from "clsx";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label?: string;
  "aria-label"?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

const Select = <T extends string>({
  label,
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  title,
  className,
}: SelectProps<T>) => {
  const selected = options.find((option) => option.value === value);

  return (
    <Field disabled={disabled} className="space-y-2">
      {label && <Label className="block text-sm font-medium">{label}</Label>}

      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <ListboxButton
          aria-label={label ? undefined : ariaLabel}
          title={title}
          className={clsx(
            `
            relative
            w-full
            cursor-pointer
            rounded-xl
            border
            border-slate-300
            bg-white
            py-3
            pl-4
            pr-10
            text-left
            text-slate-900
            outline-none
            transition

            data-focus:border-blue-500
            data-focus:ring-2
            data-focus:ring-blue-500/20
            data-open:border-blue-500

            data-disabled:cursor-not-allowed
            data-disabled:opacity-50

            dark:border-slate-700
            dark:bg-slate-900
            dark:text-white
            `,
            className,
          )}
        >
          <span className="block truncate">{selected?.label ?? value}</span>
          <FiChevronDown
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />
        </ListboxButton>

        <ListboxOptions
          anchor={{ to: "bottom start", gap: 6 }}
          transition
          className="
            z-50
            max-h-64
            w-(--button-width)
            overflow-y-auto
            rounded-xl
            border
            border-slate-200
            bg-white
            p-1
            shadow-xl
            outline-none

            transition
            duration-100
            ease-out
            data-closed:scale-95
            data-closed:opacity-0

            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="
                group
                flex
                cursor-pointer
                items-center
                justify-between
                gap-2
                rounded-lg
                px-3
                py-2
                text-sm
                text-slate-700

                select-none

                data-focus:bg-blue-50
                data-focus:text-blue-700
                data-selected:font-semibold

                dark:text-slate-200
                dark:data-focus:bg-slate-800
                dark:data-focus:text-white
              "
            >
              <span className="truncate">{option.label}</span>
              <FiCheck
                aria-hidden="true"
                className="invisible text-blue-600 group-data-selected:visible dark:text-blue-400"
              />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </Field>
  );
};

export default Select;
