import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import toast from "react-hot-toast";

import { FiMenu, FiX, FiPlus } from "react-icons/fi";

import { useAuth } from "../../hooks/useAuth";

import Badge from "../ui/Badge";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    setOpen(false);
    toast.success("Signed out successfully");
  };

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

          {isAuthenticated ? (
            <>
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

              <span className="text-sm text-slate-500 dark:text-slate-400">
                {user?.email}
              </span>

              {user?.role === "admin" && <Badge variant="yellow">Admin</Badge>}

              <button
                className="font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClasses}>
                Login
              </NavLink>

              <Link
                to="/register"
                className="
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
                Register
              </Link>
            </>
          )}

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

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/create"
                  onClick={() => setOpen(false)}
                  className={linkClasses}
                >
                  Create Destination
                </NavLink>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {user?.email}
                </p>

                {user?.role === "admin" && <Badge variant="yellow">Admin</Badge>}

                <button
                  className="text-left text-slate-600 transition hover:text-blue-600 dark:text-slate-300"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={linkClasses}
                >
                  Login
                </NavLink>

                <NavLink
                  to="/register"
                  onClick={() => setOpen(false)}
                  className={linkClasses}
                >
                  Register
                </NavLink>
              </>
            )}

            <ThemeToggle />
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
