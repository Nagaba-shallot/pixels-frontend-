"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isFocusableVisible(element) {
  return (
    element instanceof HTMLElement &&
    element.isConnected &&
    element.getAttribute("aria-hidden") !== "true" &&
    !element.closest("[inert]") &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

export default function useFocusTrap(
  containerRef,
  { onClose, initialFocusRef, returnFocusRef, fallbackFocusRef } = {},
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const previouslyFocused = document.activeElement;
    const returnTarget = returnFocusRef?.current;
    const fallbackTarget = fallbackFocusRef?.current;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        isFocusableVisible,
      );

    const focusElement = (element) => {
      if (
        !(element instanceof HTMLElement) ||
        !element.isConnected ||
        element.matches(":disabled") ||
        !isFocusableVisible(element)
      ) {
        return false;
      }

      element.focus({ preventScroll: true });

      return document.activeElement === element;
    };

    const focusInitial = () => {
      if (focusElement(initialFocusRef?.current)) return;

      const focusable = getFocusable();

      if (focusable.length > 0 && focusElement(focusable[0])) return;

      if (!container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }

      container.focus({ preventScroll: true });
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();

      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event) => {
      if (container.contains(event.target)) return;

      const focusable = getFocusable();

      if (focusable.length > 0) {
        focusable[0].focus({ preventScroll: true });
      } else {
        container.focus({ preventScroll: true });
      }
    };

    const animationFrame = requestAnimationFrame(focusInitial);

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      cancelAnimationFrame(animationFrame);

      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);

      if (focusElement(returnTarget)) return;
      if (focusElement(fallbackTarget)) return;

      focusElement(previouslyFocused);
    };
  }, [containerRef, initialFocusRef, returnFocusRef, fallbackFocusRef]);
}
