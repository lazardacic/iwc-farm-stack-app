import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import AuthForm from "./AuthForm";

describe("AuthForm", () => {
  it("validates email and password before submitting", async () => {
    const onSubmit = vi.fn();

    render(<AuthForm mode="login" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(
      await screen.findByText("Please enter a valid email address"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters long"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid credentials", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AuthForm mode="register" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      email: "new@example.com",
      password: "password123",
    });
  });

  it("shows the pending label while loading", () => {
    render(<AuthForm mode="login" loading onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });
});
