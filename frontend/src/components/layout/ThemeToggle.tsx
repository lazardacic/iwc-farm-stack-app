import { FiMoon, FiSun } from "react-icons/fi";

import { useTheme } from "../../hooks/useTheme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
      flex
      h-10
      w-10
      items-center
      justify-center
      rounded-full

      border
      border-slate-200

      hover:bg-slate-100

      dark:border-slate-700
      dark:hover:bg-slate-800
      "
    >
      {theme === "light" ? <FiMoon /> : <FiSun />}
    </button>
  );
};

export default ThemeToggle;
