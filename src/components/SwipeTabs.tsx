import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { setSwipeProgress } from "@/lib/swipe-progress";

export type SwipeTab = {
  key: string;
  label: string;
  to: string;
  params?: Record<string, string>;
  icon: ComponentType<{ className?: string }>;
};

const ANIM_MS = 260;
// Share of the screen width the finger must cover before a swipe commits (and the indicator arrives).
const SWIPE_COMMIT = 0.9;
const EASE = "cubic-bezier(.2,.8,.2,1)";

/**
 * Horizontal swipe / drag between bottom-nav sections (Home, Reels, Profile).
 * Works with touch and mouse. The current page follows the pointer, a panel for the
 * neighbouring tab is revealed from the swiped side, and the router navigates once the
 * gesture is committed. Otherwise the page snaps back.
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

  // Latest values for the listeners, which are attached once.
  const latest = useRef({ tabs, activeIndex, enabled });
  latest.current = { tabs, activeIndex, enabled };
  const navRef = useRef(navigate);
  navRef.current = navigate;

  useEffect(() => {
    const main = mainRef.current;
    const pv = previewRef.current;
    if (!main || !pv) return;

    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    let width = window.innerWidth; // width of the swipeable area, measured at gesture start
    let tracking = false;
    let busy = false;
    let pid = -1;
    let sx = 0;
    let sy = 0;
    let st = 0;
    let lock: "h" | "v" | null = null;
    let dx = 0;
    let target: number | null = null;
    let dir: 1 | -1 = 1;
    let suppressClick = false;

    const setMain = (x: number, anim: boolean) => {
      main.style.transition = anim ? `transform ${ANIM_MS}ms ${EASE}` : "none";
      main.style.transform = `translate3d(${x}px,0,0)`;
    };
    // Back to rest: no inline transform, so fixed-position children of the page behave normally.
    const rest = () => {
      main.style.transition = "";
      main.style.transform = "";
    };
    const setPv = (x: number, anim: boolean) => {
      pv.style.transition = anim ? `transform ${ANIM_MS}ms ${EASE}` : "none";
      pv.style.transform = `translate3d(${x}px,0,0)`;
    };

    // Ignore gestures that start on inputs, or inside a horizontally scrollable element
    // (carousels, story row), so those keep their own scrolling.
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

    const hidePreview = () => setPreview(null);

    const snapBack = () => {
      setSwipeProgress(null);
      setMain(0, true);
      setPv(dir * width, true);
      later(() => {
        rest();
        hidePreview();
      }, ANIM_MS);
    };

    const onDown = (e: PointerEvent) => {
      if (busy || tracking || !latest.current.enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (blocked(e.target)) return;
      tracking = true;
      pid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      st = Date.now();
      lock = null;
      dx = 0;
      target = null;
      suppressClick = false;
      width = main.getBoundingClientRect().width || window.innerWidth;
      const rect = main.getBoundingClientRect();
      pv.style.left = `${rect.left}px`;
      pv.style.width = `${rect.width}px`;
    };

    const onMove = (e: PointerEvent) => {
      if (!tracking || busy || e.pointerId !== pid) return;
      const cx = e.clientX - sx;
      const cy = e.clientY - sy;
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
      const d: 1 | -1 = dx < 0 ? 1 : -1; // swipe left -> next tab, swipe right -> previous tab
      const ti = idx + d;
      const valid = idx >= 0 && ti >= 0 && ti < latest.current.tabs.length;
      if (valid) {
        target = ti;
        dir = d;
        setPreview((p) => (p && p.index === ti && p.dir === d ? p : { index: ti, dir: d }));
        pv.style.display = "flex";
        setMain(dx, false);
        setPv(dx + d * width, false);
        // Progress toward the commit point (30% of the width), capped at 1.
        const tabsNow = latest.current.tabs;
        setSwipeProgress({
          from: tabsNow[idx].key,
          to: tabsNow[ti].key,
          dx: Math.abs(dx),
          full: width * SWIPE_COMMIT, // same distance at which the swipe commits
        });
      } else {
        target = null;
        setSwipeProgress(null);
        setMain(dx * 0.25, false); // rubber-band at the ends
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pid) return;
      tracking = false;
      if (lock !== "h") return;
      suppressClick = Math.abs(dx) > 8; // don't let the drag also trigger a click
      if (target === null) {
        setSwipeProgress(null);
        setMain(0, true);
        later(rest, ANIM_MS);
        return;
      }
      // Commit only once the finger has moved most of the width, so the indicator and the page stay in step.
      const commit = Math.abs(dx) > width * SWIPE_COMMIT;
      if (!commit) {
        snapBack();
        return;
      }

      busy = true;
      const to = latest.current.tabs[target];
      const d = dir;
      // Committed: fill the target line, then clear once the navigation has finished.
      // Committed: the line glides the rest of the way to the target, then clears after the navigation.
      setSwipeProgress({ from: latest.current.tabs[latest.current.activeIndex]?.key ?? "", to: to.key, dx: 0, full: 1, committed: true });
      later(() => setSwipeProgress(null), ANIM_MS * 2);
      // Current page slides out on the far side while the neighbour panel covers the area.
      setMain(-d * width, true);
      setPv(0, true);
      later(async () => {
        try {
          await navRef.current({ to: to.to, params: to.params } as never);
        } finally {
          // New page enters from the swiped side.
          setMain(d * width, false);
          void main.offsetWidth;
          setMain(0, true);
          setPv(d * width, false);
          later(() => {
            rest();
            hidePreview();
            busy = false;
          }, ANIM_MS);
        }
      }, ANIM_MS);
    };

    const onCancel = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pid) return;
      tracking = false;
      setSwipeProgress(null);
      if (lock === "h" && target !== null) snapBack();
      else if (lock === "h") {
        setMain(0, true);
        later(rest, ANIM_MS);
      }
    };

    // Swallow the click that follows a horizontal drag (mouse only fires one).
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    main.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("click", onClickCapture, true);
    setPv(window.innerWidth, false);

    return () => {
      main.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("click", onClickCapture, true);
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
        className="fixed top-0 bottom-0 bg-background flex-col items-center justify-center gap-4 pointer-events-none"
        style={{ display: pvTab ? "flex" : "none", left: 0, width: "100%" }}
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
      {/* pan-y: the browser keeps vertical scrolling and leaves horizontal drags to us. */}
      <main ref={mainRef} className={`${className} touch-pan-y`}>
        {children}
      </main>
    </>
  );
}
