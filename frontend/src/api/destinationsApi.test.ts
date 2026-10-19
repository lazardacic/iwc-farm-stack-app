import { toFilterParams } from "./destinationsApi";
import { EMPTY_DESTINATION_FILTERS } from "../types/destination";
import { getPriceRangeError } from "../utils/destinationFilters";

describe("toFilterParams", () => {
  it("omits empty filters", () => {
    expect(toFilterParams(EMPTY_DESTINATION_FILTERS)).toEqual({});
    expect(toFilterParams()).toEqual({});
  });

  it("maps filters to API query params", () => {
    expect(
      toFilterParams({
        country: " Japan ",
        minPrice: "500",
        maxPrice: "1500",
        minRating: "4.5",
        featured: "regular",
      }),
    ).toEqual({
      country: "Japan",
      min_price: 500,
      max_price: 1500,
      min_rating: 4.5,
      featured: false,
    });
  });
});

describe("getPriceRangeError", () => {
  it("accepts open or valid ranges", () => {
    expect(getPriceRangeError(EMPTY_DESTINATION_FILTERS)).toBeUndefined();
    expect(
      getPriceRangeError({
        ...EMPTY_DESTINATION_FILTERS,
        minPrice: "500",
        maxPrice: "500",
      }),
    ).toBeUndefined();
  });

  it("rejects a min price above the max price", () => {
    expect(
      getPriceRangeError({
        ...EMPTY_DESTINATION_FILTERS,
        minPrice: "900",
        maxPrice: "100",
      }),
    ).toBe("Max price must be greater than min price");
  });
});
