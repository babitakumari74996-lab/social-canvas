import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { NotificationBadge } from "./Badge";
import { Home, Film, Smile, User, Plus } from "lucide-react";

interface BottomNavProps {
  path: string;
  rightPanel: boolean;
  onProfileOpen: () => void;
}

export function BottomNav({ path, rightPanel, onProfileOpen }: BottomNavProps) {
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const swipeOffsetRef = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipingRef = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const SWIPE_THRESHOLD = 40;

  const isActive = (to: string) =>
    path === to ||
    (to !== "/feed" && path.startsWith(to + "/")) ||
    (to === "/feed" && path === "/feed");

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const onStart = (e: PointerEvent) => {
      touchStartX.current = e.clientX;
      swipeOffsetRef.current = 0;
      swipingRef.current = true;
      setSwiping(true);
      setSwipeOffset(0);
    };

    const onMove = (e: PointerEvent) => {
      if (touchStartX.current === null || !swipingRef.current) return;
      e.preventDefault();
      const diff = e.clientX - touchStartX.current;
      const clamped = Math.max(-120, Math.min(120, diff));
      swipeOffsetRef.current = clamped;
      setSwipeOffset(clamped);
    };

    const onEnd = () => {
      const offset = swipeOffsetRef.current;
      if (
        swipingRef.current &&
        touchStartX.current !== null &&
        Math.abs(offset) >= SWIPE_THRESHOLD
      ) {
        const TABS = ["/feed", "/reels", "/mood"];
        const currentIdx = TABS.indexOf(pathRef.current);
        if (offset < -SWIPE_THRESHOLD && currentIdx >= 0 && currentIdx < TABS.length - 1) {
          navigate({ to: TABS[currentIdx + 1] });
        } else if (offset > SWIPE_THRESHOLD && currentIdx >= 0 && currentIdx > 0) {
          navigate({ to: TABS[currentIdx - 1] });
        }
      }
      touchStartX.current = null;
      swipeOffsetRef.current = 0;
      swipingRef.current = false;
      setSwiping(false);
      setSwipeOffset(0);
    };

    el.addEventListener("pointerdown", onStart);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
    el.addEventListener("pointerleave", onEnd);

    return () => {
      el.removeEventListener("pointerdown", onStart);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      el.removeEventListener("pointerleave", onEnd);
    };
  }, [navigate]);

  return (
    <nav
      ref={navRef}
      className={`
        fixed bottom-0 left-0 right-0
        lg:left-64 h-14
        bg-white/85 dark:bg-card/90 backdrop-blur-xl
        border-t border-border/30 dark:border-border/20
        z-40
        shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]
        transition-all duration-200 select-none touch-pan-y
        ${rightPanel ? "lg:left-64 lg:right-[420px]" : ""}
      `}
    >
      <div
        className="flex items-center justify-around px-2 h-full min-h-[48px]"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swiping ? "none" : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <TabButton to="/feed" label="Home" icon={Home} active={isActive("/feed")} />

        <TabButton
          to="/reels"
          label="Reels"
          icon={Film}
          active={isActive("/reels")}
          className="lg:mt-0"
        />

        {/* Post button */}
        <div className="relative flex flex-col items-center min-h-[48px]">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-create"))}
            className="relative flex flex-col items-center -mt-6 cursor-pointer group active:scale-[0.92] transition-transform duration-150 ease-out"
            aria-label="Create post"
          >
            <span className="absolute -inset-3 rounded-full bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all duration-300" />
            <span className="relative h-14 w-14 rounded-full bg-white dark:bg-card text-primary grid place-items-center shadow-[0_4px_14px_rgba(var(--primary-rgb),0.35),0_2px_6px_rgba(var(--primary-rgb),0.2)] ring-2 ring-primary/60 group-hover:shadow-[0_6px_20px_rgba(var(--primary-rgb),0.4),0_3px_8px_rgba(var(--primary-rgb),0.25)] group-hover:scale-110 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:shadow-[0_2px_8px_rgba(var(--primary-rgb),0.3)]">
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <span className="absolute inset-0 rounded-full bg-primary/10 opacity-0 group-active:opacity-100 transition-opacity duration-150 pointer-events-none" />
            <span className="text-[10px] mt-0.5 font-semibold text-primary transition-colors duration-200">Post</span>
          </button>
        </div>

        <TabButton
          to="/mood"
          label="Moods"
          icon={Smile}
          active={isActive("/mood")}
          className="lg:mt-0"
        />

        <button
          onClick={onProfileOpen}
          className={`
          group relative flex flex-col items-center px-3 cursor-pointer min-h-[48px]
          ${isActive("/profile") ? "text-primary" : "hover:text-foreground"}
        `}
          aria-label="Profile"
          aria-current={isActive("/profile") ? "page" : undefined}
        >
          <div className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[48px] min-w-[48px]">
            <User
              className={`
              h-5 w-5 lg:h-6 lg:w-6 transition-all duration-200
              ${isActive("/profile") ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground/80"}
            `}
              strokeWidth={isActive("/profile") ? 2.5 : 1.5}
            />
            {isActive("/profile") && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary shadow-sm shadow-primary/30" />
            )}
            <span
              className={`text-[10px] lg:text-xs transition-all duration-200 ${isActive("/profile") ? "text-foreground font-semibold" : "text-muted-foreground/70"}`}
            >
              Profile
            </span>
          </div>
        </button>
      </div>
    </nav>
  );
}

function TabButton({
  to,
  label,
  icon: Icon,
  active,
  badge,
  className,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  badge?: number;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col items-center px-3 ${className ?? ""} ${active ? "text-primary" : "hover:text-foreground"}`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <div
        className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] min-h-[48px] min-w-[48px]
          ${
            active
              ? "text-primary"
              : "hover:bg-muted/50 text-muted-foreground group-hover:text-foreground/80"
          }`}
      >
        <Icon
          className={`
            h-5 w-5 lg:h-6 lg:w-6 transition-all duration-200
            ${active ? "scale-110" : "group-hover:scale-105"}
          `}
          strokeWidth={active ? 2.5 : 1.5}
        />
        <span
          className={`text-[10px] lg:text-xs transition-all duration-200 ${active ? "text-foreground font-semibold" : "text-muted-foreground/70"}`}
        >
          {label}
        </span>
        {active && (
          <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary shadow-sm shadow-primary/30" />
        )}
      </div>
      <NotificationBadge count={badge} priority="medium" />
    </Link>
  );
}
