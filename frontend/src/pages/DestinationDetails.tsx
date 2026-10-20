import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
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
} from "../api/destinationsApi";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/apiError";
import { formatPrice, formatRating, toParagraphs } from "../utils/formatters";
import { canEditDestination } from "../utils/permissions";

import DestinationImage from "../components/destination/DestinationImage";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorState from "../components/ui/ErrorState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";

const DestinationDetails = () => {
  const { id = "" } = useParams();
  const { isAdmin, isAuthenticated, canPublish, user } = useAuth();
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

  const featureMutation = useMutation({
    mutationFn: (featured: boolean) => setDestinationFeatured(id, featured),
    onSuccess: (updated) => {
      queryClient.setQueryData(detailKey, updated);
      void queryClient.invalidateQueries({ queryKey: ["destinations"] });
      toast.success(
        updated.featured ? "Added to featured destinations" : "Removed from featured",
      );
    },
    onError: (error) => {
      if (!isAuthStatusError(error)) {
        toast.error(getApiErrorMessage(error, "Unable to update featured status"));
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
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
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

  return (
    <>
      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FiArrowLeft aria-hidden="true" />
          All destinations
        </button>

        <header className="mt-8 max-w-3xl">
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
          </p>

          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            {destination.title}
          </h1>

          <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 dark:text-slate-400">
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
        </header>

        <div className="mt-8 overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
          <DestinationImage
            src={destination.image}
            alt={destination.title}
            className="aspect-video w-full object-cover"
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
          <div className="max-w-prose">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              About this destination
            </h2>

            <div className="mt-4 space-y-5 text-lg leading-8 text-slate-700 dark:text-slate-300">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {destination.tags.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tags">
                {destination.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trip details</h2>

              <dl className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                <div className="flex justify-between py-3">
                  <dt className="text-slate-600 dark:text-slate-400">Country</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {destination.country}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-slate-600 dark:text-slate-400">Price from</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {formatPrice(destination.price)}
                  </dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-slate-600 dark:text-slate-400">Rating</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {formatRating(destination.rating)} / 5
                  </dd>
                </div>
              </dl>

              {(canEdit || isAdmin) && (
                <div className="mt-6 flex flex-col gap-3">
                  {canEdit && (
                    <Button
                      onClick={() => navigate(`/edit/${destination.id}`)}
                      className="flex items-center justify-center gap-2"
                    >
                      <FiEdit2 aria-hidden="true" />
                      Edit destination
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      disabled={featureMutation.isPending}
                      onClick={() => featureMutation.mutate(!destination.featured)}
                      className="flex items-center justify-center gap-2"
                    >
                      <FiStar aria-hidden="true" />
                      {destination.featured ? "Remove from featured" : "Feature on home page"}
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="danger"
                      onClick={() => setDeleteModal(true)}
                      className="flex items-center justify-center gap-2"
                    >
                      <FiTrash2 aria-hidden="true" />
                      Delete
                    </Button>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                  Sign in as an editor to manage destinations.
                </p>
              )}

              {canPublish && !isAdmin && (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  {canEdit
                    ? "Only administrators can delete destinations."
                    : "Editors can edit only the destinations they created."}
                </p>
              )}
            </Card>
          </aside>
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
