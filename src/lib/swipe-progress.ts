import { useSyncExternalStore } from "react";

// Live swipe state between bottom-nav sections. SwipeTabs writes it while a drag is in
// progress; the bottom nav reads it to move the indicator under the icons.
// `dx` is the finger's horizontal distance in px, `full` is the distance at which the swipe commits,
// and `committed` means it has been accepted.
export type SwipeProgress = { from: string; to: string; dx: number; full: number; committed?: boolean } | null;

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
      p.full === current.full &&
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
