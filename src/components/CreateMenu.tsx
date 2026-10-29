import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { ImagePlus, ListVideo, Type as TypeIcon, Smile, CalendarClock, Radio } from "lucide-react";
import { toast } from "sonner";
import { ui } from "@/lib/demo-store";

type Option = {
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
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

/**
 * Create button for the bottom nav (mobile) and the side nav (desktop). A click opens a small
 * menu of post types right next to the button instead of the full Create page. The /create
 * route still works when opened by URL.
 */
export function CreateNavButton({
  className,
  placement,
  children,
}: {
  className: string;
  placement: "up" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (o: Option) => {
    setOpen(false);
    if (o.mode) ui.openCreate(o.mode);
    else toast(`${o.label} is coming soon`);
  };

  const pos =
    placement === "up"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-3"
      : "left-full top-1/2 -translate-y-1/2 ml-3";

  return (
    <div ref={wrapRef} className="relative flex flex-1 h-full items-stretch">
      <button type="button" aria-label="Create" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={className}>
        {children}
      </button>
      {open && (
        <>
          {/* Socialverse gradient (teal -> indigo -> violet), same as the logo and Follow buttons */}
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <linearGradient id="sv-create-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2DD4BF" />
                <stop offset="0.5" stopColor="#6366F1" />
                <stop offset="1" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
          </svg>
          {/* Full screen width on mobile, the bar's inner width on desktop; centred on the + button. */}
          <div role="menu" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-screen md:w-[517px] px-5 flex items-end justify-between">
            {OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                role="menuitem"
                onClick={() => pick(o)}
                className="flex flex-col items-center gap-1.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] hover:opacity-80"
              >
                <o.icon className="h-7 w-7" strokeWidth={2.6} style={{ stroke: "url(#sv-create-grad)" }} />
                <span className="text-[11px] font-semibold leading-none [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
