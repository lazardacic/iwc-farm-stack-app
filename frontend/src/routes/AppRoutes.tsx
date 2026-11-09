import { lazy } from "react";
import { Routes, Route } from "react-router-dom";

import GuestRoute from "../components/auth/GuestRoute";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";

import Home from "../pages/Home";
import { PUBLISHER_ROLES } from "../utils/permissions";

// Home is the landing page, so it ships in the main bundle. Every other page
// is a separate chunk that the browser downloads the first time it is opened.
// MainLayout wraps the outlet in <Suspense>, so the navbar stays visible while
// a chunk loads.
const AdminUsers = lazy(() => import("../pages/AdminUsers"));
const CreateDestination = lazy(() => import("../pages/CreateDestination"));
const DestinationDetails = lazy(() => import("../pages/DestinationDetails"));
const EditDestination = lazy(() => import("../pages/EditDestination"));
const Login = lazy(() => import("../pages/Login"));
const MyDestinations = lazy(() => import("../pages/MyDestinations"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Register = lazy(() => import("../pages/Register"));
const Welcome = lazy(() => import("../pages/Welcome"));

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />

        <Route path="/destination/:key" element={<DestinationDetails />} />

        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/welcome" element={<Welcome />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={PUBLISHER_ROLES} />}>
          <Route path="/create" element={<CreateDestination />} />
          <Route path="/my-destinations" element={<MyDestinations />} />
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
