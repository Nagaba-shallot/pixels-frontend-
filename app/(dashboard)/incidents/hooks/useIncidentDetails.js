"use client";

import { useEffect, useState } from "react";
import { getAlertResponders, getFisher } from "../lib/api";
import { describeError } from "../lib/errors";

const EMPTY = { alertId: null, fisher: null, responders: [], errors: [] };

export function useIncidentDetails(incident, refreshKey) {
  const alertId = incident?.id ?? null;
  const fisherId = incident?.fisherId ?? null;
  const [result, setResult] = useState(EMPTY);

  useEffect(() => {
    if (!alertId) return;
    let isCancelled = false;

    Promise.allSettled([getFisher(fisherId), getAlertResponders(alertId)]).then(
      ([fisherResult, respondersResult]) => {
        if (isCancelled) return;

        const errors = [];
        if (fisherResult.status === "rejected") {
          errors.push(describeError("fisher details", fisherResult.reason));
        }
        if (respondersResult.status === "rejected") {
          errors.push(describeError("responders", respondersResult.reason));
        }

        setResult({
          alertId,
          fisher:
            fisherResult.status === "fulfilled" ? fisherResult.value : null,
          responders:
            respondersResult.status === "fulfilled"
              ? respondersResult.value
              : [],
          errors: [...new Set(errors)],
        });
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [alertId, fisherId, refreshKey]);

  const isCurrent = result.alertId === alertId;
  return {
    fisher: isCurrent ? result.fisher : null,
    responders: isCurrent ? result.responders : [],
    errors: isCurrent ? result.errors : [],
    isLoading: Boolean(alertId) && !isCurrent,
  };
}
