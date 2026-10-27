import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripHorizontal, Lock, LockOpen, Maximize2, Minimize2, X } from "lucide-react";

// A floating window for the corner icons (desktop). Several can be open at once. Each one opens in the space
// to the left of the icon column and slides in from the right. It can be expanded, closed, locked and dragged.
// Its position is remembered (localStorage), so it reopens where it was closed, even after a refresh.
export interface DockPanel {
  id: string;
  title: string;
  seq: number; // changes each time the window is opened (remounts it, so it slides in again)
  path?: string; // embed URL of the page shown inside the window
  unavailable?: boolean; // shows a "not available" message instead of a page
  w?: number; // default width (px)
  h?: number; // default height (px)
  locked?: boolean; // a locked window stays open when the user switches tabs
  leaving?: boolean; // true while the window slides out to the right
  z?: number; // stacking rank: the window clicked last is on top
}

type Pos = { x: number; y: number };

const DEFAULT_W = 380;
const DEFAULT_H = 560;
const EDGE = 8;
const SLIDE_MS = 320;
const POS_KEY = "sv-dock-pos";

export function readDockPos(): Record<string, Pos> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDockPos(id: string, p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ ...readDockPos(), [id]: p }));
  } catch {
    /* storage full or blocked: the window just opens at its default place */
  }
}

// Desktop sidebar (menu) width: 330px from xl, 76px on md.
function sidebarW() {
  return window.innerWidth >= 1280 ? 330 : 76;
}

// Expanded: covers the whole screen except the sidebar menu. Normal: the window's own size.
function sizeFor(expanded: boolean, base: { w: number; h: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return expanded
    ? { w: vw - sidebarW(), h: vh }
    : { w: Math.min(base.w, vw - 140), h: Math.min(base.h, vh - 48) };
}

function clampPos(p: Pos, w: number, h: number): Pos {
  return {
    x: Math.max(EDGE, Math.min(p.x, window.innerWidth - w - EDGE)),
    y: Math.max(EDGE, Math.min(p.y, window.innerHeight - h - EDGE)),
  };
}

export function FloatingPanel({
  panel,
  index,
  onClose,
  onGone,
  onToggleLock,
  onFocus,
  swipeDx,
  swiping,
}: {
  panel: DockPanel;
  index: number; // position among the open windows: default places cascade so they do not stack exactly
  onClose: () => void;
  onGone: () => void; // called once the slide-out has finished
  onToggleLock: () => void;
  onFocus: () => void; // brings the window to the front
  swipeDx: number; // unlocked window: moves with a Home <-> Reels swipe
  swiping: boolean; // a tab swipe is in progress: the window never takes the pointer
}) {
  const base = { w: panel.w ?? DEFAULT_W, h: panel.h ?? DEFAULT_H };
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState(() => sizeFor(false, base));
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [entered, setEntered] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const before = useRef<{ pos: Pos; size: { w: number; h: number } } | null>(null);
  const posRef = useRef<Pos | null>(null);
  posRef.current = pos;

  // Opens where it was last closed; otherwise beside the corner icons (right 16 + icon 56 + gap 16, bottom aligned).
  useLayoutEffect(() => {
    const s = sizeFor(false, base);
    setSize(s);
    const saved = readDockPos()[panel.id];
    const cascade = index * 24;
    const def = {
      x: window.innerWidth - 16 - 56 - 16 - s.w - cascade,
      y: window.innerHeight - 12 - s.h - cascade,
    };
    setPos(clampPos(saved ?? def, s.w, s.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slide in from the right: start off-screen, then move to place after two frames (so the start is painted).
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Slide-out finished: let the parent remove the window.
  useEffect(() => {
    if (!panel.leaving) return;
    const t = window.setTimeout(onGone, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [panel.leaving, onGone]);

  // Keep the window inside the viewport when the browser is resized. An expanded window keeps covering the screen.
  useEffect(() => {
    const onResize = () => {
      if (expanded) {
        setSize(sizeFor(true, base));
        setPos({ x: sidebarW(), y: 0 });
        return;
      }
      const s = sizeFor(false, base);
      setSize(s);
      setPos((p) => (p ? clampPos(p, s.w, s.h) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const toggleExpand = () => {
    if (!expanded) {
      if (pos) before.current = { pos, size };
      setExpanded(true);
      setSize(sizeFor(true, base));
      setPos({ x: sidebarW(), y: 0 });
      return;
    }
    const prev = before.current;
    setExpanded(false);
    const s = prev ? prev.size : sizeFor(false, base);
    setSize(s);
    setPos(clampPos(prev ? prev.pos : { x: EDGE, y: EDGE }, s.w, s.h));
  };

  // Closing remembers the spot the window was in (the spot before expanding, if it is expanded).
  const close = () => {
    const spot = expanded && before.current ? before.current.pos : posRef.current;
    if (spot) writeDockPos(panel.id, spot);
    onClose();
  };

  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pos || panel.leaving || expanded) return; // an expanded window does not move
    if ((e.target as HTMLElement).closest("button")) return; // the buttons keep their own clicks
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    setDragging(true);
  };
  const onHeaderMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setPos(clampPos({ x: e.clientX - d.dx, y: e.clientY - d.dy }, size.w, size.h));
  };
  const endDrag = () => {
    if (drag.current && posRef.current) writeDockPos(panel.id, posRef.current);
    drag.current = null;
    setDragging(false);
  };

  // Off-screen distance: from the window's current left edge to the right edge of the viewport.
  const offX = Math.max(0, window.innerWidth - (pos?.x ?? window.innerWidth));
  const outside = !entered || !!panel.leaving;

  return (
    <div
      role="dialog"
      aria-label={panel.title}
      onPointerDownCapture={onFocus}
      className={`hidden md:flex fixed flex-col overflow-hidden border-border bg-card shadow-2xl ${expanded ? "border-l" : "rounded-2xl border"}`}
      style={{
        zIndex: 50 + (panel.z ?? 0),
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        width: size.w,
        height: size.h,
        visibility: pos ? "visible" : "hidden",
        transform: `translate3d(${(outside ? offX : 0) + swipeDx}px,0,0)`,
        // While a swipe is in progress the window follows the finger instead of easing, and lets the pointer through.
        transition: swiping ? "none" : `transform ${SLIDE_MS}ms cubic-bezier(.2,.8,.2,1)`,
        pointerEvents: swiping ? "none" : undefined,
      }}
    >
      <div
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`flex h-11 shrink-0 items-center gap-2 border-b border-border px-3 select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-sm font-semibold">{panel.title}</span>
        <button
          type="button"
          aria-label={panel.locked ? "Unlock window" : "Lock window"}
          title={panel.locked ? "Unlock: closes when you switch tabs" : "Lock: stays open when you switch tabs"}
          onClick={onToggleLock}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
        >
          {panel.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={toggleExpand}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {panel.unavailable ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="border-b border-border px-4 pb-4 pt-20">
            <p className="text-base font-semibold">Demo gaming</p>
          </div>
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Gaming demo mein abhi available nahi hai. Ye feature jald aayega.
          </div>
        </div>
      ) : (
        /* While dragging, the page inside must not take the pointer, or the drag stops at the frame edge. */
        <iframe
          src={panel.path}
          title={panel.title}
          className={`min-h-0 w-full flex-1 border-0 bg-background ${dragging ? "pointer-events-none" : ""}`}
        />
      )}
    </div>
  );
}
