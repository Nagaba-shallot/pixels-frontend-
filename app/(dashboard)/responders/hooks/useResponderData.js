"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getResponders } from "../lib/api";

function describeError(label, error) {
  if (error?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (error?.status === 403) {
    return "You do not have access to this data.";
  }
  return `Could not load ${label}: ${error?.message ?? "Something went wrong"}`;
}

export function useResponderData() {
  const [responders, setResponders] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const inFlightRef = useRef(false);

  const retry = useCallback(() => {
    setIsLoading(true);
    setErrors([]);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (inFlightRef.current) return;
      setRetryCount((c) => c + 1);
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    inFlightRef.current = true;

    getResponders()
      .then((result) => {
        if (isCancelled) return;
        setResponders(result);
        setErrors([]);
      })
      .catch((error) => {
        if (isCancelled) return;
        setErrors([describeError("responders", error)]);
      })
      .finally(() => {
        inFlightRef.current = false;
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [retryCount]);

  return { responders, errors, isLoading, retry };
}
