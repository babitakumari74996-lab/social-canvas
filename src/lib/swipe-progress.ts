import { useSyncExternalStore } from "react";

// Live swipe state between bottom-nav sections. SwipeTabs writes it while a drag is in
// progress; the bottom nav reads it to move the indicator under the icons.
// `dx` is the finger's horizontal distance in px; `committed` means the swipe has been accepted.
export type SwipeProgress = { from: string; to: string; dx: number; committed?: boolean } | null;

let current: SwipeProgress = null;
const listeners = new Set<() => void>();

export function setSwipeProgress(p: SwipeProgress) {
  if (
    p === current ||
    (p &&
      current &&
      p.from === current.from &&
      p.to === current.to &&
      p.dx === current.dx &&
      p.committed === current.committed)
  ) {
    return;
  }
  current = p;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSwipeProgress(): SwipeProgress {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
