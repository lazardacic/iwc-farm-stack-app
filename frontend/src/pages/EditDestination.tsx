import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import DestinationForm from "../components/forms/DestinationForm";

import { isAuthStatusError } from "../api/axiosClient";
import { getDestination, updateDestination } from "../api/destinationsApi";

import type { Destination } from "../types/destination";
import type { DestinationFormValues } from "../types/destinationForm";

import FormCard from "../components/ui/FormCard";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import ErrorState from "../components/ui/ErrorState";

const EditDestination = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const [destination, setDestination] = useState<Destination | null>(null);

  const [loadingDestination, setLoadingDestination] = useState(true);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDestination = async () => {
      if (!id) {
        setLoadingDestination(false);
        return;
      }

      try {
        const data = await getDestination(id);

        setDestination(data);
      } catch (error) {
        console.error(error);

        toast.error("Unable to load destination");
      } finally {
        setLoadingDestination(false);
      }
    };

    loadDestination();
  }, [id]);

  const handleUpdate = async (data: DestinationFormValues) => {
    if (!id || !destination) {
      return;
    }

    try {
      setLoading(true);

      await updateDestination(id, {
        ...data,

        featured: destination.featured,

        tags: destination.tags,
      });

      toast.success("Destination updated successfully");

      navigate(`/destination/${id}`);
    } catch (error) {
      console.error(error);

      if (!isAuthStatusError(error)) {
        toast.error("Unable to update destination");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingDestination) {
    return (
      <section
        className="
          mx-auto
          w-full
          max-w-2xl
          px-4
          py-10

          sm:px-6
          lg:px-8
        "
      >
        <FormCard>
          <div
            className="
              space-y-4
            "
          >
            <Skeleton
              className="
                h-10
                w-1/2
              "
            />

            <Skeleton
              className="
                h-12
                w-full
              "
            />

            <Skeleton
              className="
                h-12
                w-full
              "
            />

            <Skeleton
              className="
                h-32
                w-full
              "
            />
          </div>
        </FormCard>
      </section>
    );
  }

  if (!destination) {
    return (
      <section
        className="
          mx-auto
          max-w-2xl
          px-6
          py-10
        "
      >
        <ErrorState
          title="Destination not found"
          message="
            The destination you are trying to edit does not exist.
          "
        />
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
    <section
      className="
        mx-auto
        w-full
        max-w-2xl

        px-4
        py-10

        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          mb-8
        "
      >
        <h1
          className="
            text-3xl
            font-bold

            tracking-tight

            text-slate-900

            dark:text-white
          "
        >
          Edit Destination
        </h1>

        <p
          className="
            mt-2

            text-slate-600

            dark:text-slate-400
          "
        >
          Update destination information.
        </p>
      </div>

      <FormCard>
        <DestinationForm
          mode="edit"
          initialValues={initialValues}
          loading={loading}
          onSubmit={handleUpdate}
        />
      </FormCard>

      <div
        className="
          mt-6
        "
      >
        <Button
          variant="secondary"
          onClick={() => navigate(`/destination/${id}`)}
        >
          Cancel
        </Button>
      </div>
    </section>
  );
};

export default EditDestination;
