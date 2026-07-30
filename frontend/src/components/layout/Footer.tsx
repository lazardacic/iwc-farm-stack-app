import { Link } from "react-router-dom";

import Logo from "./Logo";

import { FaGithub, FaReact } from "react-icons/fa";

import { SiFastapi, SiMongodb, SiTailwindcss } from "react-icons/si";

const Footer = () => {
  return (
    <footer
      className="
        mt-16

        border-t
        border-slate-200

        bg-slate-50

        dark:border-slate-800
        dark:bg-slate-950
      "
    >
      <div
        className="
          mx-auto
          grid
          max-w-7xl

          gap-10

          px-6
          py-10

          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        {/* Brand */}

        <div
          className="
            space-y-4
          "
        >
          <Logo />

          <p
            className="
              text-sm
              leading-6

              text-slate-600

              dark:text-slate-400
            "
          >
            A modern travel application built with the FARM stack.
          </p>
        </div>

        {/* Navigation */}

        <div>
          <h3
            className="
              mb-4
              font-semibold

              text-slate-900

              dark:text-white
            "
          >
            Navigation
          </h3>

          <ul
            className="
              space-y-3
              text-sm
            "
          >
            <li>
              <Link
                to="/"
                className="
                  text-slate-600
                  hover:text-blue-600

                  dark:text-slate-400
                "
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                to="/create"
                className="
                  text-slate-600
                  hover:text-blue-600

                  dark:text-slate-400
                "
              >
                Create Destination
              </Link>
            </li>
          </ul>
        </div>

        {/* Tech Stack */}

        <div>
          <h3
            className="
              mb-4
              font-semibold

              text-slate-900

              dark:text-white
            "
          >
            Tech Stack
          </h3>

          <div
            className="
              flex
              flex-wrap
              gap-3
            "
          >
            <span
              className="
                flex
                items-center
                gap-2

                rounded-lg

                bg-white

                px-3
                py-2

                text-sm

                shadow-sm

                dark:bg-slate-900
              "
            >
              <FaReact />
              React
            </span>

            <span
              className="
                flex
                items-center
                gap-2

                rounded-lg

                bg-white

                px-3
                py-2

                text-sm

                shadow-sm

                dark:bg-slate-900
              "
            >
              <SiFastapi />
              FastAPI
            </span>

            <span
              className="
                flex
                items-center
                gap-2

                rounded-lg

                bg-white

                px-3
                py-2

                text-sm

                shadow-sm

                dark:bg-slate-900
              "
            >
              <SiMongodb />
              MongoDB
            </span>

            <span
              className="
                flex
                items-center
                gap-2

                rounded-lg

                bg-white

                px-3
                py-2

                text-sm

                shadow-sm

                dark:bg-slate-900
              "
            >
              <SiTailwindcss />
              Tailwind
            </span>
          </div>
        </div>

        {/* Links */}

        <div>
          <h3
            className="
              mb-4
              font-semibold

              text-slate-900

              dark:text-white
            "
          >
            Links
          </h3>

          <a
            href="#"
            className="
              flex
              items-center
              gap-2

              text-sm

              text-slate-600

              hover:text-blue-600

              dark:text-slate-400
            "
          >
            <FaGithub />
            GitHub
          </a>
        </div>
      </div>

      {/* Bottom */}

      <div
        className="
          border-t
          border-slate-200

          py-5

          text-center

          text-sm

          text-slate-500

          dark:border-slate-800
          dark:text-slate-400
        "
      >
        © {new Date().getFullYear()} LD FARM Stack. Built with FastAPI, MongoDB
        and React.
      </div>
    </footer>
  );
};

export default Footer;
