"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { POLL_INTERVAL_MS } from "../lib/constants";

export function useIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const alerts = await api.getAllAlerts();

        if (isCancelled) return;

        const formatted = alerts
          .filter((alert) => {
            return !alert.resolved_at;
          })
          .map((alert) => {
            return {
              id: alert.alert_id,
              displayId: alert.alert_id.slice(0, 8).toUpperCase(),
              latitude: alert.latitude,
              longitude: alert.longitude,
              status: alert.status,
              triggeredAt: alert.triggered_at,
              fisherId: alert.fisher_id,
              fisherCount: alert.number_of_fishers || 1,
            };
          });

        setIncidents(formatted);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (err) {
        if (isCancelled) return;
        setError("Failed to load live incidents.");
        console.error("Incidents load error:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS || 2000);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { incidents, error, isLoading, updatedAt };
}