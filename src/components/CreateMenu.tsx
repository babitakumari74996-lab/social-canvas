import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ImagePlus, ListVideo, Type as TypeIcon, Smile, CalendarClock, Radio } from "lucide-react";
import { toast } from "sonner";
import { ui } from "@/lib/demo-store";

type Option = {
  label: string;
  icon: ComponentType<{ className?: string }>;
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
    <div ref={wrapRef} className="relative flex-1 h-full">
      <button type="button" aria-label="Create" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={className}>
        {children}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute ${pos} z-50 w-[200px] rounded-xl border border-border bg-card py-1.5 shadow-xl`}
        >
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={() => pick(o)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <o.icon className="h-5 w-5 text-primary" />
              <span className="font-semibold">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
