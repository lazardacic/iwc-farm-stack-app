import { create } from "zustand";

import {
  getCurrentUser,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
} from "../api/authApi";
import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";

// Tokens used to live in localStorage; remove what older versions left behind.
const LEGACY_TOKEN_KEY = "auth_token";

export type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous";

interface AuthState {
  user: AuthUser | null;
  // Kept only in memory: scripts on the page cannot read it from storage, and
  // a reload restores the session from the httpOnly refresh cookie instead.
  accessToken: string | null;
  status: AuthStatus;
  // Set when a refresh fails mid-session; AuthSession shows a message and redirects.
  sessionExpired: boolean;

  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string>;
  refreshUser: () => Promise<void>;
  expireSession: () => void;
  acknowledgeSessionExpired: () => void;
}

const signedOut = {
  user: null,
  accessToken: null,
  status: "anonymous" as const,
};

// Requests that fail together share one refresh call instead of each starting one.
let pendingRefresh: Promise<string> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  status: "idle",
  sessionExpired: false,

  initialize: async () => {
    if (get().status !== "idle") {
      return;
    }

    set({ status: "loading" });

    try {
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // Storage can be unavailable (private mode); nothing to clean up then.
    }

    try {
      const accessToken = await get().refresh();
      const user = await getCurrentUser(accessToken);
      set({ user, accessToken, status: "authenticated" });
    } catch {
      set(signedOut);
    }
  },

  login: async (payload) => {
    const { access_token: accessToken } = await loginUser(payload);
    const user = await getCurrentUser(accessToken);
    set({ user, accessToken, status: "authenticated", sessionExpired: false });
  },

  register: async (payload) => {
    await registerUser(payload);
    await get().login(payload);
  },

  logout: async () => {
    try {
      await logoutSession();
    } catch {
      // Sign out locally even if the server is unreachable.
    } finally {
      set(signedOut);
    }
  },

  refresh: () => {
    pendingRefresh ??= refreshSession()
      .then(({ access_token: accessToken }) => {
        set({ accessToken });
        return accessToken;
      })
      .finally(() => {
        pendingRefresh = null;
      });

    return pendingRefresh;
  },

  refreshUser: async () => {
    const accessToken = get().accessToken;

    if (!accessToken) {
      return;
    }

    set({ user: await getCurrentUser(accessToken) });
  },

  expireSession: () => {
    set({ ...signedOut, sessionExpired: true });
  },

  acknowledgeSessionExpired: () => {
    set({ sessionExpired: false });
  },
}));
