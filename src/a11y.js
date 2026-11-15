import { useEffect, useState } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks a media query. Starts at `false` on both server and client so the
 * first client render matches the prerendered HTML; the real value arrives
 * in an effect.
 * @param {string} query
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * Arrow/Home/End focus movement for a `role="tablist"` whose tabs use a
 * roving tabindex (selected tab 0, others -1). Attach to the tablist's
 * onKeyDown. `onMove` receives the newly focused index; pass the selection
 * setter for selection-follows-focus, or omit it for manual activation.
 * @param {import("react").KeyboardEvent<HTMLElement>} event
 * @param {(index: number) => void} [onMove]
 */
export function handleTabListKeyDown(event, onMove) {
  const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
  const current = tabs.indexOf(event.target);
  if (current === -1) return;

  const last = tabs.length - 1;
  let next;
  if (NEXT_KEYS.has(event.key)) next = current === last ? 0 : current + 1;
  else if (PREV_KEYS.has(event.key)) next = current === 0 ? last : current - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = last;
  else return;

  event.preventDefault();
  tabs[next].focus();
  onMove?.(next);
}
