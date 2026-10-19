import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  clearStoredAuthToken,
  getStoredAuthToken,
  setAuthErrorHandler,
  setStoredAuthToken,
} from "../api/axiosClient";
import { getCurrentUser, loginUser, registerUser } from "../api/authApi";
import { AuthContext } from "./AuthContext";
import { canPublish } from "../utils/permissions";

import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
      throw new Error("Unable to refresh authenticated user");
    }
  }, [logout]);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredAuthToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, [logout]);

  useEffect(() => {
    setAuthErrorHandler((status) => {
      if (status === 401) {
        const hadToken = Boolean(getStoredAuthToken());

        logout();

        if (hadToken) {
          toast.error("Your session has expired. Please sign in again.");
        }

        if (location.pathname !== "/login" && location.pathname !== "/register") {
          navigate("/login", {
            replace: true,
            state: {
              from: location,
            },
          });
        }

        return;
      }

      toast.error("You do not have permission to perform this action.");
    });

    return () => {
      setAuthErrorHandler(null);
    };
  }, [location, logout, navigate]);

  const login = async (payload: LoginPayload) => {
    const tokenResponse = await loginUser(payload);

    setStoredAuthToken(tokenResponse.access_token);

    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const register = async (payload: RegisterPayload) => {
    await registerUser(payload);
    await login(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin",
        canPublish: canPublish(user),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
