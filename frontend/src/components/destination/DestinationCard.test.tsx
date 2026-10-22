import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import DestinationCard from "./DestinationCard";
import type { Destination } from "../../types/destination";

const destination: Destination = {
  id: "abc",
  title: "Santorini Sunsets",
  slug: "santorini-sunsets",
  country: "Greece",
  description: "White houses above the Aegean Sea.",
  price: 2399,
  rating: 4.8,
  image: "/placeholders/beach.svg",
  tags: [],
  featured: false,
};

const renderCard = (overrides: Partial<Destination> = {}) =>
  render(
    <MemoryRouter>
      <DestinationCard destination={{ ...destination, ...overrides }} />
    </MemoryRouter>,
  );

describe("DestinationCard", () => {
  it("links the whole card to the destination's slug", () => {
    renderCard();

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/destination/santorini-sunsets",
    );
  });

  it("falls back to the id when a destination has no slug yet", () => {
    renderCard({ slug: "" });

    expect(screen.getByRole("link")).toHaveAttribute("href", "/destination/abc");
  });

  it("shows country, title, description, price and rating", () => {
    renderCard();

    expect(screen.getByText("Greece")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Santorini Sunsets" })).toBeInTheDocument();
    expect(screen.getByText("White houses above the Aegean Sea.")).toBeInTheDocument();
    expect(screen.getByText("$2,399")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 4.8 out of 5")).toBeInTheDocument();
  });

  it("marks featured destinations", () => {
    renderCard({ featured: true });

    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("does not mark regular destinations", () => {
    renderCard();

    expect(screen.queryByText("Featured")).not.toBeInTheDocument();
  });
});
