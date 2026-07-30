import { FiLoader } from "react-icons/fi";

interface LoaderProps {
  text?: string;
}

const Loader = ({ text = "Loading..." }: LoaderProps) => {
  return (
    <div
      className="
      flex
      flex-col
      items-center
      justify-center
      gap-3
      py-20
      "
    >
      <FiLoader
        className="
        animate-spin
        text-4xl
        text-blue-600
        "
      />

      <p className="text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
};

export default Loader;
