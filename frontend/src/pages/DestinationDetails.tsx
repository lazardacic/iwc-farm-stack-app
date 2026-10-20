import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiBookmark,
  FiEdit2,
  FiMapPin,
  FiStar,
  FiTrash2,
} from "react-icons/fi";

import { isAuthStatusError } from "../api/axiosClient";
import {
  deleteDestination,
  getDestination,
  setDestinationFeatured,
  setDestinationPinned,
} from "../api/destinationsApi";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/apiError";
import { formatPrice, formatRating, toParagraphs } from "../utils/formatters";
import { canEditDestination } from "../utils/permissions";

import DestinationImage from "../components/destination/DestinationImage";
import ErrorState from "../components/ui/ErrorState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";

const DestinationDetails = () => {
  const { id = "" } = useParams();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [deleteModal, setDeleteModal] = useState(false);

  const detailKey = ["destinations", "detail", id];

  const {
    data: destination,
    isLoading,
    isError,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () => getDestination(id),
    enabled: Boolean(id),
  });

  // Featured (a badge, no limit) and pinned (the home slider, at most 5) are independent.
  const statusMutation = useMutation({
    mutationFn: ({ status, value }: { status: "featured" | "pinned"; value: boolean }) =>
      status === "featured"
        ? setDestinationFeatured(id, value)
        : setDestinationPinned(id, value),
    onSuccess: (updated, { status, value }) => {
      queryClient.setQueryData(detailKey, updated);
      void queryClient.invalidateQueries({ queryKey: ["destinations"] });

      const messages = {
        featured: value ? "Marked as featured" : "Removed featured mark",
        pinned: value ? "Pinned to the home page slider" : "Unpinned from the home page slider",
      };
      toast.success(messages[status]);
    },
    onError: (error) => {
      if (!isAuthStatusError(error)) {
        toast.error(getApiErrorMessage(error, "Unable to update the destination"));
      }
    },
  });

  // Back keeps the list's filters and page, which live in the previous URL.
  const goBack = () => {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDestination(id);
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      toast.success("Destination deleted successfully");
      navigate("/");
    } catch (error) {
      console.error(error);

      if (!isAuthStatusError(error)) {
        toast.error("Unable to delete destination");
      }
    }
  };

  if (isLoading) {
    return (
      <section
        className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12"
        aria-busy="true"
        aria-label="Loading destination"
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-4 w-40" />
        <Skeleton className="mt-3 h-12 w-3/4" />
        <Skeleton className="mt-8 aspect-video w-full rounded-3xl" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-xl" />
        </div>
      </section>
    );
  }

  if (isError || !destination) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState
          title="Destination not found"
          message="It may have been removed, or the link is incorrect."
        />
        <div className="mt-6 text-center">
          <Link to="/" className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400">
            Browse all destinations
          </Link>
        </div>
      </section>
    );
  }

  const canEdit = canEditDestination(user, destination);
  const paragraphs = toParagraphs(destination.description);
  const actionClasses =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <article className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <FiArrowLeft aria-hidden="true" />
            All destinations
          </button>

          <header className="mt-10">
            <p className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              <span className="flex items-center gap-1.5">
                <FiMapPin aria-hidden="true" />
                {destination.country}
              </span>
              {destination.featured && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                  Featured
                </span>
              )}
              {isAdmin && destination.pinned && (
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800 dark:bg-blue-400/15 dark:text-blue-300">
                  Pinned
                </span>
              )}
            </p>

            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              {destination.title}
            </h1>

            <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <FiStar className="fill-amber-400 text-amber-400" aria-hidden="true" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatRating(destination.rating)}
                </span>
                / 5
              </span>
              <span>
                From{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatPrice(destination.price)}
                </span>
              </span>
            </p>

            {(canEdit || isAdmin) && (
              <div
                role="toolbar"
                aria-label="Manage destination"
                className="mt-6 flex flex-wrap gap-2 border-y border-slate-200 py-3 dark:border-slate-800"
              >
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => navigate(`/edit/${destination.id}`)}
                    className={`${actionClasses} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
                  >
                    <FiEdit2 aria-hidden="true" />
                    Edit destination
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({ status: "featured", value: !destination.featured })
                    }
                    className={`${actionClasses} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
                  >
                    <FiStar aria-hidden="true" />
                    {destination.featured ? "Remove featured mark" : "Mark as featured"}
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() =>
                      statusMutation.mutate({ status: "pinned", value: !destination.pinned })
                    }
                    className={`${actionClasses} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}
                  >
                    <FiBookmark aria-hidden="true" />
                    {destination.pinned ? "Unpin from home slider" : "Pin to home slider"}
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDeleteModal(true)}
                    className={`${actionClasses} ml-auto text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
                  >
                    <FiTrash2 aria-hidden="true" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </header>
        </div>

        {/* The image is a little wider than the text column, as in a magazine layout. */}
        <figure className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
          <DestinationImage
            src={destination.image}
            alt={destination.title}
            className="aspect-video w-full object-cover"
          />
        </figure>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="space-y-6 text-lg leading-8 text-slate-700 dark:text-slate-300">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>

          {destination.tags.length > 0 && (
            <ul
              className="mt-10 flex flex-wrap gap-2 border-t border-slate-200 pt-6 dark:border-slate-800"
              aria-label="Tags"
            >
              {destination.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <Modal
        open={deleteModal}
        title="Delete destination?"
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        confirmText="Delete"
      >
        Are you sure you want to delete <strong>{destination.title}</strong>?
      </Modal>
    </>
  );
};

export default DestinationDetails;
