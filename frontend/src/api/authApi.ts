import axiosClient from "./axiosClient";
import type {
  AuthTokenResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../types/auth";

export const registerUser = async (
  payload: RegisterPayload,
): Promise<AuthUser> => {
  const response = await axiosClient.post("/auth/register", payload);
  return response.data;
};

export const loginUser = async (
  payload: LoginPayload,
): Promise<AuthTokenResponse> => {
  const response = await axiosClient.post("/auth/login", payload);
  return response.data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await axiosClient.get("/auth/me");
  return response.data;
};
