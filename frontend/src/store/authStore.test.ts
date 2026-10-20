import { vi } from "vitest";

import { useAuthStore } from "./authStore";

const loginUserMock = vi.fn();
const registerUserMock = vi.fn();
const refreshSessionMock = vi.fn();
const logoutSessionMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("../api/authApi", () => ({
  loginUser: (payload: unknown) => loginUserMock(payload),
  registerUser: (payload: unknown) => registerUserMock(payload),
  refreshSession: () => refreshSessionMock(),
  logoutSession: () => logoutSessionMock(),
  getCurrentUser: (token: string) => getCurrentUserMock(token),
}));

const editor = { id: "e1", email: "editor@example.com", role: "editor" as const };
const credentials = { email: "editor@example.com", password: "password123" };

describe("authStore", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    window.localStorage.clear();
  });

  it("restores the session from the refresh cookie on load", async () => {
    refreshSessionMock.mockResolvedValue({ access_token: "access-1" });
    getCurrentUserMock.mockResolvedValue(editor);

    await useAuthStore.getState().initialize();

    expect(getCurrentUserMock).toHaveBeenCalledWith("access-1");
    expect(useAuthStore.getState()).toMatchObject({
      user: editor,
      accessToken: "access-1",
      status: "authenticated",
    });
  });

  it("starts signed out when there is no valid refresh cookie", async () => {
    refreshSessionMock.mockRejectedValue(new Error("401"));

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      status: "anonymous",
      sessionExpired: false,
    });
  });

  it("initializes only once", async () => {
    refreshSessionMock.mockResolvedValue({ access_token: "access-1" });
    getCurrentUserMock.mockResolvedValue(editor);

    await Promise.all([
      useAuthStore.getState().initialize(),
      useAuthStore.getState().initialize(),
    ]);

    expect(refreshSessionMock).toHaveBeenCalledOnce();
  });

  it("removes a token left in localStorage by older versions", async () => {
    window.localStorage.setItem("auth_token", "old-token");
    refreshSessionMock.mockRejectedValue(new Error("401"));

    await useAuthStore.getState().initialize();

    expect(window.localStorage.getItem("auth_token")).toBeNull();
  });

  it("logs in and keeps the access token in memory only", async () => {
    loginUserMock.mockResolvedValue({ access_token: "access-2" });
    getCurrentUserMock.mockResolvedValue(editor);

    await useAuthStore.getState().login(credentials);

    expect(useAuthStore.getState()).toMatchObject({
      user: editor,
      accessToken: "access-2",
      status: "authenticated",
    });
    expect(window.localStorage.length).toBe(0);
  });

  it("registers and then logs in", async () => {
    registerUserMock.mockResolvedValue(editor);
    loginUserMock.mockResolvedValue({ access_token: "access-3" });
    getCurrentUserMock.mockResolvedValue(editor);

    await useAuthStore.getState().register(credentials);

    expect(registerUserMock).toHaveBeenCalledWith(credentials);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("logs out on the server and clears local state", async () => {
    useAuthStore.setState({ user: editor, accessToken: "a", status: "authenticated" });
    logoutSessionMock.mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(logoutSessionMock).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null });
  });

  it("clears local state even when the logout request fails", async () => {
    useAuthStore.setState({ user: editor, accessToken: "a", status: "authenticated" });
    logoutSessionMock.mockRejectedValue(new Error("offline"));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("shares one refresh request between concurrent callers", async () => {
    let resolve: (value: { access_token: string }) => void = () => {};
    refreshSessionMock.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );

    const first = useAuthStore.getState().refresh();
    const second = useAuthStore.getState().refresh();
    resolve({ access_token: "fresh" });

    await expect(Promise.all([first, second])).resolves.toEqual(["fresh", "fresh"]);
    expect(refreshSessionMock).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().accessToken).toBe("fresh");
  });

  it("marks the session expired", () => {
    useAuthStore.setState({ user: editor, accessToken: "a", status: "authenticated" });

    useAuthStore.getState().expireSession();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      accessToken: null,
      status: "anonymous",
      sessionExpired: true,
    });
  });
});
