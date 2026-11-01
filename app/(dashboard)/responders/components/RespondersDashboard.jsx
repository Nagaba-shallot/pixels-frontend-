"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useResponderData } from "../hooks/useResponderData";
import { NearestResponders } from "./NearestResponders";
import "./RespondersDashboard.css";
import { ViewToggle } from "./ViewToggle";

const ResponderMap = dynamic(
  () => import("./ResponderMap").then((module) => module.ResponderMap),
  {
    ssr: false,
    loading: () => <div className="responders-page__map-fallback" />,
  },
);

export function RespondersDashboard() {
  const [view, setView] = useState("map");
  const { responders, errors, isLoading, retry } = useResponderData();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  return (
    <div className="responders-page">
      <Link href="/dashboard" className="responders-page__back-link">
        <ArrowLeft size={14} aria-hidden="true" /> Back to Dashboard
      </Link>
      <h1 className="responders-page__title">Responders</h1>

      <ViewToggle value={view} onChange={setView} />

      {errors.map((message) => (
        <div
          key={message}
          className="responders-page__error"
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{message}</span>
          <button
            onClick={retry}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              textDecoration: "underline",
              cursor: "pointer",
              fontWeight: "bold",
              padding: "4px 8px",
            }}
          >
            Retry
          </button>
        </div>
      ))}

      {isLoading && <p className="responders-page__loading">Loading…</p>}

      {view === "map" ? (
        isMounted && <ResponderMap responders={responders} />
      ) : (
        <NearestResponders responders={responders} />
      )}
    </div>
  );
}
