import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { FiMenu, FiX, FiPlus } from "react-icons/fi";

import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `
    transition
    ${
      isActive
        ? `
          font-semibold
          text-blue-600
          dark:text-blue-400
        `
        : `
          text-slate-600
          hover:text-blue-600
          dark:text-slate-300
        `
    }
    `;

  return (
    <header
      className="
        sticky
        top-0
        z-50

        border-b
        border-slate-200

        bg-white/80
        backdrop-blur

        dark:border-slate-800
        dark:bg-slate-950/80
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-between
          px-4
          py-4
          sm:px-6
        "
      >
        <Logo />

        {/* Desktop */}
        <nav
          className="
            hidden
            items-center
            gap-6
            md:flex
          "
        >
          <NavLink to="/" className={linkClasses}>
            Home
          </NavLink>

          <Link
            to="/create"
            className="
              flex
              items-center
              gap-2

              rounded-xl

              bg-blue-600
              px-4
              py-2

              font-medium
              text-white

              transition

              hover:bg-blue-700
            "
          >
            <FiPlus />
            Create
          </Link>

          <ThemeToggle />
        </nav>

        {/* Mobile button */}
        <button
          className="
            rounded-lg
            p-2

            text-slate-700
            dark:text-white

            md:hidden
          "
          onClick={() => setOpen(!open)}
        >
          {open ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}

      {open && (
        <div
          className="
            border-t
            border-slate-200

            px-4
            py-5

            dark:border-slate-800

            md:hidden
          "
        >
          <nav
            className="
              flex
              flex-col
              gap-4
            "
          >
            <NavLink
              to="/"
              onClick={() => setOpen(false)}
              className={linkClasses}
            >
              Home
            </NavLink>

            <NavLink
              to="/create"
              onClick={() => setOpen(false)}
              className={linkClasses}
            >
              Create Destination
            </NavLink>

            <ThemeToggle />
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
