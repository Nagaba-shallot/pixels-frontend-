"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  Siren,
  Anchor,
  Watch,
  Users,
  FileText,
  Settings,
  X,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/fishers", label: "Fishers", icon: Anchor },
  { href: "/wristbands", label: "Wristbands", icon: Watch },
  { href: "/responders", label: "Responders", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const subscribe = (callback) => {
  const mediaQuery = window.matchMedia("(max-width: 767px)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
};
const getSnapshot = () => window.matchMedia("(max-width: 767px)").matches;
const getServerSnapshot = () => false;

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const isMobile = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && isMobile) {
        onClose();
        document.getElementById("mobile-menu-button")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile, onClose]);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  return (
    <>
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-[100] bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        inert={isMobile && !isOpen}
        className={`fixed inset-y-0 left-0 z-[110] flex w-64 flex-col bg-brand transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } pt-6 md:pt-14`}
        aria-label="Main Navigation"
      >
        <div className="mb-10 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logo2.svg"
              alt="MvuviGo"
              width={200}
              height={66}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-aqua"
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Main">
          <ul>
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-4 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-active/70 ${active ? "bg-brand-active" : ""}`}
                  >
                    <Icon className="h-6 w-6 text-aqua" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
