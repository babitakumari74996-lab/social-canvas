import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { ImagePlus, ListVideo, Type as TypeIcon, Smile, CalendarClock, Radio } from "lucide-react";
import { toast } from "sonner";
import { ui } from "@/lib/demo-store";

type Option = {
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties; strokeWidth?: number }>;
  /** Opens the create modal in this mode; omitted = not available yet. */
  mode?: "photo" | "video" | "text";
};

const OPTIONS: Option[] = [
  { label: "Photo", icon: ImagePlus, mode: "photo" },
  { label: "Reel", icon: ListVideo, mode: "video" },
  { label: "Twit", icon: TypeIcon, mode: "text" },
  { label: "Mood", icon: Smile },
  { label: "Today", icon: CalendarClock },
  { label: "Live", icon: Radio },
];

// Stagger between options (ms) and the slide duration (ms), shared by the open and close animations.
const STAGGER_MS = 45;
const SLIDE_MS = 260;
// Time until the last option has finished sliding out; the menu unmounts after this.
const CLOSE_MS = SLIDE_MS + (OPTIONS.length - 1) * STAGGER_MS;

/**
 * Create button for the bottom nav (mobile) and the side nav (desktop). A click opens a row of
 * post types floating above the button instead of the full Create page. The /create route still
 * works when opened by URL.
 */
export function CreateNavButton({
  className,
  children,
}: {
  className: string;
  placement?: "up" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // "closing" keeps the menu mounted while the options slide back down.
  const [closing, setClosing] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const requestClose = () => {
    if (!open || closing) return;
    setClosing(true);
    timer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      timer.current = null;
    }, CLOSE_MS);
  };

  const toggle = () => {
    if (open && !closing) requestClose();
    else if (!open) setOpen(true);
  };

  useEffect(() => {
    if (!open || closing) return;
    const outside = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) requestClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", esc);
    };
    // requestClose only reads `open`/`closing`, which are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closing]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const pick = (o: Option) => {
    requestClose();
    if (o.mode) ui.openCreate(o.mode);
    else toast(`${o.label} is coming soon`);
  };

  return (
    <div ref={wrapRef} className="relative flex flex-1 h-full items-stretch">
      <button type="button" aria-label="Create" aria-expanded={open} onClick={toggle} className={className}>
        {children}
      </button>
      {open && (
        <>
          {/* Socialverse gradient (teal -> indigo -> violet), same as the logo and Follow buttons */}
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <linearGradient id="sv-create-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0" stopColor="#2DD4BF" />
                <stop offset="0.5" stopColor="#6366F1" />
                <stop offset="1" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
          </svg>
          {/* Full screen width on mobile, the bar's inner width on desktop; centred on the + button. */}
          <div role="menu" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-screen md:w-[517px] px-5 flex items-end justify-between">
            {OPTIONS.map((o, i) => (
              <button
                key={o.label}
                type="button"
                role="menuitem"
                onClick={() => pick(o)}
                style={{
                  // Open: slide up, first option first. Close: slide back down, last option first.
                  animationName: closing ? "sv-menu-down" : "sv-menu-up",
                  animationDelay: `${(closing ? OPTIONS.length - 1 - i : i) * STAGGER_MS}ms`,
                }}
                className="sv-menu-anim flex flex-col items-center gap-1.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] hover:opacity-80"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-black/5 shadow-md">
                  <o.icon className="h-7 w-7" strokeWidth={2.6} style={{ stroke: "url(#sv-create-grad)" }} />
                </span>
                <span className="text-[11px] font-semibold leading-none [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
