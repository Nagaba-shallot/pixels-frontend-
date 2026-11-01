"use client";
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, X } from "lucide-react";

export function Field({ label, id, className = "", type, error, ...props }) {
  const fid = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className={className}>
      <label
        htmlFor={fid}
        className="mb-2 block text-[17px] font-bold text-gray-900"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fid}
          type={inputType}
          className={`w-full rounded border px-4 py-3 text-base text-gray-800 focus:outline-none focus:ring-1 transition-colors ${
            isPassword ? "pr-11" : ""
          } ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-teal-600 focus:ring-teal-600"
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#008B8B]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <span className="text-sm text-red-600 font-medium mt-1 block">
          {error}
        </span>
      )}
    </div>
  );
}

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-[#008B8B] text-white text-base font-medium rounded px-4 py-3 hover:bg-[#007373] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-aqua bg-white p-5 flex flex-col h-full w-full min-w-0 overflow-hidden ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-brand">{title}</h2>
      )}
      {children}
    </section>
  );
}

const TONES = {
  "SOS Alert": "font-semibold text-red-600",
  Active: "text-green-700",
  Offline: "text-gray-600",
  Resolved:
    "rounded-full bg-green-400 px-3 py-0.5 text-xs font-semibold text-white",
  Action:
    "rounded-full bg-red-200 px-3 py-0.5 text-xs font-semibold text-red-700",
  Pending: "font-semibold text-red-600",
  Delivered: "text-gray-900",
  Sent: "text-gray-900",
};

export function Status({ value }) {
  return <span className={TONES[value] ?? ""}>{value}</span>;
}

export function DataTable({
  columns,
  rows,
  getKey,
  empty = "Nothing to show yet.",
  maxHeight = "h-full",
}) {
  return (
    <div className={`overflow-auto ${maxHeight}`}>
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-brand text-white">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-6 py-4 font-medium ${c.className ?? ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-gray-500"
              >
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={getKey(row, i)} className="border-b border-gray-300">
              {columns.map((c) => (
                <td key={c.key} className="px-6 py-4">
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, label, children }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;

      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
        }
      }, 50);

      function handleKeyDown(e) {
        if (e.key === "Escape") {
          onClose();
        }
        if (e.key === "Tab" && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      }

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        setTimeout(() => {
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
        }, 50);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand rounded"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
