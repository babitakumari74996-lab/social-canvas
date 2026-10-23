import { useSyncExternalStore } from "react";

// Live swipe progress between bottom-nav sections. SwipeTabs writes it while a drag is in
// progress; the bottom nav reads it to draw the progress lines under each icon.
export type SwipeProgress = { from: string; to: string; amount: number; committed?: boolean } | null;

let current: SwipeProgress = null;
const listeners = new Set<() => void>();

export function setSwipeProgress(p: SwipeProgress) {
  if (
    p === current ||
    (p &&
      current &&
      p.from === current.from &&
      p.to === current.to &&
      p.amount === current.amount &&
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
