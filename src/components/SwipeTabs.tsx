import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { setSwipeProgress } from "@/lib/swipe-progress";
import { getDemo, subscribeDemo } from "@/lib/demo-store";

export type SwipeTab = {
  key: string;
  label: string;
  /** Route of the tab's page. Omitted for overlay tabs. */
  to?: string;
  params?: Record<string, string>;
  /** Overlay tabs (Create, Explore) open a panel instead of a page. */
  overlay?: "create" | "search";
  icon: ComponentType<{ className?: string }>;
};

const ANIM_MS = 260;
// Share of the screen width the finger must cover before a swipe commits (and the indicator arrives).
const SWIPE_COMMIT = 0.2;
const EASE = "cubic-bezier(.2,.8,.2,1)";

// URL of a tab's page in embed mode (no header, nav or swipe chrome).
function embedPath(t: SwipeTab) {
  return `${t.to!.replace(/\$(\w+)/g, (_, k: string) => t.params?.[k] ?? "")}?embed=1`;
}

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
  overlayKey = null,
  onOverlay,
  className = "",
  children,
}: {
  tabs: SwipeTab[];
  activeIndex: number;
  enabled: boolean;
  /** The open overlay (create or search), if any. Swiping from an overlay moves to the next overlay or page. */
  overlayKey?: "create" | "search" | null;
  /** Opens an overlay tab, or closes the open overlay when given null. */
  onOverlay?: (key: "create" | "search" | null) => void;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const router = useRouter();

  // Load the neighbouring routes' code, so a committed swipe never waits for it. Starts after the
  // first screen is up, so it doesn't compete with the first screen's photos for bandwidth.
  useEffect(() => {
    const id = window.setTimeout(() => {
      tabs.forEach((t) => {
        if (t.to) void router.preloadRoute({ to: t.to, params: t.params } as never);
      });
    }, 1500);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mainRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ index: number; dir: 1 | -1 } | null>(null);

  // Latest values for the listeners, which are attached once.
  const latest = useRef({ tabs, activeIndex, enabled, overlayKey });
  latest.current = { tabs, activeIndex, enabled, overlayKey };
  const onOverlayRef = useRef(onOverlay);
  onOverlayRef.current = onOverlay;
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
    let mainBox = { left: 0, width: window.innerWidth }; // the main column's box at gesture start
    let tracking = false;
    let busy = false;
    let pid = -1;
    let sx = 0;
    let sy = 0;
    let st = 0;
    let lock: "h" | "v" | null = null;
    let touchGesture = false; // touch: a vertical start hands the gesture to the browser's scroll
    let dx = 0;
    let target: number | null = null;
    let dir: 1 | -1 = 1;
    let suppressClick = false;
    // A swipe that starts on Reels runs with <main> at margin 0, so the full-window Reels layer keeps its
    // left edge while <main> moves (otherwise it starts at the sidebar's 330px and jumps back on release).
    let fromReels = false;
    // The top bars never move sideways for a swipe that touches Reels: they only slide up/down
    // (Reels -> Home they come down from the top, as before).
    let barsFollow = true;

    // The top bars are global (not inside <main>), so they only follow the page while a drag is in progress.
    // `bars` = false: the page moves but the bars keep their own place (used once a swipe commits).
    const setMain = (x: number, anim: boolean, bars = true) => {
      main.style.transition = anim ? `transform ${ANIM_MS}ms ${EASE}` : "none";
      main.style.transform = `translate3d(${x}px,0,0)`;
      main.style.marginLeft = fromReels ? "0px" : "";
      if (bars) setBars(x, anim);
    };
    // Top bars: same offset as the page, written in the same frame as the page.
    const setBars = (x: number, anim: boolean) => {
      const root = document.documentElement;
      if (!barsFollow) x = 0;
      root.style.transition = anim ? `--swipe-x ${ANIM_MS}ms ${EASE}` : "none";
      root.style.setProperty("--swipe-x", `${x}px`);
    };
    // Back to rest: no inline transform, so fixed-position children of the page behave normally.
    const rest = () => {
      main.style.transition = "";
      main.style.transform = "";
      main.style.marginLeft = "";
      main.style.visibility = "";
      document.documentElement.style.setProperty("--swipe-x", "0px");
      document.documentElement.style.transition = "";
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
    // The page fades out while swiping to Reels, and stays faded until the commit finishes. Once the new
    // page is in place, bring it back at once: otherwise the Reels page itself stays invisible (a white screen)
    // until the swipe state clears a moment later.
    const endCommitFade = () => {
      setSwipeProgress(null);
      document.documentElement.style.setProperty("--feed-opacity", "1");
    };

    const snapBack = () => {
      setSwipeProgress(null);
      setMain(0, true);
      setPv(dir * width, true);
      later(() => {
        rest();
        hidePreview();
      }, ANIM_MS);
    };

    // Preview pages get the opening page's state; each gets a copy only when it has changed.
    const sentTo = new WeakMap<Window, unknown>();
    const sendState = (w: Window | null | undefined, force = false) => {
      if (!w) return;
      const snap = getDemo();
      if (!force && sentTo.get(w) === snap) return;
      sentTo.set(w, snap);
      w.postMessage({ type: "sv-embed-refresh", demo: snap }, window.location.origin);
    };
    const onEmbedReady = (e: MessageEvent) => {
      if (e.data?.type === "sv-embed-ready" && e.source) sendState(e.source as Window, true);
    };
    window.addEventListener("message", onEmbedReady);
    // Keep every preview in step with the page as the data changes, not only when a swipe starts.
    const unsubDemo = subscribeDemo(() => {
      pv.querySelectorAll("iframe").forEach((f) => sendState(f.contentWindow));
    });

    const onDown = (e: PointerEvent) => {
      fromReels = window.location.pathname.startsWith("/reels");
      barsFollow = !fromReels;
      if (busy || tracking || !latest.current.enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (blocked(e.target)) return;
      pv.querySelectorAll("iframe").forEach((f) => sendState(f.contentWindow));
      tracking = true;
      pid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      st = Date.now();
      lock = null;
      touchGesture = e.pointerType !== "mouse";
      dx = 0;
      target = null;
      suppressClick = false;
      width = main.getBoundingClientRect().width || window.innerWidth;
      // The preview covers the whole window (on desktop the sidebar column too), so the incoming page is
      // never cut off at the sidebar edge. On mobile the main column is already full width.
      mainBox = { left: main.getBoundingClientRect().left, width: width };
      pv.style.left = "0px";
      pv.style.width = `${window.innerWidth}px`;
      pv.style.background = ""; // no light flash before the target is known
    };

    // Pointer moves can fire faster than the screen refreshes. Only the latest position is applied,
    // once per animation frame, so the page follows the finger without re-rendering on every event.
    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    const applyMove = (cx: number, cy: number) => {
      if (lock === null) {
        if (Math.abs(cx) < 8 && Math.abs(cy) < 8) return;
        if (Math.abs(cx) <= Math.abs(cy)) {
          // Vertical so far. Touch hands the gesture to the page's scroll; a mouse keeps waiting,
          // so a hold with a small vertical drift can still become a horizontal swipe.
          if (touchGesture) tracking = false;
          return;
        }
        lock = "h";
        window.getSelection()?.removeAllRanges(); // clear anything the drag already selected
        // Once it is a real horizontal drag, keep the pointer on the page: a release over an iframe would
        // otherwise never reach the page, and the swipe would stay stuck half-way. (Not set on a plain
        // click, so clicks on buttons keep their normal target.)
        if (!touchGesture) {
          try { main.setPointerCapture(pid); } catch { /* not supported: the window listeners still work */ }
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
        const tgt = latest.current.tabs[ti];
        barsFollow = !fromReels && tgt.key !== "reels";
        // Reels covers the whole window (its sidebar column too). Other pages render in the main column's box,
        // so their layout matches the page and the sidebar never covers them.
        // Black is set here, in the same frame as the geometry. The layer's React style would apply it one
        // render later, and until then the light background class would flash over the whole window.
        if (tgt.key === "reels") {
          pv.style.left = "0px";
          pv.style.width = `${window.innerWidth}px`;
          pv.style.background = "#000";
        } else {
          pv.style.left = `${mainBox.left}px`;
          pv.style.width = `${mainBox.width}px`;
          pv.style.background = "";
        }
        const fromOverlay = !!latest.current.overlayKey;
        if (tgt.to && !fromOverlay) {
          // A page neighbour: reveal its real page from the swiped side.
          setPreview((p) => (p && p.index === ti && p.dir === d ? p : { index: ti, dir: d }));
          setMain(dx, false);
          // Reels preview is full-window (left 0), so it sits one window-width away; other pages sit one column-width away.
          setPv(dx + d * (tgt.key === "reels" ? window.innerWidth : width), false);
        } else {
          // An overlay (Create / Explore) has no page to reveal: the page only rubber-bands,
          // or stays put while an overlay is already open over it.
          // Not moving the page here: a rubber-band would slide it off the edge and show white behind it.
          setPreview(null);
          setMain(0, false);
        }
        // Progress toward the commit point (30% of the width), capped at 1.
        const tabsNow = latest.current.tabs;
        setSwipeProgress({
          from: tabsNow[idx].key,
          to: tabsNow[ti].key,
          dx: Math.abs(dx),
          full: width, // indicator travels in step with the page: full width = full distance
        });
      } else {
        target = null;
        setSwipeProgress(null);
        setMain(dx * 0.25, false); // rubber-band at the ends
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!tracking || busy || e.pointerId !== pid) return;
      // Watchdog: a mouse move with no button held means the release was missed. End the drag as a release.
      if (e.pointerType === "mouse" && e.buttons === 0) {
        onUp(e);
        return;
      }
      lastX = e.clientX - sx;
      lastY = e.clientY - sy;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (tracking && !busy) applyMove(lastX, lastY);
      });
    };

    const onUp = (e: PointerEvent) => {
      if (!tracking || e.pointerId !== pid) return;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        applyMove(lastX, lastY); // apply the final position before deciding
      }
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
      if (!to.to || latest.current.overlayKey) {
        // Overlay target, or a swipe out of an open overlay: no page slide. Open the target after the
        // indicator arrives; a page target closes the overlay and navigates to it.
        setSwipeProgress({ from: latest.current.tabs[latest.current.activeIndex]?.key ?? "", to: to.key, dx: 0, full: 1, committed: true });
        later(() => setSwipeProgress(null), ANIM_MS * 2);
        setMain(0, true);
        later(async () => {
          try {
            if (to.overlay) {
              onOverlayRef.current?.(to.overlay);
            } else {
              onOverlayRef.current?.(null);
              await navRef.current({ to: to.to, params: to.params } as never);
            }
          } finally {
            rest();
            hidePreview();
            endCommitFade();
            busy = false;
          }
        }, ANIM_MS);
        return;
      }
      // Committed: fill the target line, then clear once the navigation has finished.
      // Committed: the line glides the rest of the way to the target, then clears after the navigation.
      setSwipeProgress({ from: latest.current.tabs[latest.current.activeIndex]?.key ?? "", to: to.key, dx: 0, full: 1, committed: true });
      later(() => setSwipeProgress(null), ANIM_MS * 2);
      // Current page slides out on the far side while the neighbour panel covers the area.
      // Leaving Reels: its full-window layer is hidden at once, so it never stays on top of the incoming page.
      if (window.location.pathname.startsWith("/reels")) main.style.visibility = "hidden";
      setMain(-d * width, true, false);
      // The bars settle in their own place (Home: back to 0) instead of following the page off-screen,
      // so they never disappear while the destination is loading.
      setBars(0, true);
      setPv(0, true);
      later(async () => {
        try {
          await navRef.current({ to: to.to, params: to.params } as never);
        } finally {
          // The real page mounts off-screen, then appears in place once it has painted. No entering
          // slide: the switch is instant, and the preview is removed in the same frame.
          setMain(d * width, false, false);
          void main.offsetWidth;
          await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          rest();
          hidePreview();
          endCommitFade();
          busy = false;
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

    // Gestures start on the page, or on an open Create/Explore panel (marked data-overlay-swipe).
    const onDocDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (main.contains(t) || t?.closest?.("[data-overlay-swipe]")) onDown(e);
    };
    document.addEventListener("pointerdown", onDocDown);
    // Once a gesture is locked as horizontal, stop the browser from also scrolling a vertical
    // scroller underneath (e.g. the Reels feed, which snaps to the next reel).
    const onTouchMove = (e: TouchEvent) => {
      if (tracking && lock === "h" && e.cancelable) e.preventDefault();
    };
    main.addEventListener("touchmove", onTouchMove, { passive: false });
    // During a drag (mouse, trackpad or touch) wheel scrolling must not move the scroller underneath.
    const onWheel = (e: WheelEvent) => {
      if ((tracking || busy) && e.cancelable) e.preventDefault();
    };
    main.addEventListener("wheel", onWheel, { passive: false });
    // A mouse drag on an image or link would start the browser's native drag, which cancels the
    // pointer gesture. Block it inside the page so horizontal drags reach the swipe logic.
    const onDragStart = (e: DragEvent) => {
      if (main.contains(e.target as Node)) e.preventDefault();
    };
    main.addEventListener("dragstart", onDragStart);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    // Leaving the window mid-drag: end the drag so it can never stay half-way.
    const onBlur = () => {
      if (tracking && !busy) onCancel({ pointerId: pid } as PointerEvent);
    };
    window.addEventListener("blur", onBlur);
    // A mouse drag would otherwise select text and images on the page. While a swipe is tracked, selection is off.
    const onSelectStart = (e: Event) => {
      if (tracking && !busy) e.preventDefault();
    };
    document.addEventListener("selectstart", onSelectStart);
    window.addEventListener("click", onClickCapture, true);
    setPv(window.innerWidth, false);

    return () => {
      document.removeEventListener("pointerdown", onDocDown);
      window.removeEventListener("message", onEmbedReady);
      unsubDemo();
      main.removeEventListener("touchmove", onTouchMove);
      main.removeEventListener("wheel", onWheel);
      main.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("selectstart", onSelectStart);
      window.removeEventListener("click", onClickCapture, true);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pvTab = preview ? tabs[preview.index] : null;
  // The preview pages are mounted only after the first screen has loaded and hydrated, so three
  // full app iframes don't compete with the page for the first second.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    // This effect runs after hydration, so the timer starts once the page is interactive. The
    // preview pages then load in the background instead of competing with the first screen.
    const id = window.setTimeout(() => setArmed(true), 1500);
    return () => window.clearTimeout(id);
  }, []);
  const pvPath = pvTab && pvTab.to ? embedPath(pvTab) : null;
  // Every page tab keeps its page mounted (embed mode: no header, nav or swipe chrome). Each is loaded
  // and laid out before any swipe; only the one being revealed is visible. Overlay tabs have no page.
  const pages = tabs.filter((t) => t.to).map((t) => ({ label: t.label, path: embedPath(t) }));

  return (
    <>
      <div
        ref={previewRef}
        aria-hidden
        className="fixed top-0 bottom-0 bg-background pointer-events-none"
        style={{ visibility: pvPath ? "visible" : "hidden", left: 0, width: "100%", zIndex: 15, background: pvTab?.key === "reels" ? "#000" : undefined }}
      >
        {armed && pages.map((pg) => (
          <div
            key={pg.path}
            className="absolute inset-0"
            style={{ visibility: pvPath === pg.path ? "visible" : "hidden" }}
          >
            <iframe src={pg.path} title={pg.label} tabIndex={-1} className="w-full h-full border-0 bg-background" />
          </div>
        ))}
      </div>
      {/* pan-y: the browser keeps vertical scrolling and leaves horizontal drags to us. */}
      <main ref={mainRef} className={`${className} touch-pan-y`}>
        {children}
      </main>
    </>
  );
}
