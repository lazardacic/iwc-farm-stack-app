import axios from "axios";

import type {
  AuthTokenResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../types/auth";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Auth calls use their own client without the refresh interceptor, so a failed
// refresh can never trigger another refresh. withCredentials sends the httpOnly
// refresh cookie, which only the /auth endpoints receive.
const authClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const registerUser = async (
  payload: RegisterPayload,
): Promise<AuthUser> => {
  const response = await authClient.post("/auth/register", payload);
  return response.data;
};

export const loginUser = async (
  payload: LoginPayload,
): Promise<AuthTokenResponse> => {
  const response = await authClient.post("/auth/login", payload);
  return response.data;
};

export const refreshSession = async (): Promise<AuthTokenResponse> => {
  const response = await authClient.post("/auth/refresh");
  return response.data;
};

export const logoutSession = async (): Promise<void> => {
  await authClient.post("/auth/logout");
};

export const getCurrentUser = async (accessToken: string): Promise<AuthUser> => {
  const response = await authClient.get("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};
