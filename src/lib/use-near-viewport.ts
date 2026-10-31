import { useEffect, useState, type RefObject } from "react";

/**
 * True while the element is on screen or within `margin` of it (for example "200px").
 * Used to start downloading a video before it is played, so playback does not wait for the network.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "200px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

/**
 * Recovers a video that failed to load (for example a dropped connection on a phone): reloads it once.
 * If it was the video that should be playing, it plays again. The flag is cleared when it can play.
 */
export function retryVideoOnError(el: HTMLVideoElement | null, wantPlay: boolean) {
  if (!el || el.dataset.retried === "1") return;
  el.dataset.retried = "1";
  el.load();
  if (wantPlay) el.play().catch(() => {});
}
