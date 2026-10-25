import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Clock, Bookmark, UsersRound, Film, Rss, CalendarDays, BarChart3, Gift,
  MessageCircle, Receipt, Flag, LifeBuoy, Megaphone, Settings, RotateCcw, X,
  Joystick, UserPlus, Contrast,
} from "lucide-react";
import { toast } from "sonner";
import { isColorInverted, setColorInverted } from "@/lib/color-invert";

type Icon = React.ComponentType<{ className?: string }>;

// Sections of the menu. Items with `to` open a page; the others have no page in this demo yet.
type Section = { label: string; icon: Icon; color: string; to?: string; params?: Record<string, string>; search?: { tab: string } };

// The menu's tabs and icons. Used by the mobile sheet and by the desktop sidebar.
// `inline` is the desktop sidebar: icons only at md (the sidebar is narrow there), icons + labels from xl.
export function MenuList({
  username,
  onClose,
  onReset,
  inline = false,
}: {
  username: string;
  onClose: () => void;
  onReset: () => void;
  inline?: boolean;
}) {
  const [inverted, setInverted] = useState(() => isColorInverted());

  const sections: Section[] = [
    { label: "Friends", icon: Users, color: "text-[#1877F2]" },
    { label: "Requests", icon: UserPlus, color: "text-[#1877F2]" },
    { label: "Memories", icon: Clock, color: "text-[#1877F2]" },
    { label: "Saved", icon: Bookmark, color: "text-[#A033FF]", to: "/profile/$username", params: { username }, search: { tab: "saved" } },
    { label: "Groups", icon: UsersRound, color: "text-[#1877F2]" },
    { label: "Reels", icon: Film, color: "text-[#F5533D]", to: "/reels" },
    { label: "Feeds", icon: Rss, color: "text-[#1877F2]" },
    { label: "Events", icon: CalendarDays, color: "text-[#F02849]" },
    { label: "Ads Manager", icon: BarChart3, color: "text-[#1877F2]" },
    { label: "Gaming", icon: Joystick, color: "text-[#7D3AED]" },
    { label: "Birthdays", icon: Gift, color: "text-[#F7B928]" },
    { label: "Messenger", icon: MessageCircle, color: "text-[#0084FF]", to: "/dm" },
    { label: "Orders and payments", icon: Receipt, color: "text-[#31A24C]" },
    { label: "Pages", icon: Flag, color: "text-[#F7681C]" },
    { label: "Support", icon: LifeBuoy, color: "text-[#1877F2]" },
    { label: "Your AD activity", icon: Megaphone, color: "text-[#1877F2]" },
  ];

  const rowClass = `flex w-full items-center gap-4 ${inline ? "px-3 xl:px-4" : "px-4"} py-3 text-[15px] text-left cursor-pointer hover:bg-muted transition-colors`;
  const labelClass = inline ? "hidden xl:inline" : "";

  const row = (s: Section) => {
    const content = (
      <>
        <s.icon className={`h-6 w-6 stroke-[2] shrink-0 ${s.color}`} />
        <span className={labelClass}>{s.label}</span>
      </>
    );
    if (s.to) {
      return (
        <Link key={s.label} to={s.to} params={s.params} search={s.search} className={rowClass} onClick={onClose}>
          {content}
        </Link>
      );
    }
    return (
      <button
        key={s.label}
        type="button"
        className={rowClass}
        onClick={() => {
          onClose();
          toast(`${s.label} demo mein abhi available nahi hai`);
        }}
      >
        {content}
      </button>
    );
  };

  return (
    <>
      {sections.map(row)}
      <div className="my-2 border-t border-border" />
      <button
        type="button"
        role="switch"
        aria-checked={inverted}
        className={rowClass}
        onClick={() => {
          const next = !inverted;
          setColorInverted(next);
          setInverted(next);
        }}
      >
        <Contrast className="h-6 w-6 stroke-[2] shrink-0 text-[#1877F2]" />
        <span className={`${inline ? "hidden xl:inline " : ""}flex-1`}>Color inversion</span>
        <span
          aria-hidden
          className={`relative h-6 w-11 rounded-full transition-colors ${inverted ? "bg-[#1877F2]" : "bg-muted-foreground/40"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${inverted ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </span>
      </button>
      <Link to="/settings" className={rowClass} onClick={onClose}>
        <Settings className="h-6 w-6 stroke-[1.8] shrink-0" />
        <span className={labelClass}>Settings</span>
      </Link>
      <button
        type="button"
        className={rowClass}
        onClick={() => {
          onClose();
          onReset();
        }}
      >
        <RotateCcw className="h-6 w-6 stroke-[1.8] shrink-0" />
        <span className={labelClass}>Reset demo data</span>
      </button>
    </>
  );
}

// Mobile menu sheet (opened from the grid button in the top bar).
export function MenuSheet({
  open,
  onClose,
  username,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  onReset: () => void;
}) {
  // Escape closes the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close menu" className="absolute inset-0 cursor-pointer bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Menu"
        className="absolute inset-0 bg-background flex flex-col overflow-hidden animate-in-fade"
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <span className="font-bold text-lg">Menu</span>
          <button type="button" aria-label="Close" onClick={onClose} className="grid cursor-pointer place-items-center h-9 w-9 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <MenuList username={username} onClose={onClose} onReset={onReset} />
        </div>
      </div>
    </div>
  );
}
