import { FiSearch } from "react-icons/fi";

import Input from "./Input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search destinations...",
}: SearchBarProps) => {
  return (
    <div className="relative w-full max-w-xl">
      <div
        className="
          pointer-events-none
          absolute
          left-4
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      >
        <FiSearch size={20} />
      </div>

      <Input
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-12"
      />
    </div>
  );
};

export default SearchBar;
