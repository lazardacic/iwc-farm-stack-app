import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { DestinationFormValues } from "../../types/destinationForm";

import { destinationSchema } from "../../validation/destinationSchema";

import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

interface DestinationFormProps {
  mode: "create" | "edit";

  initialValues?: DestinationFormValues;

  loading?: boolean;

  onSubmit: (data: DestinationFormValues) => Promise<void>;
}

const DestinationForm = ({
  mode,
  initialValues,
  loading = false,
  onSubmit,
}: DestinationFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),

    defaultValues: initialValues ?? {
      title: "",
      country: "",
      description: "",
      image: "",
      price: 0,
      rating: 0,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="
        mx-auto
        flex
        w-full
        max-w-2xl
        flex-col
        gap-5
      "
    >
      <Input
        label="Title"
        placeholder="Enter destination title"
        error={errors.title?.message}
        {...register("title")}
      />

      <Input
        label="Country"
        placeholder="Enter country"
        error={errors.country?.message}
        {...register("country")}
      />

      <Input
        label="Image URL"
        placeholder="https://example.com/image.jpg"
        error={errors.image?.message}
        {...register("image")}
      />

      <Input
        label="Price"
        type="number"
        placeholder="0"
        error={errors.price?.message}
        {...register("price", {
          valueAsNumber: true,
        })}
      />

      <Input
        label="Rating"
        type="number"
        step="0.1"
        placeholder="0 - 5"
        error={errors.rating?.message}
        {...register("rating", {
          valueAsNumber: true,
        })}
      />

      <Textarea
        label="Description"
        placeholder="Describe this destination..."
        error={errors.description?.message}
        {...register("description")}
      />

      <Button
        type="submit"
        disabled={loading}
        className="
          mt-4
        "
      >
        {loading
          ? "Saving..."
          : mode === "create"
            ? "Create Destination"
            : "Save Changes"}
      </Button>
    </form>
  );
};

export default DestinationForm;
