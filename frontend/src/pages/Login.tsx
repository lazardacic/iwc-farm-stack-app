import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import AuthForm from "../components/forms/AuthForm";
import FormCard from "../components/ui/FormCard";

import { useAuth } from "../hooks/useAuth";

import type { LoginPayload } from "../types/auth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const from = location.state?.from;
  const destination = from
    ? `${from.pathname ?? ""}${from.search ?? ""}${from.hash ?? ""}` || "/"
    : "/";

  const handleLogin = async (data: LoginPayload) => {
    try {
      setLoading(true);
      await login(data);
      toast.success("Signed in successfully");
      navigate(destination, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Sign in to create and manage destinations.
        </p>
      </div>

      <FormCard>
        <AuthForm mode="login" loading={loading} onSubmit={handleLogin} />
      </FormCard>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
          Create one
        </Link>
      </p>
    </section>
  );
};

export default Login;
