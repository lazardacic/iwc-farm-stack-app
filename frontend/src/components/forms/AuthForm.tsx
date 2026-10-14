import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { LoginPayload } from "../../types/auth";

import { authSchema } from "../../validation/authSchema";

import Input from "../ui/Input";
import Button from "../ui/Button";

interface AuthFormProps {
  mode: "login" | "register";
  loading?: boolean;
  onSubmit: (data: LoginPayload) => Promise<void>;
}

const AuthForm = ({ mode, loading = false, onSubmit }: AuthFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-md flex-col gap-5"
    >
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" disabled={loading} className="mt-2">
        {loading
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
            ? "Sign In"
            : "Create Account"}
      </Button>
    </form>
  );
};

export default AuthForm;
