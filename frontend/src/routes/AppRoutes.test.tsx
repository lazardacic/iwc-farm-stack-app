import { screen } from "@testing-library/react";
import { vi } from "vitest";

import AppRoutes from "./AppRoutes";
import { renderWithProviders } from "../test/renderWithProviders";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isAdmin: false,
    canPublish: false,
    logout: vi.fn(),
    login: vi.fn(),
  }),
}));

vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../api/destinationsApi", () => ({
  getAllDestinations: () => new Promise(() => {}),
  getDestinationCountries: () => Promise.resolve([]),
  getPinnedDestinations: () => Promise.resolve([]),
}));

describe("AppRoutes", () => {
  it("loads a lazy page while the layout stays on screen", async () => {
    renderWithProviders(<AppRoutes />, { route: "/no-such-page" });

    // The navbar is part of the main bundle, so it renders right away.
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    // The 404 page is a separate chunk and appears once it has loaded.
    expect(await screen.findByText("404")).toBeInTheDocument();
  });

  it("loads the login page for guests", async () => {
    renderWithProviders(<AppRoutes />, { route: "/login" });

    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
