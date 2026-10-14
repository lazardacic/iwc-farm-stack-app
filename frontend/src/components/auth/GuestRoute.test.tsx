import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import GuestRoute from "./GuestRoute";

const useAuthMock = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

const renderGuestRoute = () => {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<div>Guest page</div>} />
        </Route>
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("GuestRoute", () => {
  it("shows a loader while auth is loading", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    renderGuestRoute();

    expect(screen.getByText("Loading authentication...")).toBeInTheDocument();
  });

  it("renders guest content for signed-out users", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderGuestRoute();

    expect(screen.getByText("Guest page")).toBeInTheDocument();
  });

  it("redirects authenticated users to home", () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    renderGuestRoute();

    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
