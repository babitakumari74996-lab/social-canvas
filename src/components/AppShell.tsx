import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Home, Users, Clock, Rss, UsersRound, Megaphone, MessagesSquare, Flag,
  Calendar, History as HistoryIcon, Compass, Film, Send, User, Search,
  Menu, X, PlusCircle, Sparkles, type LucideIcon,
} from "lucide-react";
import { useMyProfile } from "@/lib/auth";
import { PlusProvider } from "./PlusModal";
import { useSignedUrl } from "@/lib/media";
import { SearchProvider, useSearch } from "./SearchContext";
import { TodayModal } from "./TodayModal";
import { ProfileEditModal } from "./ProfileEditModal";
import { useState } from "react";

type NavDef = { to: string; label: string; icon: LucideIcon };

const SIDEBAR: NavDef[] = [
  { to: "/feed", label: "Home", icon: Home },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/memories", label: "Memories", icon: Clock },
  { to: "/feeds", label: "Feeds", icon: Rss },
  { to: "/groups", label: "Groups", icon: UsersRound },
  { to: "/ads", label: "Ads Manager", icon: Megaphone },
  { to: "/dm", label: "Messenger", icon: MessagesSquare },
  { to: "/pages", label: "Pages", icon: Flag },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/history", label: "History", icon: HistoryIcon },
];

function SidebarItem({ to, label, icon: Icon, active, onClick }: NavDef & { active: boolean; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
      }`}
    >
      <span className={`h-9 w-9 grid place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TopSearch() {
  const { query, setQuery } = useSearch();
  return (
    <div className="flex-1 max-w-xl mx-4 hidden sm:block">
      <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SocialVerse"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function AppShellInner() {
  const { data: profile } = useMyProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (to: string) => path === to || (to !== "/feed" && path.startsWith(to + "/")) || (to === "/feed" && path === "/feed");

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-3">
        <Link to="/feed" className="text-lg font-bold tracking-tight text-primary shrink-0">SocialVerse</Link>
        <TopSearch />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/friends" className="relative h-10 w-10 grid place-items-center rounded-full bg-muted hover:bg-muted/70" aria-label="Friends">
            <Users className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5">3</span>
          </Link>
          {/* Messages on desktop, Today post on mobile */}
          <Link to="/dm" className="relative hidden lg:grid h-10 w-10 place-items-center rounded-full bg-muted hover:bg-muted/70" aria-label="Messages">
            <MessagesSquare className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5">2</span>
          </Link>
          <button
            className="lg:hidden h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground"
            onClick={() => setTodayOpen(true)}
            aria-label="Today's life post"
          >
            <PlusCircle className="h-5 w-5" />
          </button>
          <button
            className="lg:hidden h-10 w-10 grid place-items-center rounded-full bg-muted"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-64 bg-card border-r border-border flex-col">
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {SIDEBAR.map((n) => (
            <SidebarItem key={n.to} {...n} active={isActive(n.to)} />
          ))}
          <div className="mt-4 mx-2 rounded-xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> On this day</div>
            <div className="mt-1 text-xs text-muted-foreground">You have 3 memories from previous years. Tap to revisit.</div>
          </div>
        </nav>
        {profile && (
          <div className="flex items-center gap-2 border-t border-border px-3 py-3 text-xs">
            {avatar.data ? (
              <img src={avatar.data} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted" />
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">{profile.display_name ?? `@${profile.username}`}</div>
              <div className="text-muted-foreground">
                {profile.subscription_tier === "plus" ? (<span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Plus</span>) : "Free"}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="font-bold text-primary">SocialVerse</span>
              <button onClick={() => setDrawerOpen(false)} className="h-9 w-9 grid place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
              {SIDEBAR.map((n) => (
                <SidebarItem key={n.to} {...n} active={isActive(n.to)} onClick={() => setDrawerOpen(false)} />
              ))}
              <div className="mt-4 mx-2 rounded-xl border border-border bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> On this day</div>
                <div className="mt-1 text-xs text-muted-foreground">3 memories to revisit.</div>
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="pt-14 lg:pl-64 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav (desktop + mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 lg:left-64 h-16 bg-card border-t border-border z-40 flex items-center justify-around px-2">
        <BottomBtn to="/explore" label="Explore" icon={Compass} active={isActive("/explore")} />
        <BottomBtn to="/reels" label="Reels" icon={Film} active={isActive("/reels")} />
        <button
          onClick={() => setTodayOpen(true)}
          className="flex flex-col items-center -mt-6"
          aria-label="New post"
        >
          <span className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg">
            <PlusCircle className="h-7 w-7" />
          </span>
          <span className="text-[10px] mt-0.5 font-semibold">Post</span>
        </button>
        <BottomBtn to="/dm" label="Messages" icon={Send} active={isActive("/dm")} badge={2} />
        <button
          onClick={() => setProfileOpen(true)}
          className="flex flex-col items-center text-muted-foreground hover:text-foreground"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </nav>

      <TodayModal open={todayOpen} onOpenChange={setTodayOpen} />
      <ProfileEditModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

function BottomBtn({ to, label, icon: Icon, active, badge }: NavDef & { active: boolean; badge?: number }) {
  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center px-2 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] mt-0.5">{label}</span>
      {badge ? (
        <span className="absolute top-0 right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full px-1">{badge}</span>
      ) : null}
    </Link>
  );
}

export function AppShell() {
  const { data: profile } = useMyProfile();
  return (
    <PlusProvider tier={profile?.subscription_tier} userId={profile?.id ?? null}>
      <SearchProvider>
        <AppShellInner />
      </SearchProvider>
    </PlusProvider>
  );
}