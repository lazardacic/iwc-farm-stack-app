import { Routes, Route } from "react-router-dom";

import GuestRoute from "../components/auth/GuestRoute";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";

import AdminUsers from "../pages/AdminUsers";
import Home from "../pages/Home";
import DestinationDetails from "../pages/DestinationDetails";
import CreateDestination from "../pages/CreateDestination";
import EditDestination from "../pages/EditDestination";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import Register from "../pages/Register";
import Welcome from "../pages/Welcome";
import { PUBLISHER_ROLES } from "../utils/permissions";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/destination/:id" element={<DestinationDetails />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/welcome" element={<Welcome />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={PUBLISHER_ROLES} />}>
          <Route path="/create" element={<CreateDestination />} />
          <Route path="/edit/:id" element={<EditDestination />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/users" element={<AdminUsers />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
