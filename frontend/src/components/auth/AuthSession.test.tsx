import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import AuthSession from "./AuthSession";
import LocationProbe from "../../test/LocationProbe";
import { useAuthStore } from "../../store/authStore";

const toastErrorMock = vi.fn();
const initializeMock = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: { error: (message: string) => toastErrorMock(message) },
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthSession />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AuthSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.setState(
      { ...useAuthStore.getInitialState(), initialize: initializeMock },
      true,
    );
  });

  it("restores the session when the app loads", () => {
    renderAt("/");

    expect(initializeMock).toHaveBeenCalledOnce();
  });

  it("sends the user to login when the session expires", async () => {
    renderAt("/create");

    act(() => useAuthStore.getState().expireSession());

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/login"),
    );
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
    );
    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });

  it("stays on the login page when it is already open", async () => {
    renderAt("/login");

    act(() => useAuthStore.getState().expireSession());

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledOnce());
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
