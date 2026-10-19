import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import ProtectedRoute from "./ProtectedRoute";
import type { UserRole } from "../../types/auth";

const useAuthMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

const signedInAs = (role: UserRole) => ({
  isAuthenticated: true,
  isLoading: false,
  user: { id: "1", email: `${role}@example.com`, role },
});

const renderProtectedRoute = (allowedRoles?: UserRole[]) => {
  return render(
    <MemoryRouter initialEntries={["/create"]}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/create" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/welcome" element={<div>Welcome page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  it("shows a loader while auth is loading", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    renderProtectedRoute();

    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderProtectedRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders protected content for any signed-in role when no roles are required", () => {
    useAuthMock.mockReturnValue(signedInAs("subscriber"));

    renderProtectedRoute();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it.each<UserRole>(["admin", "editor"])(
    "lets %s into publisher routes",
    (role) => {
      useAuthMock.mockReturnValue(signedInAs(role));

      renderProtectedRoute(["admin", "editor"]);

      expect(screen.getByText("Protected content")).toBeInTheDocument();
    },
  );

  it("sends subscribers from publisher routes to the welcome page", () => {
    useAuthMock.mockReturnValue(signedInAs("subscriber"));

    renderProtectedRoute(["admin", "editor"]);

    expect(screen.getByText("Welcome page")).toBeInTheDocument();
  });

  it("keeps editors out of admin-only routes", () => {
    useAuthMock.mockReturnValue(signedInAs("editor"));

    renderProtectedRoute(["admin"]);

    expect(screen.getByText("Welcome page")).toBeInTheDocument();
  });
});
