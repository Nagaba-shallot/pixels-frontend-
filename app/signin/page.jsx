"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import AuthShell from "@/components/AuthShell";
import { Field, Button } from "@/components/ui";
import { api } from "@/lib/api";

function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [displayEmail, setDisplayEmail] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    mode: "onChange",
  });

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function onLoginSubmit(data) {
    setError("");
    setLoading(true);

    try {
      await api.loginStep1(data.email, data.password);
      setDisplayEmail(data.email);
      setStep(2);
      setCooldown(60);
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (cooldown > 0) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const emailVal = getValues("email");
      const passVal = getValues("password");
      await api.loginStep1(emailVal, passVal);
      setSuccessMsg("A new login code has been sent to your email.");
      setCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(data) {
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const emailVal = getValues("email");
      await api.verifyOtp(emailVal, data.otp);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-[#008B8B] text-2xl font-bold">Welcome back</h1>
        <p className="text-gray-600 text-sm mt-1">
          Sign in to your MvuviGo account
        </p>
      </div>

      {step === 1 && (
        <form
          onSubmit={handleSubmit(onLoginSubmit)}
          method="POST"
          action=""
          className="space-y-5"
          autoComplete="off"
        >
          <Field
            label="Email"
            type="email"
            {...register("email", {
              required: "Please fill out this field.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address",
              },
            })}
            error={errors.email?.message}
            autoComplete="off"
          />

          <Field
            label="Password"
            type="password"
            {...register("password", {
              required: "Please fill out this field.",
            })}
            error={errors.password?.message}
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Checking..." : "Login"}
            </Button>
          </div>

          <div className="text-left mt-2">
            <Link
              href="/forgot-password"
              className="text-xs text-[#00C2CB] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={handleSubmit(onOtpSubmit)}
          method="POST"
          action=""
          className="space-y-5"
          autoComplete="off"
        >
          <p className="text-sm text-gray-600 mb-4">
            We sent a 6-digit code to{" "}
            <span className="font-semibold">{displayEmail}</span>.
          </p>

          <Field
            label="Email OTP"
            type="text"
            {...register("otp", {
              required: "Please fill out this field.",
              pattern: {
                value: /^[A-Za-z0-9]{4,16}$/,
                message: "Enter a valid code pattern.",
              },
              onChange: (e) => {
                e.target.value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
              },
            })}
            maxLength={16}
            autoCapitalize="characters"
            error={errors.otp?.message}
            autoComplete="one-time-code"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {successMsg && (
            <p className="text-sm text-green-600 font-semibold">{successMsg}</p>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Log In"}
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs mt-4">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
                setSuccessMsg("");
              }}
              className="text-gray-500 hover:text-[#008B8B] font-semibold"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || loading}
              className={`font-semibold ${cooldown > 0 ? "text-gray-400 cursor-not-allowed" : "text-[#00C2CB] hover:underline"}`}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

export default function SignInPage() {
  const pathname = usePathname();

  return <SignInForm key={pathname} />;
}
