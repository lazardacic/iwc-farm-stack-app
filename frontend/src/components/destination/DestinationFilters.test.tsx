import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import DestinationFilters from "./DestinationFilters";
import { EMPTY_DESTINATION_FILTERS } from "../../types/destination";
import { getSelectButton, selectOption } from "../../test/selectOption";

const renderFilters = (
  overrides: Partial<Parameters<typeof DestinationFilters>[0]> = {},
) => {
  const props = {
    filters: EMPTY_DESTINATION_FILTERS,
    countries: ["Italy", "Japan"],
    onChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };

  render(<DestinationFilters {...props} />);

  return props;
};

describe("DestinationFilters", () => {
  it("lists the available countries", () => {
    renderFilters();

    fireEvent.click(getSelectButton("Country"));

    expect(screen.getByRole("option", { name: "Italy" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Japan" })).toBeInTheDocument();
  });

  it("reports changed filter values", async () => {
    const { onChange } = renderFilters();

    await selectOption("Country", "Japan");
    fireEvent.change(screen.getByLabelText("Min price"), {
      target: { value: "500" },
    });
    await selectOption("Featured", "Featured only");

    expect(onChange).toHaveBeenNthCalledWith(1, {
      ...EMPTY_DESTINATION_FILTERS,
      country: "Japan",
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      ...EMPTY_DESTINATION_FILTERS,
      minPrice: "500",
    });
    expect(onChange).toHaveBeenNthCalledWith(3, {
      ...EMPTY_DESTINATION_FILTERS,
      featured: "featured",
    });
  });

  it("hides the clear button when no filters are active", () => {
    renderFilters();

    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("clears active filters", () => {
    const { onReset } = renderFilters({
      filters: { ...EMPTY_DESTINATION_FILTERS, minRating: "4" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("shows the price range error", () => {
    renderFilters({ priceError: "Max price must be greater than min price" });

    expect(
      screen.getByText("Max price must be greater than min price"),
    ).toBeInTheDocument();
  });
});
