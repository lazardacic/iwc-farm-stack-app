import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DestinationForm from "../components/forms/DestinationForm";

import { createDestination } from "../api/destinationsApi";

import type { DestinationFormValues } from "../types/destinationForm";

import FormCard from "../components/ui/FormCard";
import Button from "../components/ui/Button";

const CreateDestination = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const handleCreate = async (data: DestinationFormValues) => {
    try {
      setLoading(true);

      await createDestination({
        ...data,
        featured: false,
        tags: [],
      });

      toast.success("Destination created successfully");

      navigate("/");
    } catch (error) {
      console.error(error);

      toast.error("Unable to create destination");
    } finally {
      setLoading(false);
    }
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
          Create Destination
        </h1>

        <p
          className="
            mt-2

            text-slate-600

            dark:text-slate-400
          "
        >
          Add a new travel destination.
        </p>
      </div>

      <FormCard>
        <DestinationForm
          mode="create"
          loading={loading}
          onSubmit={handleCreate}
        />
      </FormCard>

      <div
        className="
          mt-6
        "
      >
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to destinations
        </Button>
      </div>
    </section>
  );
};

export default CreateDestination;
