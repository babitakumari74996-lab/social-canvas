import { useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  Home, Search, Compass, Film, Send, Heart, Menu, Settings,
  Bookmark, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";
import { ui, useUI, resetDemo } from "@/lib/demo-store";
import { CreateModal } from "@/components/CreateModal";
import { SearchPanel } from "@/components/SearchPanel";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { StoryViewer } from "@/components/StoryViewer";
import { ShareSheet } from "@/components/ShareSheet";
import { EditProfileModal } from "@/components/EditProfileModal";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif italic font-bold tracking-tight text-[26px] leading-none bg-gradient-to-r from-[#D62976] via-[#962FBF] to-[#4F5BD5] bg-clip-text text-transparent ${className}`}>
      Socialverse
    </span>
  );
}

function NavItem({
  icon: Icon, label, to, params, onClick, active, avatarUrl,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  params?: Record<string, string>;
  onClick?: () => void;
  active?: boolean;
  avatarUrl?: string | null;
}) {
  const inner = avatarUrl ? (
    <Avatar path={avatarUrl} alt={label} size={24} className={active ? "ring-2 ring-foreground" : ""} />
  ) : Icon ? (
    <Icon className={`h-6 w-6 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
  ) : null;
  const cls = `flex items-center gap-4 rounded-lg p-3 my-0.5 hover:bg-muted transition-colors ${active ? "font-bold" : "font-normal"}`;
  if (to) {
    return (
      <Link to={to} params={params} className={cls} onClick={onClick} activeProps={{ className: `${cls} font-bold` }}>
        {inner}
        <span className="hidden xl:inline text-[15px]">{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>
      {inner}
      <span className="hidden xl:inline text-[15px]">{label}</span>
    </button>
  );
}

export function AppShell() {
  const me = useMe();
  const overlay = useUI();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const isDemo = !me?.id || me.id === "me";

  const logout = async () => {
    if (isDemo) {
      if (confirm("Exit the demo world? You can log in with a real account next.")) {
        resetDemo();
        navigate({ to: "/auth" });
      }
    } else {
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    }
  };

  return (
    <div className="min-h-screen">
      {/* ------- desktop sidebar ------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[76px] xl:w-[245px] flex-col border-r border-border bg-card px-3 py-6 z-40">
        <Link to="/feed" className="px-3 mb-7 hidden xl:block">
          <Wordmark />
        </Link>
        <Link to="/feed" className="px-3 mb-7 xl:hidden" aria-label="Home">
          <span className="font-serif italic font-bold text-2xl">S</span>
        </Link>
        <nav className="flex flex-col gap-0.5 flex-1">
          <NavItem icon={Home} label="Home" to="/feed" />
          <NavItem icon={Search} label="Search" onClick={ui.openSearch} active={overlay.overlay === "search"} />
          <NavItem icon={Compass} label="Explore" to="/explore" />
          <NavItem icon={Film} label="Reels" to="/reels" />
          <NavItem icon={Send} label="Messages" to="/dm" />
          <NavItem icon={Heart} label="Notifications" onClick={ui.openNotifications} active={overlay.overlay === "notifications"} />
          <NavItem icon={PlusIcon} label="Create" onClick={() => ui.openCreate()} />
          <NavItem label="Profile" to="/profile/$username" params={{ username: me?.username ?? "aarav_sharma" }} avatarUrl={me?.avatar_url ?? null} />
        </nav>
        <div className="relative">
          {moreOpen && (
            <div className="absolute bottom-12 left-0 w-60 rounded-2xl border border-border bg-card shadow-xl overflow-hidden animate-in-fade">
              <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted" onClick={() => setMoreOpen(false)}>
                <Settings className="h-5 w-5" /> Settings
              </Link>
              <Link to="/profile/$username" params={{ username: me?.username ?? "aarav_sharma" }} search={{ tab: "saved" }} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted" onClick={() => setMoreOpen(false)}>
                <Bookmark className="h-5 w-5" /> Saved
              </Link>
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted w-full text-left border-t border-border"
                onClick={() => { setMoreOpen(false); logout(); }}
              >
                <LogOut className="h-5 w-5" /> {isDemo ? "Exit demo / Log in" : "Log out"}
              </button>
            </div>
          )}
          <button type="button" onClick={() => setMoreOpen((v) => !v)} className="flex items-center gap-4 rounded-lg p-3 hover:bg-muted transition-colors w-full text-left">
            <Menu className="h-6 w-6 stroke-[1.8]" />
            <span className="hidden xl:inline text-[15px]">More</span>
          </button>
        </div>
      </aside>

      {/* ------- mobile top bar ------- */}
      <header className="md:hidden fixed top-0 inset-x-0 h-12 z-40 flex items-center justify-between px-4 bg-background/95 backdrop-blur border-b border-border">
        <Link to="/feed"><Wordmark className="text-[22px]" /></Link>
        <div className="flex items-center gap-5">
          <button type="button" aria-label="Notifications" onClick={ui.openNotifications}>
            <Heart className="h-6 w-6" />
          </button>
          <Link to="/dm" aria-label="Messages">
            <Send className="h-6 w-6 -rotate-12" />
          </Link>
        </div>
      </header>

      {/* ------- main ------- */}
      <main className="md:ml-[76px] xl:ml-[245px] pt-12 pb-14 md:pt-0 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* ------- mobile bottom nav ------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 z-40 flex items-center justify-around bg-background border-t border-border">
        <Link to="/feed" aria-label="Home"><Home className="h-6 w-6" /></Link>
        <button type="button" aria-label="Search" onClick={ui.openSearch}><Search className="h-6 w-6" /></button>
        <button type="button" aria-label="Create" onClick={() => ui.openCreate()}>
          <span className="block h-6 w-6 rounded-[7px] border-2 border-current relative">
            <span className="absolute inset-0 m-auto h-3 w-0.5 bg-current" />
            <span className="absolute inset-0 m-auto h-0.5 w-3 bg-current" />
          </span>
        </button>
        <Link to="/reels" aria-label="Reels"><Film className="h-6 w-6" /></Link>
        <Link to="/profile/$username" params={{ username: me?.username ?? "aarav_sharma" }} aria-label="Profile">
          <Avatar path={me?.avatar_url} alt="me" size={26} className="ring-1 ring-border" />
        </Link>
      </nav>

      {/* ------- global overlays ------- */}
      <CreateModal />
      <SearchPanel />
      <NotificationsPanel />
      <StoryViewer />
      <ShareSheet />
      <EditProfileModal />
    </div>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`block h-6 w-6 rounded-[7px] border-2 border-current relative ${className}`}>
      <span className="absolute inset-0 m-auto h-3 w-0.5 bg-current" />
      <span className="absolute inset-0 m-auto h-0.5 w-3 bg-current" />
    </span>
  );
}
