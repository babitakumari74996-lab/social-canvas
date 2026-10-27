import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripHorizontal, Lock, LockOpen, Maximize2, Minimize2, X } from "lucide-react";

// A floating window for the corner icons (desktop). It opens in the space to the left of the icon column
// and slides in from the right edge. It can be expanded, collapsed, closed, locked, and dragged anywhere.
export interface DockPanel {
  id: string;
  title: string;
  path?: string; // embed URL of the page shown inside the window
  unavailable?: boolean; // shows a "not available" message instead of a page
  w?: number; // default width (px)
  h?: number; // default height (px)
  locked?: boolean; // a locked window stays open when the user switches tabs
}

const DEFAULT_W = 380;
const DEFAULT_H = 560;
const EXPANDED_W = 900;
const EXPANDED_H = 820;
const EDGE = 8;
const SLIDE_MS = 320;

function sizeFor(expanded: boolean, base: { w: number; h: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return expanded
    ? { w: Math.min(EXPANDED_W, vw - 140), h: Math.min(EXPANDED_H, vh - 48) }
    : { w: Math.min(base.w, vw - 140), h: Math.min(base.h, vh - 48) };
}

function clampPos(p: { x: number; y: number }, w: number, h: number) {
  return {
    x: Math.max(EDGE, Math.min(p.x, window.innerWidth - w - EDGE)),
    y: Math.max(EDGE, Math.min(p.y, window.innerHeight - h - EDGE)),
  };
}

export function FloatingPanel({
  panel,
  leaving,
  onClose,
  onGone,
  onToggleLock,
}: {
  panel: DockPanel;
  leaving: boolean; // true while the window slides out to the right
  onClose: () => void;
  onGone: () => void; // called once the slide-out has finished
  onToggleLock: () => void;
}) {
  const base = { w: panel.w ?? DEFAULT_W, h: panel.h ?? DEFAULT_H };
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState(() => sizeFor(false, base));
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [entered, setEntered] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Opens beside the corner icons: right edge 16px + icon 56px + 16px gap from the window's right, bottom aligned.
  useLayoutEffect(() => {
    const s = sizeFor(false, base);
    setSize(s);
    setPos(clampPos({ x: window.innerWidth - 16 - 56 - 16 - s.w, y: window.innerHeight - 12 - s.h }, s.w, s.h));
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
    if (!leaving) return;
    const t = window.setTimeout(onGone, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [leaving, onGone]);

  // Keep the window inside the viewport when the browser is resized.
  useEffect(() => {
    const onResize = () => {
      const s = sizeFor(expanded, base);
      setSize(s);
      setPos((p) => (p ? clampPos(p, s.w, s.h) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const toggleExpand = () => {
    const next = !expanded;
    const s = sizeFor(next, base);
    setExpanded(next);
    setSize(s);
    setPos((p) => clampPos(p ?? { x: EDGE, y: EDGE }, s.w, s.h));
  };

  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pos || leaving) return;
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
    drag.current = null;
    setDragging(false);
  };

  // Off-screen distance: from the window's current left edge to the right edge of the viewport.
  const offX = Math.max(0, window.innerWidth - (pos?.x ?? window.innerWidth));
  const outside = !entered || leaving;

  return (
    <div
      role="dialog"
      aria-label={panel.title}
      className="hidden md:flex fixed z-50 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      style={{
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        width: size.w,
        height: size.h,
        visibility: pos ? "visible" : "hidden",
        transform: outside ? `translate3d(${offX}px,0,0)` : "translate3d(0,0,0)",
        transition: `transform ${SLIDE_MS}ms cubic-bezier(.2,.8,.2,1)`,
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
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {panel.unavailable ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-base font-semibold">Not available</p>
          <p className="text-sm text-muted-foreground">Gaming demo mein abhi available nahi hai.</p>
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
