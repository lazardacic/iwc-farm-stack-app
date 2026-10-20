import axios, { type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";

import { API_URL } from "./authApi";
import { useAuthStore } from "../store/authStore";

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

const axiosClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const isAuthStatusError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
};

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const request = error.config as RetriableRequestConfig | undefined;
    const auth = useAuthStore.getState();

    // An expired access token: get a new one once, then repeat the request.
    // Anonymous requests have nothing to refresh and fail as they are.
    if (status === 401 && request && !request._retried && auth.accessToken) {
      request._retried = true;

      try {
        const token = await auth.refresh();
        request.headers.Authorization = `Bearer ${token}`;
        return axiosClient(request);
      } catch {
        useAuthStore.getState().expireSession();
        return Promise.reject(error);
      }
    }

    if (status === 403) {
      toast.error("You do not have permission to perform this action.");
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
