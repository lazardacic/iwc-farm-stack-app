import { Link } from "react-router-dom";

import Button from "../components/ui/Button";

const NotFound = () => {
  return (
    <section
      className="
        flex
        min-h-[60vh]
        items-center
        justify-center

        px-6
        text-center
      "
    >
      <div>
        <h1
          className="
            text-7xl
            font-bold

            text-blue-600
          "
        >
          404
        </h1>

        <h2
          className="
            mt-4

            text-2xl
            font-bold

            text-slate-900

            dark:text-white
          "
        >
          Page not found
        </h2>

        <p
          className="
            mt-3

            text-slate-600

            dark:text-slate-400
          "
        >
          The page you are looking for does not exist.
        </p>

        <div className="mt-6">
          <Link to="/">
            <Button>Back home</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
