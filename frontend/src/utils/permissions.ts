import type { AuthUser, UserRole } from "../types/auth";
import type { Destination } from "../types/destination";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  subscriber: "Subscriber",
};

export const ROLE_BADGES: Record<UserRole, "yellow" | "green" | "blue"> = {
  admin: "yellow",
  editor: "green",
  subscriber: "blue",
};

export const PUBLISHER_ROLES: UserRole[] = ["admin", "editor"];

export const canPublish = (user: AuthUser | null | undefined) =>
  Boolean(user && PUBLISHER_ROLES.includes(user.role));

// Mirrors the backend rule: admins edit anything, editors only what they created.
export const canEditDestination = (
  user: AuthUser | null | undefined,
  destination: Pick<Destination, "created_by">,
) =>
  user?.role === "admin" ||
  (user?.role === "editor" && destination.created_by === user.id);
