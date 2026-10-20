import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

import FeaturedSlider from "./FeaturedSlider";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { Destination } from "../../types/destination";

const getFeaturedDestinationsMock = vi.fn();

vi.mock("../../api/destinationsApi", () => ({
  getFeaturedDestinations: () => getFeaturedDestinationsMock(),
}));

const makeDestination = (id: string, title: string): Destination => ({
  id,
  title,
  country: "Japan",
  description: "A featured destination.",
  price: 1450,
  rating: 4.75,
  image: "/placeholders/city.svg",
  tags: [],
  featured: true,
});

describe("FeaturedSlider", () => {
  beforeEach(() => {
    getFeaturedDestinationsMock.mockReset();
    // jsdom does not implement element scrolling.
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders nothing when no destination is featured", async () => {
    getFeaturedDestinationsMock.mockResolvedValue([]);

    const { container } = renderWithProviders(<FeaturedSlider />);

    await vi.waitFor(() =>
      expect(screen.queryByLabelText("Loading featured destinations")).toBeNull(),
    );
    expect(container.querySelector("[aria-roledescription='carousel']")).toBeNull();
  });

  it("shows each featured destination with a link, rating and price", async () => {
    getFeaturedDestinationsMock.mockResolvedValue([
      makeDestination("1", "Kyoto Temples"),
      makeDestination("2", "Osaka Food Tour"),
    ]);

    renderWithProviders(<FeaturedSlider />);

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
    getFeaturedDestinationsMock.mockResolvedValue([
      makeDestination("1", "Kyoto Temples"),
      makeDestination("2", "Osaka Food Tour"),
    ]);

    renderWithProviders(<FeaturedSlider />);
    await screen.findByText("Kyoto Temples");

    expect(screen.getByRole("button", { name: "Previous featured destination" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next featured destination" }));
    fireEvent.click(screen.getByRole("button", { name: "Show featured destination 2" }));

    expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("hides arrows and dots for a single slide", async () => {
    getFeaturedDestinationsMock.mockResolvedValue([makeDestination("1", "Kyoto Temples")]);

    renderWithProviders(<FeaturedSlider />);
    await screen.findByText("Kyoto Temples");

    expect(
      screen.queryByRole("button", { name: "Next featured destination" }),
    ).not.toBeInTheDocument();
  });
});
