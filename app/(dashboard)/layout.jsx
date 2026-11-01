"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col px-4 md:px-6 lg:px-10">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex flex-1 flex-col py-6">{children}</main>
      </div>
    </div>
  );
}
