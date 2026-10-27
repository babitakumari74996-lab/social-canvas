import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";

// A floating window for the corner icons (desktop). It opens in the space to the left of the icon column,
// can be expanded or collapsed, closed, and dragged anywhere inside the window.
export interface DockPanel {
  id: string;
  title: string;
  path: string; // embed URL of the page shown inside the window
}

const DEFAULT_W = 380;
const DEFAULT_H = 560;
const EXPANDED_W = 900;
const EXPANDED_H = 820;
const EDGE = 8;

function sizeFor(expanded: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return expanded
    ? { w: Math.min(EXPANDED_W, vw - 140), h: Math.min(EXPANDED_H, vh - 48) }
    : { w: Math.min(DEFAULT_W, vw - 140), h: Math.min(DEFAULT_H, vh - 48) };
}

function clampPos(p: { x: number; y: number }, w: number, h: number) {
  return {
    x: Math.max(EDGE, Math.min(p.x, window.innerWidth - w - EDGE)),
    y: Math.max(EDGE, Math.min(p.y, window.innerHeight - h - EDGE)),
  };
}

export function FloatingPanel({ panel, onClose }: { panel: DockPanel; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState(() => sizeFor(false));
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Opens beside the corner icons: right edge 16px + icon 56px + 16px gap from the window's right, bottom aligned.
  useLayoutEffect(() => {
    const s = sizeFor(false);
    setSize(s);
    setPos(clampPos({ x: window.innerWidth - 16 - 56 - 16 - s.w, y: window.innerHeight - 12 - s.h }, s.w, s.h));
  }, []);

  // Keep the window inside the viewport when the browser is resized.
  useEffect(() => {
    const onResize = () => {
      const s = sizeFor(expanded);
      setSize(s);
      setPos((p) => (p ? clampPos(p, s.w, s.h) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [expanded]);

  const toggleExpand = () => {
    const next = !expanded;
    const s = sizeFor(next);
    setExpanded(next);
    setSize(s);
    setPos((p) => clampPos(p ?? { x: EDGE, y: EDGE }, s.w, s.h));
  };

  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pos) return;
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
      {/* While dragging, the page inside must not take the pointer, or the drag stops at the frame edge. */}
      <iframe
        src={panel.path}
        title={panel.title}
        className={`min-h-0 w-full flex-1 border-0 bg-background ${dragging ? "pointer-events-none" : ""}`}
      />
    </div>
  );
}
