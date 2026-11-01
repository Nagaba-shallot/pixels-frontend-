"use client";

import { useEffect, useState } from "react";
import { getActiveIncidents } from "../lib/api";
import { POLL_INTERVAL_MS } from "../lib/constants";
import { describeError } from "../lib/errors";

export function useIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const next = await getActiveIncidents();
        if (isCancelled) return;
        setIncidents(next);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (caught) {
        if (isCancelled) return;
        setError(describeError("incidents", caught));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { incidents, error, isLoading, updatedAt };
}
