import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

import DestinationDetails from "./DestinationDetails";
import type { AuthUser } from "../types/auth";
import type { Destination } from "../types/destination";

const getDestinationMock = vi.fn();
const setDestinationFeaturedMock = vi.fn();
const setDestinationPinnedMock = vi.fn();
const useAuthMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("../api/destinationsApi", () => ({
  getDestination: (id: string) => getDestinationMock(id),
  setDestinationFeatured: (id: string, featured: boolean) =>
    setDestinationFeaturedMock(id, featured),
  setDestinationPinned: (id: string, pinned: boolean) => setDestinationPinnedMock(id, pinned),
  deleteDestination: vi.fn(),
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
  description: "Temples and red maples.\n\nQuiet gardens in the morning.",
  price: 2100,
  rating: 4.9,
  image: "/placeholders/mountains.svg",
  tags: ["culture", "nature"],
  featured: false,
  created_by: "editor-1",
};

const signedInAs = (user: AuthUser | null) => {
  useAuthMock.mockReturnValue({
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    canPublish: user?.role === "admin" || user?.role === "editor",
  });
};

const renderDetails = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/destination/d1"]}>
        <Routes>
          <Route path="/destination/:id" element={<DestinationDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("DestinationDetails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getDestinationMock.mockResolvedValue(destination);
  });

  it("reads like an article: title, meta, paragraphs and tags", async () => {
    signedInAs(null);

    renderDetails();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Kyoto in Autumn" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Temples and red maples.")).toBeInTheDocument();
    expect(screen.getByText("Quiet gardens in the morning.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Tags" })).toHaveTextContent("#culture");
    expect(screen.getByText("$2,100")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("lets the owning editor edit but not delete or feature", async () => {
    signedInAs({ id: "editor-1", email: "editor@example.com", role: "editor" });

    renderDetails();

    expect(await screen.findByRole("button", { name: /Edit destination/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark as featured/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pin to home slider/ })).not.toBeInTheDocument();
  });

  it("hides edit from other editors", async () => {
    signedInAs({ id: "editor-2", email: "other@example.com", role: "editor" });

    renderDetails();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Kyoto in Autumn" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("lets an admin mark the destination as featured, with no limit", async () => {
    signedInAs({ id: "admin-1", email: "admin@example.com", role: "admin" });
    setDestinationFeaturedMock.mockResolvedValue({ ...destination, featured: true });
    // After the change, a refetch returns the stored, featured version.
    getDestinationMock
      .mockResolvedValueOnce(destination)
      .mockResolvedValue({ ...destination, featured: true });

    renderDetails();
    fireEvent.click(await screen.findByRole("button", { name: /Mark as featured/ }));

    await waitFor(() => expect(setDestinationFeaturedMock).toHaveBeenCalledWith("d1", true));
    expect(await screen.findByRole("button", { name: /Remove featured mark/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pin to home slider/ })).toBeInTheDocument();
    expect(setDestinationPinnedMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Marked as featured");
  });

  it("lets an admin pin the destination to the home slider", async () => {
    signedInAs({ id: "admin-1", email: "admin@example.com", role: "admin" });
    setDestinationPinnedMock.mockResolvedValue({ ...destination, pinned: true });
    getDestinationMock
      .mockResolvedValueOnce(destination)
      .mockResolvedValue({ ...destination, pinned: true });

    renderDetails();
    fireEvent.click(await screen.findByRole("button", { name: /Pin to home slider/ }));

    await waitFor(() => expect(setDestinationPinnedMock).toHaveBeenCalledWith("d1", true));
    expect(await screen.findByRole("button", { name: /Unpin from home slider/ })).toBeInTheDocument();
    expect(screen.getByText("Pinned")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark as featured/ })).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith("Pinned to the home page slider");
  });

  it("explains when the slider already has 5 destinations", async () => {
    signedInAs({ id: "admin-1", email: "admin@example.com", role: "admin" });
    setDestinationPinnedMock.mockRejectedValue(
      new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        statusText: "",
        data: {
          detail: "Only 5 destinations can be pinned to the home page. Unpin one first.",
        },
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );

    renderDetails();
    fireEvent.click(await screen.findByRole("button", { name: /Pin to home slider/ }));

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Only 5 destinations can be pinned to the home page. Unpin one first.",
      ),
    );
  });

  it("does not show the pinned label to visitors", async () => {
    signedInAs(null);
    getDestinationMock.mockResolvedValue({ ...destination, pinned: true });

    renderDetails();

    await screen.findByRole("heading", { level: 1, name: "Kyoto in Autumn" });
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
  });

  it("shows a not found state", async () => {
    signedInAs(null);
    getDestinationMock.mockRejectedValue(new Error("404"));

    renderDetails();

    expect(await screen.findByText("Destination not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all destinations" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
