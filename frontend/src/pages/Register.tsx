import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

import AuthForm from "../components/forms/AuthForm";
import FormCard from "../components/ui/FormCard";

import { useAuth } from "../hooks/useAuth";

import type { LoginPayload } from "../types/auth";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (data: LoginPayload) => {
    try {
      setLoading(true);
      await register(data);
      toast.success("Account created successfully");
      navigate("/welcome", { replace: true });
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error("This email is already registered");
      } else {
        toast.error("Unable to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create your account
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Register to add, edit, and manage destinations.
        </p>
      </div>

      <FormCard>
        <AuthForm mode="register" loading={loading} onSubmit={handleRegister} />
      </FormCard>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </section>
  );
};

export default Register;
