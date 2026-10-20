import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuthStore } from "../../store/authStore";

const GUEST_PATHS = ["/login", "/register"];

// Restores the session on load and handles a session that expires mid-use.
const AuthSession = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const acknowledgeSessionExpired = useAuthStore(
    (state) => state.acknowledgeSessionExpired,
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!sessionExpired) {
      return;
    }

    acknowledgeSessionExpired();
    toast.error("Your session has expired. Please sign in again.");

    if (!GUEST_PATHS.includes(location.pathname)) {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [sessionExpired, acknowledgeSessionExpired, location, navigate]);

  return null;
};

export default AuthSession;
