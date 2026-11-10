"use client";

import { useEffect, useState, useCallback } from "react";
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

  const retry = useCallback(() => {
    setIsLoading(true);
    setErrors([]);
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId;

    async function load() {
      const fetchPromise = getResponders();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Server took too long to respond.")), 8000)
      );

      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        if (isCancelled) return;
        setResponders(result);
        setErrors([]);
      } catch (error) {
        if (isCancelled) return;
        setErrors([describeError("responders", error)]);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          timeoutId = setTimeout(load, 8000);
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [retryCount]);

  return { responders, errors, isLoading, retry };
}