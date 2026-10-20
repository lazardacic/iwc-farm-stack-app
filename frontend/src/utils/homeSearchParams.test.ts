import {
  EMPTY_HOME_LIST_STATE,
  parseHomeSearchParams,
  toHomeSearchParams,
} from "./homeSearchParams";

const parse = (query: string) => parseHomeSearchParams(new URLSearchParams(query));

describe("homeSearchParams", () => {
  it("reads defaults from an empty URL", () => {
    expect(parse("")).toEqual(EMPTY_HOME_LIST_STATE);
  });

  it("reads every supported param", () => {
    expect(
      parse(
        "search=tokyo&country=Japan&min_price=500&max_price=1500&min_rating=4.5&featured=true&sort=price_desc&page=3",
      ),
    ).toEqual({
      search: "tokyo",
      page: 3,
      sort: "price_desc",
      filters: {
        country: "Japan",
        minPrice: "500",
        maxPrice: "1500",
        minRating: "4.5",
        featured: "featured",
      },
    });
  });

  it("maps featured=false to not featured", () => {
    expect(parse("featured=false").filters.featured).toBe("regular");
  });

  it.each([
    ["page=0", { page: 1 }],
    ["page=-2", { page: 1 }],
    ["page=2.5", { page: 1 }],
    ["page=abc", { page: 1 }],
    ["sort=random", { sort: "oldest" }],
  ])("falls back to defaults for %s", (query, expected) => {
    expect(parse(query)).toMatchObject(expected);
  });

  it.each([
    ["min_price=-5", "minPrice"],
    ["max_price=abc", "maxPrice"],
    ["min_rating=9", "minRating"],
  ] as const)("ignores the invalid filter %s", (query, key) => {
    expect(parse(query).filters[key]).toBe("");
  });

  it("ignores unknown featured values", () => {
    expect(parse("featured=maybe").filters.featured).toBe("all");
  });

  it("leaves defaults out of the URL", () => {
    expect(toHomeSearchParams(EMPTY_HOME_LIST_STATE).toString()).toBe("");
  });

  it("writes a state that reads back the same", () => {
    const state = parse(
      "search=rome&country=Italy&min_price=0&max_price=900&min_rating=4&featured=false&sort=rating_desc&page=2",
    );

    expect(parse(toHomeSearchParams(state).toString())).toEqual(state);
  });
});
