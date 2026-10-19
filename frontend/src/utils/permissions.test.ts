import { canEditDestination, canPublish } from "./permissions";
import type { AuthUser } from "../types/auth";

const admin: AuthUser = { id: "a", email: "admin@example.com", role: "admin" };
const editor: AuthUser = { id: "e", email: "editor@example.com", role: "editor" };
const subscriber: AuthUser = {
  id: "s",
  email: "subscriber@example.com",
  role: "subscriber",
};

describe("permissions", () => {
  it("lets admins and editors publish", () => {
    expect(canPublish(admin)).toBe(true);
    expect(canPublish(editor)).toBe(true);
    expect(canPublish(subscriber)).toBe(false);
    expect(canPublish(null)).toBe(false);
  });

  it("lets admins edit any destination", () => {
    expect(canEditDestination(admin, { created_by: "e" })).toBe(true);
    expect(canEditDestination(admin, { created_by: null })).toBe(true);
  });

  it("lets editors edit only their own destinations", () => {
    expect(canEditDestination(editor, { created_by: "e" })).toBe(true);
    expect(canEditDestination(editor, { created_by: "other" })).toBe(false);
    expect(canEditDestination(editor, { created_by: null })).toBe(false);
  });

  it("never lets subscribers edit", () => {
    expect(canEditDestination(subscriber, { created_by: "s" })).toBe(false);
  });
});
