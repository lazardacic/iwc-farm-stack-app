import { fireEvent, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import Home from "./Home";
import { renderWithProviders } from "../test/renderWithProviders";
import { selectOption } from "../test/selectOption";
import type { Destination, DestinationPage } from "../types/destination";

const getAllDestinationsMock = vi.fn();
const getDestinationCountriesMock = vi.fn();
const getPinnedDestinationsMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("../api/destinationsApi", () => ({
  getAllDestinations: (params: unknown) => getAllDestinationsMock(params),
  getDestinationCountries: () => getDestinationCountriesMock(),
  getPinnedDestinations: () => getPinnedDestinationsMock(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

const makeDestination = (overrides: Partial<Destination> = {}): Destination => ({
  id: "1",
  title: "Tokyo Trip",
  slug: "tokyo-trip",
  country: "Japan",
  description: "A trip to Tokyo with food and culture.",
  price: 1200,
  rating: 4.8,
  image: "https://example.com/tokyo.jpg",
  tags: [],
  featured: false,
  ...overrides,
});

const makePage = (
  items: Destination[],
  overrides: Partial<DestinationPage> = {},
): DestinationPage => ({
  items,
  total: items.length,
  page: 1,
  page_size: 9,
  pages: items.length === 0 ? 0 : 1,
  ...overrides,
});

const lastRequest = () => getAllDestinationsMock.mock.lastCall?.[0];

describe("Home", () => {
  beforeEach(() => {
    getAllDestinationsMock.mockReset();
    getDestinationCountriesMock.mockReset();
    getDestinationCountriesMock.mockResolvedValue(["Italy", "Japan"]);
    getPinnedDestinationsMock.mockReset();
    getPinnedDestinationsMock.mockResolvedValue([]);
    useAuthMock.mockReturnValue({ isAuthenticated: false, canPublish: false });
  });

  it("shows skeletons while the first page loads", () => {
    getAllDestinationsMock.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Home />);

    expect(screen.getByLabelText("Loading destinations")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search destinations...")).toBeInTheDocument();
  });

  it("renders destinations and the page summary", async () => {
    getAllDestinationsMock.mockResolvedValue(
      makePage(
        [
          makeDestination(),
          makeDestination({ id: "2", title: "Rome Trip", country: "Italy" }),
        ],
        { total: 11, pages: 2 },
      ),
    );

    renderWithProviders(<Home />);

    expect(await screen.findByText("Tokyo Trip")).toBeInTheDocument();
    expect(screen.getByText("Rome Trip")).toBeInTheDocument();
    expect(screen.getByText("Showing 1-9 of 11 destinations")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("requests the next page", async () => {
    getAllDestinationsMock.mockResolvedValue(
      makePage([makeDestination()], { total: 11, pages: 2 }),
    );

    renderWithProviders(<Home />);

    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));

    await waitFor(() => expect(lastRequest()).toMatchObject({ page: 2 }));
  });

  it("sends the selected sort and filters to the API", async () => {
    getAllDestinationsMock.mockResolvedValue(makePage([makeDestination()]));

    renderWithProviders(<Home />);
    await screen.findByText("Tokyo Trip");

    await selectOption("Sort by", "Price: high to low");
    await waitFor(() => expect(getDestinationCountriesMock).toHaveBeenCalled());
    await selectOption("Country", "Japan");

    await waitFor(() =>
      expect(lastRequest()).toMatchObject({
        page: 1,
        sort: "price_desc",
        filters: expect.objectContaining({ country: "Japan" }),
      }),
    );
  });

  it("does not request an invalid price range", async () => {
    getAllDestinationsMock.mockResolvedValue(makePage([makeDestination()]));

    renderWithProviders(<Home />);
    await screen.findByText("Tokyo Trip");

    fireEvent.change(screen.getByLabelText("Min price"), {
      target: { value: "900" },
    });
    fireEvent.change(screen.getByLabelText("Max price"), {
      target: { value: "100" },
    });

    expect(
      await screen.findByText("Max price must be greater than min price"),
    ).toBeInTheDocument();
    expect(
      getAllDestinationsMock.mock.calls.some(
        ([params]) => params.filters.maxPrice === "100",
      ),
    ).toBe(false);
  });

  it("does not offer create to subscribers", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, canPublish: false });
    getAllDestinationsMock.mockResolvedValue(makePage([]));

    renderWithProviders(<Home />);

    expect(
      await screen.findByText("Editors and admins can add destinations."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create destination" }),
    ).not.toBeInTheDocument();
  });

  it("invites publishers to create the first destination", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, canPublish: true });
    getAllDestinationsMock.mockResolvedValue(makePage([]));

    renderWithProviders(<Home />);

    expect(await screen.findByText("No destinations yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create destination" }),
    ).toHaveAttribute("href", "/create");
  });

  it("offers to clear search and filters when nothing matches", async () => {
    getAllDestinationsMock.mockResolvedValue(makePage([]));

    renderWithProviders(<Home />);

    fireEvent.change(screen.getByPlaceholderText("Search destinations..."), {
      target: { value: "atlantis" },
    });

    expect(await screen.findByText("No destinations match")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Clear search and filters" }),
    );

    expect(screen.getByPlaceholderText("Search destinations...")).toHaveValue("");
  });

  it("restores search, filters, sort and page from the URL", async () => {
    getAllDestinationsMock.mockResolvedValue(
      makePage([makeDestination()], { total: 20, page: 2, pages: 3 }),
    );

    renderWithProviders(<Home />, {
      route: "/?search=tokyo&country=Japan&min_rating=4&sort=price_desc&page=2",
    });

    await screen.findByText("Tokyo Trip");
    expect(lastRequest()).toMatchObject({
      page: 2,
      search: "tokyo",
      sort: "price_desc",
      filters: expect.objectContaining({ country: "Japan", minRating: "4" }),
    });
    expect(screen.getByPlaceholderText("Search destinations...")).toHaveValue(
      "tokyo",
    );
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("writes sort and page changes to the URL", async () => {
    getAllDestinationsMock.mockResolvedValue(
      makePage([makeDestination()], { total: 20, pages: 3 }),
    );

    renderWithProviders(<Home />);
    await screen.findByText("Tokyo Trip");

    await selectOption("Sort by", "Top rated");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/?sort=rating_desc",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/?sort=rating_desc&page=2",
      ),
    );
  });

  it("returns to page 1 when a filter changes", async () => {
    getAllDestinationsMock.mockResolvedValue(
      makePage([makeDestination()], { total: 20, page: 2, pages: 3 }),
    );

    renderWithProviders(<Home />, { route: "/?page=2" });
    await screen.findByText("Tokyo Trip");
    await waitFor(() => expect(getDestinationCountriesMock).toHaveBeenCalled());

    await selectOption("Country", "Japan");

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/?country=Japan"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("page=");
  });

  it("clears every param from the URL", async () => {
    getAllDestinationsMock.mockResolvedValue(makePage([]));

    renderWithProviders(<Home />, { route: "/?search=atlantis&featured=true" });

    fireEvent.click(
      await screen.findByRole("button", { name: "Clear search and filters" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/),
    );
  });

  it("moves a page past the end to the last page", async () => {
    getAllDestinationsMock.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve(
        page > 2
          ? makePage([], { total: 12, page, pages: 2 })
          : makePage([makeDestination()], { total: 12, page, pages: 2 }),
      ),
    );

    renderWithProviders(<Home />, { route: "/?page=5" });

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("/?page=2"),
    );
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("shows an error state with retry", async () => {
    getAllDestinationsMock.mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(<Home />);

    expect(
      await screen.findByText("Unable to load destinations. Please try again."),
    ).toBeInTheDocument();

    getAllDestinationsMock.mockResolvedValue(makePage([makeDestination()]));
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));

    expect(await screen.findByText("Tokyo Trip")).toBeInTheDocument();
  });
});
