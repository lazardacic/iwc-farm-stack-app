import { destinationPath, isObjectId } from "./destinationLinks";

describe("destinationLinks", () => {
  it("recognizes MongoDB ids", () => {
    expect(isObjectId("6a5f8ddbbfc8ad6679852eca")).toBe(true);
    expect(isObjectId("belgrade-at-sunset")).toBe(false);
    expect(isObjectId("6a5f8ddbbfc8ad6679852ec")).toBe(false);
  });

  it("links by slug, or by id when there is no slug", () => {
    expect(destinationPath({ id: "abc", slug: "novi-sad" })).toBe("/destination/novi-sad");
    expect(destinationPath({ id: "abc", slug: "" })).toBe("/destination/abc");
  });
});
