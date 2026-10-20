import { Link } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";
import { ROLE_BADGES, ROLE_LABELS } from "../utils/permissions";

import Badge from "../components/ui/Badge";
import FormCard from "../components/ui/FormCard";

const ROLE_ABILITIES: Record<UserRole, string[]> = {
  admin: [
    "Browse, create and edit every destination",
    "Delete destinations",
    "Manage users and assign roles",
  ],
  editor: [
    "Browse all destinations",
    "Create destinations and edit the ones you created",
  ],
  subscriber: ["Browse all destinations and their details"],
};

const linkClasses =
  "rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700";

const Welcome = () => {
  const { user, isAdmin, canPublish } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
      </div>

      <FormCard>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Your role</h2>
          <Badge variant={ROLE_BADGES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
        </div>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          {ROLE_ABILITIES[user.role].map((ability) => (
            <li key={ability}>{ability}</li>
          ))}
        </ul>

        {user.role === "subscriber" && (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Need to publish destinations? Ask an administrator for the editor role.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className={linkClasses}>
            Browse destinations
          </Link>

          {canPublish && (
            <Link to="/create" className={linkClasses}>
              Create destination
            </Link>
          )}

          {canPublish && (
            <Link to="/my-destinations" className={linkClasses}>
              My destinations
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin/users" className={linkClasses}>
              Manage users
            </Link>
          )}
        </div>
      </FormCard>
    </section>
  );
};

export default Welcome;
