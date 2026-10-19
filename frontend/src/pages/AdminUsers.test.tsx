import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { vi } from "vitest";

import AdminUsers from "./AdminUsers";
import { renderWithProviders } from "../test/renderWithProviders";

const getUsersMock = vi.fn();
const updateUserRoleMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("../api/usersApi", () => ({
  getUsers: (params: unknown) => getUsersMock(params),
  updateUserRole: (id: string, role: string) => updateUserRoleMock(id, role),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@example.com", role: "admin" },
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (message: string) => toastSuccessMock(message),
    error: (message: string) => toastErrorMock(message),
  },
}));

const usersPage = {
  items: [
    { id: "admin-1", email: "admin@example.com", role: "admin" },
    { id: "user-1", email: "user@example.com", role: "user" },
  ],
  total: 2,
  page: 1,
  page_size: 20,
  pages: 1,
};

const apiError = (status: number, detail: string) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    statusText: "",
    data: { detail },
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("AdminUsers", () => {
  beforeEach(() => {
    getUsersMock.mockReset();
    updateUserRoleMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    getUsersMock.mockResolvedValue(usersPage);
  });

  it("lists users and locks the current admin's own role", async () => {
    renderWithProviders(<AdminUsers />);

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getByLabelText("Role for admin@example.com")).toBeDisabled();
    expect(screen.getByLabelText("Role for user@example.com")).toBeEnabled();
  });

  it("changes a user's role and refreshes the list", async () => {
    updateUserRoleMock.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      role: "admin",
    });

    renderWithProviders(<AdminUsers />);

    fireEvent.change(await screen.findByLabelText("Role for user@example.com"), {
      target: { value: "admin" },
    });

    await waitFor(() =>
      expect(updateUserRoleMock).toHaveBeenCalledWith("user-1", "admin"),
    );
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        "user@example.com is now admin",
      ),
    );
    await waitFor(() => expect(getUsersMock).toHaveBeenCalledTimes(2));
  });

  it("shows the API error message when the change is rejected", async () => {
    updateUserRoleMock.mockRejectedValue(
      apiError(400, "You cannot change your own role"),
    );

    renderWithProviders(<AdminUsers />);

    fireEvent.change(await screen.findByLabelText("Role for user@example.com"), {
      target: { value: "admin" },
    });

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "You cannot change your own role",
      ),
    );
  });

  it("searches users by email from the first page", async () => {
    renderWithProviders(<AdminUsers />);
    await screen.findByText("user@example.com");

    fireEvent.change(screen.getByPlaceholderText("Search by email..."), {
      target: { value: "user" },
    });

    await waitFor(() =>
      expect(getUsersMock).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        search: "user",
      }),
    );
  });

  it("shows an empty state when no users match", async () => {
    getUsersMock.mockResolvedValue({ ...usersPage, items: [], total: 0, pages: 0 });

    renderWithProviders(<AdminUsers />);

    expect(await screen.findByText("No users found")).toBeInTheDocument();
  });
});
