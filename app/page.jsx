"use client";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";

export default function Home() {
  return (
    <AuthShell>
      <div className="flex flex-col items-start justify-center h-full">
        <h1 className="text-4xl font-bold text-[#008B8B] mb-4 leading-tight">
          Protecting Fishers on Lake Victoria.
        </h1>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          A real-time command centre for monitoring fishers on the lake and
          coordinating rapid emergency responses. Log in to access the
          operations dashboard.
        </p>
        <Link
          href="/signin"
          className="bg-[#008B8B] text-white text-lg font-medium rounded px-8 py-3 hover:bg-[#007373] transition-colors w-full text-center"
        >
          Log In to Dashboard
        </Link>
      </div>
    </AuthShell>
  );
}
