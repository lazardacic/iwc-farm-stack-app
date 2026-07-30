import { Routes, Route } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";

import Home from "../pages/Home";
import DestinationDetails from "../pages/DestinationDetails";
import CreateDestination from "../pages/CreateDestination";
import EditDestination from "../pages/EditDestination";
import NotFound from "../pages/NotFound";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/destination/:id" element={<DestinationDetails />} />

        <Route path="/create" element={<CreateDestination />} />

        <Route path="/edit/:id" element={<EditDestination />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
