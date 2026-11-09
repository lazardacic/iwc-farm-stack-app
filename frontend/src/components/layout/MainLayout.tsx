import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";
import Loader from "../ui/Loader";

const MainLayout = () => {
  return (
    <div
      className="
      flex
      min-h-screen
      flex-col
      bg-slate-50
      text-slate-900

      dark:bg-slate-950
      dark:text-white
      "
    >
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<Loader text="Loading page..." />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
