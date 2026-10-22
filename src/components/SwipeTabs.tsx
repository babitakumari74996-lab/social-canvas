import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

export type SwipeTab = {
  key: string;
  label: string;
  to: string;
  params?: Record<string, string>;
  icon: ComponentType<{ className?: string }>;
};

const ANIM_MS = 260;

/**
 * Mobile-only horizontal swipe between bottom-nav sections.
 * The current page follows the finger, a panel for the neighbouring tab slides in
 * from the swiped side, and the router navigates once the swipe is committed.
 */
export function SwipeTabs({
  tabs,
  activeIndex,
  enabled,
  className = "",
  children,
}: {
  tabs: SwipeTab[];
  activeIndex: number;
  enabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ index: number; dir: 1 | -1 } | null>(null);

  // Latest props for the native listeners (attached once).
  const latest = useRef({ tabs, activeIndex, enabled });
  latest.current = { tabs, activeIndex, enabled };
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    const main = mainRef.current;
    const pv = previewRef.current;
    if (!main || !pv) return;

    const W = () => window.innerWidth;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    let tracking = false;
    let busy = false;
    let sx = 0;
    let sy = 0;
    let st = 0;
    let lock: "h" | "v" | null = null;
    let dx = 0;
    let target: number | null = null;
    let dir: 1 | -1 = 1;

    const setMain = (x: number, anim: boolean) => {
      main.style.transition = anim ? `transform ${ANIM_MS}ms cubic-bezier(.2,.8,.2,1)` : "none";
      main.style.transform = `translate3d(${x}px,0,0)`;
    };
    const setPv = (x: number, anim: boolean) => {
      pv.style.transition = anim ? `transform ${ANIM_MS}ms cubic-bezier(.2,.8,.2,1)` : "none";
      pv.style.transform = `translate3d(${x}px,0,0)`;
    };

    const isMobile = () => window.matchMedia("(max-width: 767.98px)").matches;

    // Ignore swipes that start on inputs or inside a horizontally scrollable element (carousels, story row).
    const blocked = (el: EventTarget | null) => {
      let n = el as HTMLElement | null;
      while (n && n !== main) {
        if (n.matches?.("input,textarea,select,[contenteditable='true'],[data-no-swipe]")) return true;
        if (n.scrollWidth > n.clientWidth + 1) {
          const ov = getComputedStyle(n).overflowX;
          if (ov === "auto" || ov === "scroll") return true;
        }
        n = n.parentElement;
      }
      return false;
    };

    const snapBack = () => {
      setMain(0, true);
      setPv(dir * W(), true);
      later(() => setPreview(null), ANIM_MS);
    };

    const onStart = (e: TouchEvent) => {
      if (busy || !latest.current.enabled || !isMobile()) return;
      if (e.touches.length !== 1 || blocked(e.target)) return;
      const t = e.touches[0];
      tracking = true;
      sx = t.clientX;
      sy = t.clientY;
      st = Date.now();
      lock = null;
      dx = 0;
      target = null;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking || busy) return;
      const t = e.touches[0];
      const cx = t.clientX - sx;
      const cy = t.clientY - sy;
      if (lock === null) {
        if (Math.abs(cx) < 8 && Math.abs(cy) < 8) return;
        lock = Math.abs(cx) > Math.abs(cy) ? "h" : "v";
        if (lock === "v") {
          tracking = false;
          return;
        }
      }
      dx = cx;
      const idx = latest.current.activeIndex;
      const d: 1 | -1 = dx < 0 ? 1 : -1;
      const ti = idx + d;
      const valid = idx >= 0 && ti >= 0 && ti < latest.current.tabs.length;
      if (valid) {
        target = ti;
        dir = d;
        setPreview((p) => (p && p.index === ti && p.dir === d ? p : { index: ti, dir: d }));
        setMain(dx, false);
        setPv(dx + d * W(), false);
      } else {
        target = null;
        setMain(dx * 0.25, false); // rubber-band at the edges
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (lock !== "h" || target === null) {
        if (lock === "h") setMain(0, true);
        return;
      }
      const elapsed = Math.max(1, Date.now() - st);
      const v = dx / elapsed; // px per ms
      const w = W();
      const commit = Math.abs(dx) > w * 0.3 || (Math.abs(dx) > 24 && Math.abs(v) > 0.45);
      if (!commit) {
        snapBack();
        return;
      }

      busy = true;
      const to = latest.current.tabs[target];
      const d = dir;
      // Current page slides out on the far side while the neighbour panel covers the screen.
      setMain(-d * w, true);
      setPv(0, true);
      later(async () => {
        try {
          await navRef.current({ to: to.to, params: to.params } as never);
        } finally {
          // New page enters from the swiped side.
          setMain(d * w, false);
          void main.offsetWidth;
          setMain(0, true);
          setPreview(null);
          setPv(d * w, false);
          later(() => {
            busy = false;
          }, ANIM_MS);
        }
      }, ANIM_MS);
    };

    const onCancel = () => {
      if (!tracking) return;
      tracking = false;
      if (lock === "h" && target !== null) snapBack();
      else setMain(0, true);
    };

    main.addEventListener("touchstart", onStart, { passive: true });
    main.addEventListener("touchmove", onMove, { passive: true });
    main.addEventListener("touchend", onEnd);
    main.addEventListener("touchcancel", onCancel);
    setPv(W(), false);

    return () => {
      main.removeEventListener("touchstart", onStart);
      main.removeEventListener("touchmove", onMove);
      main.removeEventListener("touchend", onEnd);
      main.removeEventListener("touchcancel", onCancel);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pvTab = preview ? tabs[preview.index] : null;
  const PvIcon = pvTab?.icon;

  return (
    <>
      <div
        ref={previewRef}
        aria-hidden
        className="md:hidden fixed top-12 bottom-14 inset-x-0 bg-background flex-col items-center justify-center gap-4"
        style={{ display: pvTab ? "flex" : "none" }}
      >
        {pvTab && PvIcon && (
          <>
            <div className="h-28 w-28 rounded-[32px] bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] flex items-center justify-center text-white shadow-lg">
              <PvIcon className="h-12 w-12" />
            </div>
            <span className="text-lg font-semibold">{pvTab.label}</span>
          </>
        )}
      </div>
      <main ref={mainRef} className={className}>
        {children}
      </main>
    </>
  );
}
