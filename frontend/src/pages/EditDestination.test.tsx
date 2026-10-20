import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import EditDestination from "./EditDestination";
import LocationProbe from "../test/LocationProbe";
import type { AuthUser } from "../types/auth";
import type { Destination } from "../types/destination";

const getDestinationMock = vi.fn();
const updateDestinationMock = vi.fn();
const useAuthMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("../api/destinationsApi", () => ({
  getDestination: (id: string) => getDestinationMock(id),
  updateDestination: (id: string, data: unknown) => updateDestinationMock(id, data),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (message: string) => toastSuccessMock(message),
    error: (message: string) => toastErrorMock(message),
  },
}));

const destination: Destination = {
  id: "d1",
  title: "Kyoto in Autumn",
  country: "Japan",
  description: "Temples, red maples and quiet gardens in the morning light.",
  price: 2100,
  rating: 4.9,
  image: "/placeholders/mountains.svg",
  tags: ["culture"],
  featured: true,
  created_by: "editor-1",
};

const signedInAs = (user: AuthUser) => useAuthMock.mockReturnValue({ user });

const renderEdit = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/edit/d1"]}>
        <Routes>
          <Route path="/edit/:id" element={<EditDestination />} />
          <Route path="*" element={<div>Other page</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("EditDestination", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getDestinationMock.mockResolvedValue(destination);
  });

  it("prefills the form with the stored destination", async () => {
    signedInAs({ id: "editor-1", email: "editor@example.com", role: "editor" });

    renderEdit();

    expect(await screen.findByLabelText("Title")).toHaveValue("Kyoto in Autumn");
    expect(screen.getByLabelText("Price")).toHaveValue(2100);
    expect(getDestinationMock).toHaveBeenCalledWith("d1");
  });

  it("saves changes, keeps featured and tags, and opens the destination", async () => {
    signedInAs({ id: "editor-1", email: "editor@example.com", role: "editor" });
    updateDestinationMock.mockResolvedValue({ ...destination, title: "Kyoto in Spring" });

    renderEdit();
    fireEvent.change(await screen.findByLabelText("Title"), {
      target: { value: "Kyoto in Spring" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateDestinationMock).toHaveBeenCalledWith(
        "d1",
        expect.objectContaining({ title: "Kyoto in Spring", featured: true, tags: ["culture"] }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/destination/d1"),
    );
    expect(toastSuccessMock).toHaveBeenCalledWith("Destination updated successfully");
  });

  it("stays on the form and reports a failed save", async () => {
    signedInAs({ id: "editor-1", email: "editor@example.com", role: "editor" });
    updateDestinationMock.mockRejectedValue(new Error("Server error"));

    renderEdit();
    fireEvent.click(await screen.findByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Unable to update destination"),
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/edit/d1");
  });

  it("explains that editors cannot edit someone else's destination", async () => {
    signedInAs({ id: "editor-2", email: "other@example.com", role: "editor" });

    renderEdit();

    expect(await screen.findByText("You cannot edit this destination")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
  });

  it("lets an admin edit any destination", async () => {
    signedInAs({ id: "admin-1", email: "admin@example.com", role: "admin" });

    renderEdit();

    expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("shows a not found state", async () => {
    signedInAs({ id: "editor-1", email: "editor@example.com", role: "editor" });
    getDestinationMock.mockRejectedValue(new Error("404"));

    renderEdit();

    expect(await screen.findByText("Destination not found")).toBeInTheDocument();
  });
});
