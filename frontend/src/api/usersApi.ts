import axiosClient from "./axiosClient";
import type { AuthUser } from "../types/auth";
import type { UserPage, UserRole } from "../types/user";

interface UserPageParams {
  page: number;
  pageSize: number;
  search: string;
}

export const getUsers = async ({
  page,
  pageSize,
  search,
}: UserPageParams): Promise<UserPage> => {
  const response = await axiosClient.get("/users/", {
    params: { page, page_size: pageSize, search },
  });
  return response.data;
};

export const updateUserRole = async (
  id: string,
  role: UserRole,
): Promise<AuthUser> => {
  const response = await axiosClient.patch(`/users/${id}/role`, { role });
  return response.data;
};
