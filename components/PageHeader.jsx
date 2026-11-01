import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({ title, subtitle, back = true }) {
  return (
    <div className="mb-5">
      {back && (
        <Link
          href="/dashboard"
          className="mb-1 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Dashboard
        </Link>
      )}
      <h1 className="text-3xl font-semibold text-brand">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
