import { Link } from "react-router-dom";

const Logo = () => {
  return (
    <Link
      to="/"
      className="
        flex
        items-center
        gap-3
      "
    >
      <div
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-blue-600
          font-bold
          text-white
          shadow-md
        "
      >
        LD
      </div>

      <div className="hidden sm:block">
        <p
          className="
            text-lg
            font-bold
            text-slate-900
            dark:text-white
          "
        >
          FARM Stack
        </p>

        <p
          className="
            text-xs
            text-slate-500
            dark:text-slate-400
          "
        >
          Travel Explorer
        </p>
      </div>
    </Link>
  );
};

export default Logo;
