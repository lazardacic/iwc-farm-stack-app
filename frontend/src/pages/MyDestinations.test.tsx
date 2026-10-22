import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import MyDestinations from "./MyDestinations";
import { renderWithProviders } from "../test/renderWithProviders";
import type { Destination } from "../types/destination";

const getAllDestinationsMock = vi.fn();

vi.mock("../api/destinationsApi", () => ({
  getAllDestinations: (params: unknown) => getAllDestinationsMock(params),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "editor-1", email: "editor@example.com", role: "editor" },
  }),
}));

const destination: Destination = {
  id: "d1",
  title: "My Lisbon Guide",
  slug: "my-lisbon-guide",
  country: "Portugal",
  description: "Trams, tiles and pastel de nata.",
  price: 900,
  rating: 4.6,
  image: "/placeholders/city.svg",
  tags: [],
  featured: false,
  created_by: "editor-1",
};

describe("MyDestinations", () => {
  beforeEach(() => {
    getAllDestinationsMock.mockReset();
  });

  it("requests only the user's destinations, newest first", async () => {
    getAllDestinationsMock.mockResolvedValue({
      items: [destination],
      total: 1,
      page: 1,
      page_size: 9,
      pages: 1,
    });

    renderWithProviders(<MyDestinations />, { route: "/my-destinations" });

    expect(await screen.findByText("My Lisbon Guide")).toBeInTheDocument();
    expect(getAllDestinationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ mine: true, sort: "newest", page: 1 }),
    );
    expect(screen.getByText("You have published 1 destination.")).toBeInTheDocument();
  });

  it("invites the user to create a first destination", async () => {
    getAllDestinationsMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 9,
      pages: 0,
    });

    renderWithProviders(<MyDestinations />, { route: "/my-destinations" });

    expect(
      await screen.findByText("You have not published any destinations yet"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Create destination" }).at(-1)).toHaveAttribute(
      "href",
      "/create",
    );
  });

  it("keeps the page in the URL", async () => {
    getAllDestinationsMock.mockResolvedValue({
      items: [destination],
      total: 12,
      page: 1,
      page_size: 9,
      pages: 2,
    });

    renderWithProviders(<MyDestinations />, { route: "/my-destinations" });

    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/my-destinations?page=2"),
    );
    await waitFor(() =>
      expect(getAllDestinationsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    );
  });

  it("shows an error with retry", async () => {
    getAllDestinationsMock.mockRejectedValue(new Error("Network error"));

    renderWithProviders(<MyDestinations />, { route: "/my-destinations" });

    expect(
      await screen.findByText("Unable to load your destinations. Please try again."),
    ).toBeInTheDocument();
  });
});
