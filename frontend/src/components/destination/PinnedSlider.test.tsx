import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

import PinnedSlider from "./PinnedSlider";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { Destination } from "../../types/destination";

const getPinnedDestinationsMock = vi.fn();

vi.mock("../../api/destinationsApi", () => ({
  getPinnedDestinations: () => getPinnedDestinationsMock(),
}));

const makeDestination = (id: string, title: string, featured = false): Destination => ({
  id,
  title,
  country: "Japan",
  description: "A featured destination.",
  price: 1450,
  rating: 4.75,
  image: "/placeholders/city.svg",
  tags: [],
  featured,
  pinned: true,
});

describe("PinnedSlider", () => {
  beforeEach(() => {
    getPinnedDestinationsMock.mockReset();
    // jsdom does not implement element scrolling.
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders nothing when no destination is pinned", async () => {
    getPinnedDestinationsMock.mockResolvedValue([]);

    const { container } = renderWithProviders(<PinnedSlider />);

    await vi.waitFor(() =>
      expect(screen.queryByLabelText("Loading highlighted destinations")).toBeNull(),
    );
    expect(container.querySelector("[aria-roledescription='carousel']")).toBeNull();
  });

  it("shows each pinned destination with a link, rating and price", async () => {
    getPinnedDestinationsMock.mockResolvedValue([
      makeDestination("1", "Kyoto Temples"),
      makeDestination("2", "Osaka Food Tour"),
    ]);

    renderWithProviders(<PinnedSlider />);

    expect(await screen.findByText("Kyoto Temples")).toBeInTheDocument();
    expect(screen.getByText("Osaka Food Tour")).toBeInTheDocument();
    expect(screen.getAllByText("From $1,450")).toHaveLength(2);
    expect(screen.getAllByText("4.8")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /Explore destination/ }).at(0),
    ).toHaveAttribute("href", "/destination/1");
    expect(screen.getByRole("group", { name: "1 of 2" })).toBeInTheDocument();
  });

  it("moves between slides with the arrows and dots", async () => {
    getPinnedDestinationsMock.mockResolvedValue([
      makeDestination("1", "Kyoto Temples"),
      makeDestination("2", "Osaka Food Tour"),
    ]);

    renderWithProviders(<PinnedSlider />);
    await screen.findByText("Kyoto Temples");

    // No "previous" arrow on the first slide; it appears once there is somewhere to go back to.
    expect(
      screen.queryByRole("button", { name: "Previous highlighted destination" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next highlighted destination" }));
    fireEvent.click(screen.getByRole("button", { name: "Show highlighted destination 2" }));

    expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("labels a pinned destination as featured only when it is featured", async () => {
    getPinnedDestinationsMock.mockResolvedValue([
      makeDestination("1", "Kyoto Temples", true),
      makeDestination("2", "Osaka Food Tour", false),
    ]);

    renderWithProviders(<PinnedSlider />);
    await screen.findByText("Kyoto Temples");

    expect(screen.getAllByText("Featured")).toHaveLength(1);
  });

  it("hides arrows and dots for a single slide", async () => {
    getPinnedDestinationsMock.mockResolvedValue([makeDestination("1", "Kyoto Temples")]);

    renderWithProviders(<PinnedSlider />);
    await screen.findByText("Kyoto Temples");

    expect(
      screen.queryByRole("button", { name: "Next highlighted destination" }),
    ).not.toBeInTheDocument();
  });
});
