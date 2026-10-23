import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Home, Search, Compass, Film, Send, Heart, Menu, Settings,
  Bookmark, RotateCcw, User as UserIcon,
} from "lucide-react";
import { SwipeTabs, type SwipeTab } from "@/components/SwipeTabs";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";
import { ui, useUI, resetDemo } from "@/lib/demo-store";
import { useSwipeProgress } from "@/lib/swipe-progress";
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

// Bottom-nav section fill colour for the active tab.
function cell(active: boolean) {
  // Only the icon takes the colour (icons use currentColor); the cell background stays plain.
  return `relative flex-1 h-full flex items-center justify-center transition-colors ${active ? "text-[#D62976]" : ""}`;
}

// Progress line under a bottom-nav icon: grows on the tab a swipe is heading to, shrinks on the
// tab being left. Fills fully at the point where the swipe commits.
function SwipeLine({ k }: { k: string }) {
  const p = useSwipeProgress();
  let w = 0;
  if (p) {
    if (p.to === k) w = p.amount;
    else if (p.from === k) w = 1 - p.amount;
  }
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-1 left-1/2 h-[3px] w-8 rounded-full bg-[#D62976]"
      style={{ transform: `translateX(-50%) scaleX(${w})`, opacity: w > 0 ? 1 : 0 }}
    />
  );
}

export function AppShell() {
  const me = useMe();
  const overlay = useUI();
  const [moreOpen, setMoreOpen] = useState(false);
  const isDemo = !me?.id || me.id === "me";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Switching section (e.g. bottom-nav Reels/Profile) should dismiss the search/notifications panels.
  useEffect(() => {
    if (overlay.overlay === "search" || overlay.overlay === "notifications") ui.closeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const swipeTabs: SwipeTab[] = [
    { key: "home", label: "Home", to: "/feed", icon: Home },
    { key: "reels", label: "Reels", to: "/reels", icon: Film },
    {
      key: "profile",
      label: "Profile",
      to: "/profile/$username",
      params: { username: me?.username ?? "aarav_sharma" },
      icon: UserIcon,
    },
  ];
  const activeTabIndex = pathname === "/feed" || pathname === "/"
    ? 0
    : pathname.startsWith("/reels")
      ? 1
      : pathname.startsWith("/profile/")
        ? 2
        : -1;

  const reset = () => {
    if (confirm("Reset demo data? Your demo posts, likes and edits will be cleared.")) {
      resetDemo();
      toast("Demo data reset");
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
                onClick={() => { setMoreOpen(false); reset(); }}
              >
                <RotateCcw className="h-5 w-5" /> Reset demo data
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

      {/* ------- main (swipeable between Home / Reels / Profile on mobile) ------- */}
      <SwipeTabs
        tabs={swipeTabs}
        activeIndex={activeTabIndex}
        enabled={overlay.overlay === null}
        className="md:ml-[76px] xl:ml-[245px] pt-12 pb-14 md:pt-0 md:pb-0 min-h-screen"
      >
        <Outlet />
      </SwipeTabs>

      {/* ------- mobile bottom nav ------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 z-40 flex items-stretch bg-background border-t border-border">
        <Link to="/feed" aria-label="Home" className={cell(activeTabIndex === 0)} onClick={() => ui.closeAll()}>
          <Home className="h-6 w-6" />
          <SwipeLine k="home" />
        </Link>
        <button type="button" aria-label="Search" onClick={ui.openSearch} className={cell(overlay.overlay === "search")}>
          <Search className="h-6 w-6" />
        </button>
        <button type="button" aria-label="Create" onClick={() => ui.openCreate()} className={cell(overlay.overlay === "create")}>
          <span className="block h-6 w-6 rounded-[7px] border-2 border-current relative">
            <span className="absolute inset-0 m-auto h-3 w-0.5 bg-current" />
            <span className="absolute inset-0 m-auto h-0.5 w-3 bg-current" />
          </span>
        </button>
        <Link to="/reels" aria-label="Reels" className={cell(activeTabIndex === 1)}>
          <Film className="h-6 w-6" />
          <SwipeLine k="reels" />
        </Link>
        <Link
          to="/profile/$username"
          params={{ username: me?.username ?? "aarav_sharma" }}
          aria-label="Profile"
          className={cell(activeTabIndex === 2)}
        >
          <Avatar path={me?.avatar_url} alt="me" size={26} className={activeTabIndex === 2 ? "ring-2 ring-[#D62976]" : "ring-1 ring-border"} />
          <SwipeLine k="profile" />
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
