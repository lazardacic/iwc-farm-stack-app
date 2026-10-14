import { Navigate, Outlet } from "react-router-dom";

import Loader from "../ui/Loader";

import { useAuth } from "../../hooks/useAuth";

const GuestRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader text="Loading authentication..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
