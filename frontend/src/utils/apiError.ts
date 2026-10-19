import axios from "axios";

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail) {
      return detail;
    }
  }

  return fallback;
};
