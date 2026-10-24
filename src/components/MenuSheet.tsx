import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Users, Clock, Bookmark, UsersRound, Film, Rss, CalendarDays, BarChart3, Gamepad2, Gift,
  MessageCircle, Receipt, Flag, LifeBuoy, Megaphone, Settings, RotateCcw, X,
} from "lucide-react";
import { toast } from "sonner";

type Icon = React.ComponentType<{ className?: string }>;

// Sections of the menu. Items with `to` open a page; the others have no page in this demo yet.
type Section = { label: string; icon: Icon; to?: string; params?: Record<string, string>; search?: { tab: string } };

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

  const sections: Section[] = [
    { label: "Friends", icon: Users },
    { label: "Memories", icon: Clock },
    { label: "Saved", icon: Bookmark, to: "/profile/$username", params: { username }, search: { tab: "saved" } },
    { label: "Groups", icon: UsersRound },
    { label: "Reels", icon: Film, to: "/reels" },
    { label: "Feeds", icon: Rss },
    { label: "Events", icon: CalendarDays },
    { label: "Ads Manager", icon: BarChart3 },
    { label: "Play games", icon: Gamepad2 },
    { label: "Birthdays", icon: Gift },
    { label: "Messenger", icon: MessageCircle, to: "/dm" },
    { label: "Orders and payments", icon: Receipt },
    { label: "Pages", icon: Flag },
    { label: "Support", icon: LifeBuoy },
    { label: "Your AD activity", icon: Megaphone },
  ];

  const rowClass = "flex w-full items-center gap-4 px-4 py-3 text-[15px] text-left hover:bg-muted transition-colors";

  const row = (s: Section) => {
    const content = (
      <>
        <s.icon className="h-6 w-6 stroke-[1.8] shrink-0" />
        <span>{s.label}</span>
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
    <div className="fixed inset-0 z-50">
      {/* backdrop: tap outside to close (desktop) */}
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30 md:bg-transparent" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Menu"
        className="absolute inset-0 md:inset-auto md:bottom-4 md:left-[84px] xl:left-[253px] md:w-80 md:max-h-[85vh] md:rounded-2xl md:border md:border-border bg-background md:shadow-xl flex flex-col overflow-hidden animate-in-fade"
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <span className="font-bold text-lg">Menu</span>
          <button type="button" aria-label="Close" onClick={onClose} className="grid place-items-center h-9 w-9 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {sections.map(row)}
          <div className="my-2 border-t border-border" />
          <Link to="/settings" className={rowClass} onClick={onClose}>
            <Settings className="h-6 w-6 stroke-[1.8] shrink-0" />
            <span>Settings</span>
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
            <span>Reset demo data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
