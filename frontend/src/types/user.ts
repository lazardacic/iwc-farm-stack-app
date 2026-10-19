import type { AuthUser } from "./auth";

export type UserRole = AuthUser["role"];

export interface UserPage {
  items: AuthUser[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
