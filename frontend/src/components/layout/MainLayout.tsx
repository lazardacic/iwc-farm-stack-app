import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";
import Footer from "./Footer";

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
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
