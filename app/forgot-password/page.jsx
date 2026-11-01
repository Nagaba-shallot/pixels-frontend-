"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import AuthShell from "@/components/AuthShell";
import { Field, Button } from "@/components/ui";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    mode: "onChange",
  });

  async function onRequestCode(data) {
    setError("");
    setLoading(true);
    setEmail(data.email);

    try {
      await api.requestPasswordResetCode(data.email);
      setStep(2);
      setSuccessMsg("A 6-digit reset code has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(data) {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const verifyResponse = await api.verifyPasswordResetCode(
        email,
        data.code,
      );
      const resetToken = verifyResponse.reset_token;

      await api.confirmPasswordReset(resetToken, data.new_password);

      router.push("/signin");
    } catch (err) {
      setError(err.message || "Invalid code or failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-[#008B8B] text-2xl font-bold">Reset Password</h1>
        <p className="text-gray-600 text-sm mt-1">
          {step === 1
            ? "Enter your email to receive a password reset code."
            : `Enter the code sent to ${email} and your new password.`}
        </p>
      </div>

      {step === 1 && (
        <form onSubmit={handleSubmit(onRequestCode)} className="space-y-5">
          <Field
            label="Email Address"
            type="email"
            {...register("email", {
              required: "Please fill out this field.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address.",
              },
            })}
            error={errors.email?.message}
            autoComplete="email"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit(onResetPassword)} className="space-y-5">
          <Field
            label="Reset Code"
            type="text"
            {...register("code", {
              required: "Please fill out this field.",
            })}
            error={errors.code?.message}
            autoComplete="one-time-code"
          />

          <Field
            label="New Password"
            type="password"
            {...register("new_password", {
              required: "Please fill out this field.",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters.",
              },
              validate: {
                hasLetter: (v) =>
                  /[a-zA-Z]/.test(v) || "Must contain at least one letter.",
                hasNumber: (v) =>
                  /[0-9]/.test(v) || "Must contain at least one number.",
              },
            })}
            error={errors.new_password?.message}
            autoComplete="new-password"
          />

          <Field
            label="Confirm New Password"
            type="password"
            {...register("confirm_password", {
              required: "Please fill out this field.",
              validate: (v) =>
                v === getValues("new_password") || "Passwords do not match.",
            })}
            error={errors.confirm_password?.message}
            autoComplete="new-password"
          />

          {successMsg && (
            <p className="text-sm text-green-600 font-semibold">{successMsg}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-gray-600">
        Remember your password?{" "}
        <Link href="/signin" className="ml-1 text-[#00C2CB] hover:underline">
          Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
