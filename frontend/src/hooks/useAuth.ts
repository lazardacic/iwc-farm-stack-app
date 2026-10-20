import { useShallow } from "zustand/react/shallow";

import { useAuthStore } from "../store/authStore";
import { canPublish } from "../utils/permissions";

// Same shape the app used with the old AuthContext, so pages did not change.
export const useAuth = () => {
  const { user, status, login, register, logout, refreshUser } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      status: state.status,
      login: state.login,
      register: state.register,
      logout: state.logout,
      refreshUser: state.refreshUser,
    })),
  );

  return {
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    canPublish: canPublish(user),
    isLoading: status === "idle" || status === "loading",
    login,
    register,
    logout,
    refreshUser,
  };
};
