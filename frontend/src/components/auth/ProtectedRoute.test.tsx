import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import ProtectedRoute from "./ProtectedRoute";

const useAuthMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

const renderProtectedRoute = (requireAdmin = false) => {
  return render(
    <MemoryRouter initialEntries={["/create"]}>
      <Routes>
        <Route element={<ProtectedRoute requireAdmin={requireAdmin} />}>
          <Route path="/create" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  it("shows a loader while auth is loading", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isLoading: true,
    });

    renderProtectedRoute();

    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects non-admin users away from admin-only routes", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
      isLoading: false,
    });

    renderProtectedRoute(true);

    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
