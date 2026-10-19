import { z } from "zod";

export const destinationSchema = z.object({
  title: z.string().min(3, "Title must contain at least 3 characters"),

  country: z.string().min(2, "Country is required"),

  description: z
    .string()
    .min(30, "Description must contain at least 30 characters"),

  // Empty lets the backend assign a placeholder; relative paths cover bundled placeholders.
  image: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || /^https?:\/\/\S+$/.test(value),
      "Please enter a valid image URL",
    ),

  price: z
    .number({
      message: "Price must be a number",
    })
    .positive("Price must be greater than 0"),

  rating: z
    .number({
      message: "Rating must be a number",
    })
    .min(0, "Rating cannot be below 0")
    .max(5, "Rating cannot be above 5"),
});

export type DestinationSchemaType = z.infer<typeof destinationSchema>;
