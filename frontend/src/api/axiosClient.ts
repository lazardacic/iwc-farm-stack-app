import axios from "axios";

const AUTH_TOKEN_KEY = "auth_token";

type AuthErrorStatus = 401 | 403;

let authErrorHandler: ((status: AuthErrorStatus) => void) | null = null;

const axiosClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getStoredAuthToken = () => {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setStoredAuthToken = (token: string) => {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearStoredAuthToken = () => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const setAuthErrorHandler = (
  handler: ((status: AuthErrorStatus) => void) | null,
) => {
  authErrorHandler = handler;
};

export const isAuthStatusError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return error.response?.status === 401 || error.response?.status === 403;
};

axiosClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        authErrorHandler?.(status);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
