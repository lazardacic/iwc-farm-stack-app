import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import { vi } from "vitest";

import axiosClient from "./axiosClient";
import { useAuthStore } from "../store/authStore";

const refreshSessionMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("./authApi", () => ({
  API_URL: "http://api.test",
  refreshSession: () => refreshSessionMock(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: (message: string) => toastErrorMock(message) },
}));

const editor = { id: "e1", email: "editor@example.com", role: "editor" as const };

// A fake network layer: answers by the Authorization header the request carries.
const respond =
  (handler: (config: InternalAxiosRequestConfig) => number): AxiosAdapter =>
  async (config) => {
    const status = handler(config);
    const response = {
      data: { ok: status < 400 },
      status,
      statusText: "",
      headers: {},
      config,
    };

    if (status >= 400) {
      throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, response);
    }

    return response;
  };

const authorization = (config: InternalAxiosRequestConfig) =>
  AxiosHeaders.from(config.headers).get("Authorization");

describe("axiosClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it("sends the in-memory access token", async () => {
    useAuthStore.setState({ user: editor, accessToken: "access-1" });
    const seen: unknown[] = [];

    await axiosClient.get("/destinations/", {
      adapter: respond((config) => {
        seen.push(authorization(config));
        return 200;
      }),
    });

    expect(seen).toEqual(["Bearer access-1"]);
  });

  it("refreshes once for concurrent 401s and retries every request", async () => {
    useAuthStore.setState({ user: editor, accessToken: "expired" });
    refreshSessionMock.mockResolvedValue({ access_token: "fresh" });
    const adapter = respond((config) =>
      authorization(config) === "Bearer fresh" ? 200 : 401,
    );

    const results = await Promise.all([
      axiosClient.get("/a", { adapter }),
      axiosClient.get("/b", { adapter }),
      axiosClient.get("/c", { adapter }),
    ]);

    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect(refreshSessionMock).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().accessToken).toBe("fresh");
  });

  it("expires the session when the refresh fails", async () => {
    useAuthStore.setState({ user: editor, accessToken: "expired", status: "authenticated" });
    refreshSessionMock.mockRejectedValue(new Error("refresh token revoked"));

    await expect(
      axiosClient.get("/destinations/", { adapter: respond(() => 401) }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      sessionExpired: true,
    });
  });

  it("retries only once when the new token is rejected too", async () => {
    useAuthStore.setState({ user: editor, accessToken: "expired" });
    refreshSessionMock.mockResolvedValue({ access_token: "fresh" });
    let calls = 0;

    await expect(
      axiosClient.get("/destinations/", {
        adapter: respond(() => {
          calls += 1;
          return 401;
        }),
      }),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(calls).toBe(2);
    expect(refreshSessionMock).toHaveBeenCalledOnce();
  });

  it("does not refresh for anonymous requests", async () => {
    await expect(
      axiosClient.post("/destinations/", {}, { adapter: respond(() => 401) }),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it("shows a message on 403 without signing out", async () => {
    useAuthStore.setState({ user: editor, accessToken: "access-1" });

    await expect(
      axiosClient.delete("/destinations/1", { adapter: respond(() => 403) }),
    ).rejects.toBeInstanceOf(AxiosError);

    expect(toastErrorMock).toHaveBeenCalledWith(
      "You do not have permission to perform this action.",
    );
    expect(useAuthStore.getState().user).toEqual(editor);
  });
});
