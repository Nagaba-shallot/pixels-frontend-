"use client";

import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useIncidentDetails } from "../hooks/useIncidentDetails";
import { useIncidents } from "../hooks/useIncidents";
import { INCIDENT_STATUS } from "../lib/constants";
import { formatDateTime } from "../lib/format";
import { IncidentDetails } from "./IncidentDetails";
import "./IncidentsPage.css";

const IncidentMap = dynamic(
  () => import("./IncidentMap").then((module) => module.IncidentMap),
  {
    ssr: false,
    loading: () => <div className="incidents-page__map-fallback" />,
  },
);

export function IncidentsPage() {
  const [selectedId, setSelectedId] = useState(null);
  const { incidents, error, isLoading, updatedAt } = useIncidents();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  const selected =
    incidents.find((incident) => incident.id === selectedId) ?? null;

  const details = useIncidentDetails(selected, updatedAt);

  const needsPicker = incidents.length > 1;

  return (
    <div className="incidents-page">
      <Link href="/dashboard" className="incidents-page__back-link">
        <ArrowLeft size={14} aria-hidden="true" /> Back to Dashboard
      </Link>

      <h1 className="incidents-page__title">Live Incidents</h1>

      {error && (
        <div className="incidents-page__error" role="alert">
          {error}
        </div>
      )}

      {isLoading && <p className="incidents-page__note">Loading…</p>}

      {needsPicker && (
        <label className="incidents-page__picker">
          Incident
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            <option value="">-- Select an incident --</option>
            {incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.displayId} · {formatDateTime(incident.triggeredAt)} ·{" "}
                {INCIDENT_STATUS[incident.status].label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="incidents-page__card">
        <div className="incidents-page__map">
          {isMounted && (
            <IncidentMap
              incidents={incidents}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          )}

          {!isLoading && !error && incidents.length === 0 && (
            <p className="incidents-page__empty">
              No active incidents right now.
            </p>
          )}
        </div>

        {selected && (
          <div className="incidents-page__popup">
            <IncidentDetails incident={selected} {...details} />
          </div>
        )}
      </div>
    </div>
  );
}
