import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { DestinationFormValues } from "../../types/destinationForm";

import { destinationSchema } from "../../validation/destinationSchema";

import Input from "../ui/Input";
import Button from "../ui/Button";
import ImageInput from "./ImageInput";
import RichTextEditor from "./RichTextEditor";

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
  const [uploading, setUploading] = useState(false);
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),

    defaultValues: initialValues ?? {
      title: "",
      country: "",
      description: "",
      description_html: "",
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

      {mode === "edit" && (
        <div>
          <Input
            label="Slug"
            placeholder="belgrade-at-sunset"
            error={errors.slug?.message}
            {...register("slug")}
          />
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The link is <code>/destination/&lt;slug&gt;</code>. A new title does not change it.
            Clear the field to rebuild it from the title; it is saved in lowercase with
            hyphens, and a number is added if another destination uses it.
          </p>
        </div>
      )}

      <Input
        label="Country"
        placeholder="Enter country"
        error={errors.country?.message}
        {...register("country")}
      />

      <Controller
        name="image"
        control={control}
        render={({ field }) => (
          <ImageInput
            value={field.value}
            onChange={field.onChange}
            onUploadingChange={setUploading}
            error={errors.image?.message}
          />
        )}
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

      <Controller
        name="description_html"
        control={control}
        render={({ field }) => (
          <RichTextEditor
            label="Description"
            value={field.value}
            error={errors.description?.message}
            onChange={(html, text) => {
              field.onChange(html);
              // Validation runs on the plain text; after a failed submit it
              // re-checks on every change so the error clears while typing.
              setValue("description", text, { shouldValidate: isSubmitted });
            }}
          />
        )}
      />

      <Button
        type="submit"
        disabled={loading || uploading}
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
