import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { isAuthStatusError } from "../api/axiosClient";
import { getDestination, deleteDestination } from "../api/destinationsApi";

import type { Destination } from "../types/destination";

import ErrorState from "../components/ui/ErrorState";
import Skeleton from "../components/ui/Skeleton";
import Modal from "../components/ui/Modal";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";

const DestinationDetails = () => {
  const { id } = useParams();
  const { isAdmin, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [destination, setDestination] = useState<Destination | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    const loadDestination = async () => {
      if (!id) return;

      try {
        const data = await getDestination(id);

        setDestination(data);
      } catch (error) {
        console.error(error);

        setError(true);

        toast.error("Unable to load destination");
      } finally {
        setLoading(false);
      }
    };

    loadDestination();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

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

  if (loading) {
    return (
      <section
        className="
          mx-auto
          max-w-5xl

          px-6
          py-10
        "
      >
        <Card
          className="
            overflow-hidden
            p-0
          "
        >
          <Skeleton
            className="
              h-96
              w-full
              rounded-none
            "
          />

          <div
            className="
              space-y-6
              p-6
            "
          >
            <Skeleton
              className="
                h-10
                w-3/4
              "
            />

            <Skeleton
              className="
                h-5
                w-1/3
              "
            />

            <Skeleton
              className="
                h-32
                w-full
              "
            />
          </div>
        </Card>
      </section>
    );
  }

  if (error || !destination) {
    return (
      <section
        className="
          mx-auto
          max-w-5xl

          px-6
          py-20
        "
      >
        <ErrorState
          message="
            Destination could not be found.
          "
        />
      </section>
    );
  }

  return (
    <>
      <section
        className="
          mx-auto

          w-full

          max-w-5xl

          px-4
          py-10

          sm:px-6
          lg:px-8
        "
      >
        <Card
          className="
            overflow-hidden
            p-0
          "
        >
          {/* Hero image */}

          <div
            className="
              relative
            "
          >
            <img
              src={destination.image}
              alt={destination.title}
              className="
                h-72
                w-full

                object-cover

                sm:h-96
              "
            />

            {destination.featured && (
              <div
                className="
                  absolute
                  left-6
                  top-6
                "
              >
                <Badge variant="yellow">Featured</Badge>
              </div>
            )}
          </div>

          <div
            className="
              space-y-8

              p-6

              sm:p-8
            "
          >
            <div>
              <h1
                className="
                  text-3xl
                  font-bold

                  text-slate-900

                  sm:text-4xl

                  dark:text-white
                "
              >
                {destination.title}
              </h1>

              {isAdmin && (
                <div className="mt-3">
                  <Badge variant="yellow">Admin controls enabled</Badge>
                </div>
              )}

              <p
                className="
                  mt-2

                  text-lg

                  text-slate-500

                  dark:text-slate-400
                "
              >
                {destination.country}
              </p>
            </div>

            <div
              className="
                grid

                gap-6

                sm:grid-cols-3
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Price
                </p>

                <p
                  className="
                    text-xl
                    font-bold
                  "
                >
                  ${destination.price}
                </p>
              </div>

              <div>
                <p
                  className="
                    text-sm
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Rating
                </p>

                <p
                  className="
                    text-xl
                    font-bold
                  "
                >
                  ⭐ {destination.rating}
                </p>
              </div>

              <div>
                <p
                  className="
                    text-sm
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Country
                </p>

                <p
                  className="
                    text-xl
                    font-bold
                  "
                >
                  {destination.country}
                </p>
              </div>
            </div>

            <div>
              <h2
                className="
                  mb-3

                  text-2xl

                  font-bold

                  text-slate-900

                  dark:text-white
                "
              >
                About this destination
              </h2>

              <p
                className="
                  leading-7

                  text-slate-600

                  dark:text-slate-300
                "
              >
                {destination.description}
              </p>
            </div>

            <div
              className="
                flex

                flex-col

                gap-3

                sm:flex-row
              "
            >
              {isAuthenticated && (
                <Button onClick={() => navigate(`/edit/${destination.id}`)}>
                  ✏ Edit
                </Button>
              )}

              {!isAuthenticated && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sign in to edit this destination.
                </p>
              )}

              {isAdmin && (
                <Button variant="danger" onClick={() => setDeleteModal(true)}>
                  🗑 Delete
                </Button>
              )}

              {isAuthenticated && !isAdmin && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Delete is restricted to administrators.
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

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
