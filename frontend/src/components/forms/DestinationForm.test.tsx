import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import DestinationForm from "./DestinationForm";
import type { DestinationFormValues } from "../../types/destinationForm";

const validValues: DestinationFormValues = {
  title: "Santorini",
  country: "Greece",
  description: "Beautiful island in the Aegean Sea with white houses.",
  image: "https://example.com/santorini.jpg",
  price: 1499,
  rating: 4.8,
};

const fillForm = (values: DestinationFormValues) => {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: values.title },
  });
  fireEvent.change(screen.getByLabelText("Country"), {
    target: { value: values.country },
  });
  if (values.image) {
    if (!screen.queryByLabelText("Image URL")) {
      fireEvent.click(
        screen.getByRole("button", { name: "Use an image URL instead" }),
      );
    }
    fireEvent.change(screen.getByLabelText("Image URL"), {
      target: { value: values.image },
    });
  }
  fireEvent.change(screen.getByLabelText("Price"), {
    target: { value: String(values.price) },
  });
  fireEvent.change(screen.getByLabelText("Rating"), {
    target: { value: String(values.rating) },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: values.description },
  });
};

describe("DestinationForm", () => {
  it("shows validation errors and does not submit an empty form", async () => {
    const onSubmit = vi.fn();

    render(<DestinationForm mode="create" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Destination" }));

    expect(
      await screen.findByText("Title must contain at least 3 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Price must be greater than 0")).toBeInTheDocument();
    expect(
      screen.getByText("Description must contain at least 30 characters"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows submitting without an image so a placeholder is assigned", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<DestinationForm mode="create" onSubmit={onSubmit} />);
    fillForm({ ...validValues, image: "" });

    fireEvent.click(screen.getByRole("button", { name: "Create Destination" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].image).toBe("");
  });

  it("rejects an image URL that is not http(s)", async () => {
    const onSubmit = vi.fn();

    render(<DestinationForm mode="create" onSubmit={onSubmit} />);
    fillForm({ ...validValues, image: "javascript:alert(1)" });

    fireEvent.click(screen.getByRole("button", { name: "Create Destination" }));

    expect(
      await screen.findByText("Please enter a valid image URL"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a rating above 5", async () => {
    const onSubmit = vi.fn();

    render(<DestinationForm mode="create" onSubmit={onSubmit} />);
    fillForm({ ...validValues, rating: 7 });

    fireEvent.click(screen.getByRole("button", { name: "Create Destination" }));

    expect(
      await screen.findByText("Rating cannot be above 5"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid values with numeric price and rating", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<DestinationForm mode="create" onSubmit={onSubmit} />);
    fillForm(validValues);

    fireEvent.click(screen.getByRole("button", { name: "Create Destination" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual(validValues);
  });

  it("prefills values in edit mode", () => {
    render(
      <DestinationForm
        mode="edit"
        initialValues={validValues}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Title")).toHaveValue("Santorini");
    expect(screen.getByLabelText("Price")).toHaveValue(1499);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("disables submit while saving", () => {
    render(<DestinationForm mode="edit" loading onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
