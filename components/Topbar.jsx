"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronDown, Menu } from "lucide-react";
import { api } from "@/lib/api";

export default function Topbar({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    api.logout();
    setOpen(false);
    router.replace("/signin");
  };

  return (
    <header className="flex items-center justify-between border-b border-brand py-4 px-4 lg:px-0">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-button"
          onClick={onMenuClick}
          className="md:hidden text-brand p-2"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold">Kisumu Operations Centre</p>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 hover:text-brand-active transition-colors"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Operator
            <ChevronDown
              className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-32 rounded-md border border-gray-200 bg-white shadow-lg z-1000">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
