import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import DestinationForm from "../components/forms/DestinationForm";

import { isAuthStatusError } from "../api/axiosClient";
import { getDestination, updateDestination } from "../api/destinationsApi";
import { useAuth } from "../hooks/useAuth";
import { canEditDestination } from "../utils/permissions";

import type { DestinationFormValues } from "../types/destinationForm";

import Button from "../components/ui/Button";
import ErrorState from "../components/ui/ErrorState";
import FormCard from "../components/ui/FormCard";
import Skeleton from "../components/ui/Skeleton";

const EditDestination = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Same key as the destination page, so a destination opened there loads instantly.
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

  const updateMutation = useMutation({
    mutationFn: (data: DestinationFormValues) =>
      updateDestination(id, {
        ...data,
        // The backend keeps the stored featured value; tags are not edited here.
        featured: destination?.featured ?? false,
        tags: destination?.tags ?? [],
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailKey, updated);
      await queryClient.invalidateQueries({ queryKey: ["destinations"] });
      toast.success("Destination updated successfully");
      navigate(`/destination/${id}`);
    },
    onError: (error) => {
      console.error(error);

      if (!isAuthStatusError(error)) {
        toast.error("Unable to update destination");
      }
    },
  });

  const handleUpdate = async (data: DestinationFormValues) => {
    try {
      await updateMutation.mutateAsync(data);
    } catch {
      // onError already reported it; the form stays filled in for another try.
    }
  };

  if (isLoading) {
    return (
      <section
        className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8"
        aria-busy="true"
        aria-label="Loading destination"
      >
        <FormCard>
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </FormCard>
      </section>
    );
  }

  if (isError || !destination) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <ErrorState
          title="Destination not found"
          message="The destination you are trying to edit does not exist."
        />
      </section>
    );
  }

  // The route allows editors in, but only for their own destinations; the API enforces it too.
  if (!canEditDestination(user, destination)) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <ErrorState
          title="You cannot edit this destination"
          message="Editors can edit only the destinations they created."
        />
        <div className="mt-6 text-center">
          <Link
            to={`/destination/${destination.id}`}
            className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400"
          >
            Back to the destination
          </Link>
        </div>
      </section>
    );
  }

  const initialValues: DestinationFormValues = {
    title: destination.title,
    country: destination.country,
    description: destination.description,
    image: destination.image,
    price: destination.price,
    rating: destination.rating,
  };

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Edit Destination
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Update destination information.
        </p>
      </div>

      <FormCard>
        <DestinationForm
          mode="edit"
          initialValues={initialValues}
          loading={updateMutation.isPending}
          onSubmit={handleUpdate}
        />
      </FormCard>

      <div className="mt-6">
        <Button variant="secondary" onClick={() => navigate(`/destination/${id}`)}>
          Cancel
        </Button>
      </div>
    </section>
  );
};

export default EditDestination;
