import { useDeferredValue, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";

import { isAuthStatusError } from "../api/axiosClient";
import { getUsers, updateUserRole } from "../api/usersApi";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/user";
import { getApiErrorMessage } from "../utils/apiError";

import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Pagination from "../components/ui/Pagination";
import SearchBar from "../components/ui/SearchBar";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";

const PAGE_SIZE = 20;

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());

  const { data, isLoading, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ["users", { page, pageSize: PAGE_SIZE, search: deferredSearch }],
    queryFn: () =>
      getUsers({ page, pageSize: PAGE_SIZE, search: deferredSearch }),
    placeholderData: keepPreviousData,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      updateUserRole(id, role),
    onSuccess: (updatedUser) => {
      toast.success(`${updatedUser.email} is now ${updatedUser.role}`);
    },
    onError: (mutationError) => {
      if (!isAuthStatusError(mutationError)) {
        toast.error(
          getApiErrorMessage(mutationError, "Unable to update user role"),
        );
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const pendingUserId = roleMutation.isPending
    ? roleMutation.variables?.id
    : undefined;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading users">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      );
    }

    if (error || !data) {
      return (
        <ErrorState
          message="Unable to load users. Please try again."
          onRetry={() => refetch()}
        />
      );
    }

    if (data.items.length === 0) {
      return (
        <EmptyState
          title="No users found"
          description="Try a different email search."
        />
      );
    }

    return (
      <>
        <div
          className={`
            overflow-x-auto
            rounded-2xl
            border
            border-slate-200
            transition-opacity
            dark:border-slate-800
            ${isPlaceholderData ? "opacity-60" : ""}
          `}
          aria-busy={isPlaceholderData}
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="w-48 px-4 py-3 font-medium">
                  Change role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.items.map((user) => {
                const isSelf = user.id === currentUser?.id;

                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      {user.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "yellow" : "blue"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Select
                        aria-label={`Role for ${user.email}`}
                        value={user.role}
                        disabled={isSelf || pendingUserId === user.id}
                        title={
                          isSelf ? "You cannot change your own role" : undefined
                        }
                        className="py-2"
                        onChange={(event) =>
                          roleMutation.mutate({
                            id: user.id,
                            role: event.target.value as UserRole,
                          })
                        }
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pages={data.pages}
          total={data.total}
          pageSize={PAGE_SIZE}
          itemLabel="users"
          disabled={isPlaceholderData}
          onPageChange={setPage}
        />
      </>
    );
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div
        className="
          mb-8
          flex
          flex-col
          gap-6
          md:flex-row
          md:items-center
          md:justify-between
        "
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Users
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage user roles. Changes apply on the user's next request.
          </p>
        </div>

        <SearchBar
          value={search}
          placeholder="Search by email..."
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      </div>

      {renderContent()}
    </section>
  );
};

export default AdminUsers;
