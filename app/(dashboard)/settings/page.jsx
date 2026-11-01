"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/PageHeader";
import { Button, Field, Panel, Modal } from "@/components/ui";
import { api } from "@/lib/api";

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const [operators, setOperators] = useState([]);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [opError, setOpError] = useState("");
  const [opLoading, setOpLoading] = useState(false);

  const [operatorToDelete, setOperatorToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState({ type: "", message: "" });

  const [fishers, setFishers] = useState([]);
  const [loadingFishers, setLoadingFishers] = useState(true);
  const [selectedFisherId, setSelectedFisherId] = useState("");
  const [fisherLoading, setFisherLoading] = useState(false);
  const [fisherStatus, setFisherStatus] = useState({ type: "", message: "" });
  const [pendingOtp, setPendingOtp] = useState(null);
  const [otpInput, setOtpInput] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const {
    register: registerOp,
    handleSubmit: handleSubmitOp,
    formState: { errors: opErrors },
    reset: resetOp,
  } = useForm();

  const retry = () => {
    setLoadError("");
    setRetryKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const me = await api.getCurrentOperator();
        if (cancelled) return;
        setCurrentUser(me);
        if (me.role === "super_admin") {
          const ops = await api.getAllOperators();
          if (cancelled) return;
          setOperators(ops);
        }
      } catch (e) {
        if (cancelled) return;
        if (e?.status === 403) {
          setLoadError("You do not have access to operator management.");
        } else if (e?.status !== 401) {
          setLoadError(e?.message || "Failed to load account settings.");
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  useEffect(() => {
    let cancelled = false;
    setLoadingFishers(true);
    async function loadFishers() {
      try {
        const data = await api.getFishers("?limit=10000");
        if (cancelled) return;
        setFishers(data);
      } catch (err) {
        if (cancelled) return;
        if (err?.status !== 401) {
          setLoadError(
            (prev) => prev || err?.message || "Failed to load fishers.",
          );
        }
      } finally {
        if (!cancelled) setLoadingFishers(false);
      }
    }
    loadFishers();
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  async function handleCreateOperator(data) {
    setOpError("");
    setOpLoading(true);
    try {
      await api.createOperator(data);

      try {
        const ops = await api.getAllOperators();
        setOperators(ops);
      } catch (fetchErr) {
        console.warn("Operator created, but list refresh failed:", fetchErr);
      }

      setShowOperatorModal(false);
      resetOp();
    } catch (err) {
      setOpError(err.message || "Failed to create operator.");
    } finally {
      setOpLoading(false);
    }
  }

  async function confirmDeleteOperator() {
    if (!operatorToDelete || deleteBlocked || isDeleting) return;

    setDeleteError("");
    setIsDeleting(true);

    try {
      await Promise.all([
        api.deleteOperator(operatorToDelete.operator_id),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      setOperators((prev) =>
        prev.filter((o) => o.operator_id !== operatorToDelete.operator_id),
      );
      setOperatorToDelete(null);
    } catch (err) {
      setDeleteError(err?.message || "Failed to delete operator.");

      if (err?.status === 400 || err?.status === 409) {
        setDeleteBlocked(true);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setResetStatus({ type: "", message: "" });
    setResetLoading(true);
    try {
      if (resetStep === 1) {
        if (!resetEmail) throw new Error("Please enter your email.");
        await api.requestPasswordResetCode(resetEmail);
        setResetStatus({ type: "success", message: "Verification code sent." });
        setResetStep(2);
      } else if (resetStep === 2) {
        const data = await api.verifyPasswordResetCode(resetEmail, otpCode);
        setResetToken(data.reset_token);
        setResetStatus({
          type: "success",
          message: "Code verified. Enter new password.",
        });
        setResetStep(3);
      } else if (resetStep === 3) {
        if (newPassword !== confirmPassword)
          throw new Error("Passwords do not match.");
        await api.confirmPasswordReset(resetToken, newPassword);
        setResetStatus({ type: "success", message: "Password updated!" });

        setResetStep(1);
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setResetToken("");
        setResetEmail("");
      }
    } catch (err) {
      setResetStatus({ type: "error", message: err.message });
    } finally {
      setResetLoading(false);
    }
  }

  const saveFisherPhone = async (data) => {
    setFisherStatus({ type: "", message: "" });
    if (!selectedFisherId) {
      setFisherStatus({ type: "error", message: "Please select a fisher." });
      return;
    }
    setFisherLoading(true);
    try {
      const res = await api.updateFisherPhone(
        selectedFisherId,
        data.phone_number,
      );

      if (res.pending_phone_number) {
        setPendingOtp({
          fisherId: selectedFisherId,
          phone: res.pending_phone_number,
        });
        setFisherStatus({
          type: "success",
          message: "OTP sent to the new number.",
        });
      } else {
        setFisherStatus({
          type: "success",
          message: "Phone number is already up to date.",
        });
      }
    } catch (err) {
      setFisherStatus({ type: "error", message: err.message });
    } finally {
      setFisherLoading(false);
    }
  };

  const confirmOtp = async (otp) => {
    setFisherStatus({ type: "", message: "" });
    setFisherLoading(true);
    try {
      await api.confirmFisherPhone(pendingOtp.fisherId, otp);
      setFisherStatus({
        type: "success",
        message: `Phone number successfully updated!`,
      });
      setPendingOtp(null);
      setOtpInput("");
      setSelectedFisherId("");
      reset();
    } catch (err) {
      setFisherStatus({ type: "error", message: err.message });
    } finally {
      setFisherLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="System Settings" subtitle="Manage your account" />

      {loadError && (
        <div
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={retry}
            className="ml-4 rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid w-full min-w-0 gap-8 lg:grid-cols-2">
        {currentUser?.role === "super_admin" && (
          <Panel title="Operator Management" className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <p className="text-sm text-gray-500">
                Manage operators who can access the dashboard.
              </p>
              <Button
                onClick={() => setShowOperatorModal(true)}
                className="w-full sm:w-auto"
              >
                + Add Operator
              </Button>
            </div>

            <div className="w-full overflow-auto max-h-80 border border-gray-100 rounded-md">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#e5e7eb]">
                  <tr>
                    <th className="py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                      Name
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                      Email
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 whitespace-nowrap">
                      Role
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-700 text-right whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr
                      key={op.operator_id}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {op.first_name} {op.last_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {op.email}
                      </td>
                      <td className="py-3 px-4 text-sm uppercase text-gray-600 whitespace-nowrap">
                        {op.role}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setOperatorToDelete(op);
                            setDeleteError("");
                            setDeleteBlocked(false);
                          }}
                          className="text-red-500 hover:underline text-sm disabled:opacity-50"
                          disabled={isDeleting}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <Panel title="Landing Site Operator Account Settings">
          <form onSubmit={handlePasswordReset} className="space-y-5">
            {resetStep === 1 && (
              <Field
                label="Operator Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={resetLoading}
                required
              />
            )}
            {resetStep === 2 && (
              <Field
                label="Enter OTP Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                disabled={resetLoading}
                required
              />
            )}
            {resetStep === 3 && (
              <>
                <Field
                  label="Enter New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetLoading}
                  required
                />
                <Field
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetLoading}
                  required
                />
              </>
            )}
            {resetStatus.message && (
              <p
                className={`text-sm font-semibold ${resetStatus.type === "error" ? "text-red-600" : "text-green-600"}`}
              >
                {resetStatus.message}
              </p>
            )}
            <Button
              type="submit"
              className="!py-2 text-xs"
              disabled={resetLoading}
            >
              {resetLoading
                ? "Processing..."
                : resetStep === 1
                  ? "Send Reset Code"
                  : resetStep === 2
                    ? "Verify Code"
                    : "Save Changes"}
            </Button>
          </form>
        </Panel>

        <Panel title="Fisher Account Settings">
          <form onSubmit={handleSubmit(saveFisherPhone)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#12808f] mb-1">
                Select Fisher
              </label>
              <select
                value={selectedFisherId}
                onChange={(e) => setSelectedFisherId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                disabled={loadingFishers || fisherLoading}
              >
                <option value="">
                  {loadingFishers
                    ? "Loading fishers..."
                    : "-- Choose a fisher --"}
                </option>
                {fishers.map((f) => (
                  <option key={f.fisher_id} value={f.fisher_id}>
                    {f.full_name} ({f.phone_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#12808f] mb-1">
                Enter new phone number
              </label>
              <input
                type="tel"
                {...register("phone_number", {
                  required: "Phone number is required",
                  pattern: {
                    value: /^\+[1-9]\d{1,14}$/,
                    message: "Please include the country code (e.g., +254...)",
                  },
                })}
                disabled={fisherLoading}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                placeholder="+254 712 345 678"
              />
              {errors.phone_number && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            {fisherStatus.message && (
              <p
                className={`text-sm font-semibold ${fisherStatus.type === "error" ? "text-red-600" : "text-green-600"}`}
              >
                {fisherStatus.message}
              </p>
            )}

            <Button
              type="submit"
              className="!py-2 text-xs"
              disabled={fisherLoading}
            >
              {fisherLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Panel>
      </div>

      <Modal
        open={showOperatorModal}
        onClose={() => {
          setShowOperatorModal(false);
          resetOp();
        }}
        label="Create Operator"
      >
        <form
          onSubmit={handleSubmitOp(handleCreateOperator)}
          className="space-y-4"
        >
          <h2 className="text-lg font-bold mb-4">Create New Operator</h2>

          <Field
            label="First Name"
            {...registerOp("first_name", {
              required: "First name is required",
            })}
            error={opErrors.first_name?.message}
          />

          <Field
            label="Last Name"
            {...registerOp("last_name", { required: "Last name is required" })}
            error={opErrors.last_name?.message}
          />

          <Field
            label="Email"
            type="email"
            {...registerOp("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Invalid email format",
              },
            })}
            error={opErrors.email?.message}
          />

          <Field
            label="Password"
            type="password"
            {...registerOp("password", {
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters",
              },
            })}
            error={opErrors.password?.message}
          />

          {opError && <p className="text-red-500 text-sm">{opError}</p>}
          <Button type="submit" className="w-full" disabled={opLoading}>
            {opLoading ? "Creating..." : "Create Operator"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!operatorToDelete}
        onClose={() => {
          if (isDeleting) return;
          setOperatorToDelete(null);
          setDeleteError("");
        }}
        label="Confirm Delete"
      >
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-red-600">Delete Operator?</h2>
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete{" "}
            <strong>
              {operatorToDelete?.first_name} {operatorToDelete?.last_name}
            </strong>
            ? This action cannot be undone.
          </p>

          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <Button
              onClick={() => {
                setOperatorToDelete(null);
                setDeleteError("");
              }}
              disabled={isDeleting}
              className="flex-1 !bg-gray-200 !text-gray-800 hover:!bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteBlocked ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={confirmDeleteOperator}
              disabled={isDeleting || deleteBlocked}
              aria-busy={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting && <Spinner />}
              {isDeleting
                ? "Deleting..."
                : deleteBlocked
                  ? "Cannot Delete"
                  : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!pendingOtp}
        onClose={() => {
          if (fisherLoading) return;
          setPendingOtp(null);
          setOtpInput("");
        }}
        label="Confirm OTP"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmOtp(otpInput);
          }}
          className="space-y-4"
        >
          <h2 className="text-lg font-bold mb-2">Verify Phone Change</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter the OTP sent to {pendingOtp?.phone}.
          </p>

          <div>
            <label className="block text-sm font-medium text-[#12808f] mb-1">
              OTP Code
            </label>
            <input
              type="text"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              disabled={fisherLoading}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
            />
          </div>

          {fisherStatus.message && (
            <p
              className={`text-sm font-semibold ${fisherStatus.type === "error" ? "text-red-600" : "text-green-600"}`}
            >
              {fisherStatus.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={fisherLoading}>
            {fisherLoading ? "Verifying..." : "Confirm OTP"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
