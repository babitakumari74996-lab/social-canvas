import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  Clock,
  Rss,
  UsersRound,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Flag,
  Calendar,
  History as HistoryIcon,
  Film,
  Search,
  Menu,
  X,
  Sparkles,
  ThumbsUp,
  Bookmark,
  Heart,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Camera,
  FileText,
  Notebook,
  type LucideIcon,
} from "lucide-react";
import { useMyProfile } from "@/lib/auth";
import { PlusProvider } from "./PlusModal";
import { FriendsPanel } from "./FriendsPanel";
import { MessagesPanel } from "./MessagesPanel";
import { useSignedUrl } from "@/lib/media";
import { SearchProvider, useSearch } from "./SearchContext";
import { TodayModal } from "./TodayModal";
import { ProfileEditModal } from "./ProfileEditModal";
import { BottomNav } from "./BottomNav";
import { NotificationBadge } from "./Badge";
import { useEffect, useState } from "react";

type NavDef = { to: string; label: string; icon: LucideIcon };

const NAV_COLORS: Record<string, string> = {
  Home: "bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:text-primary",
  Friends:
    "bg-emerald-50/80 text-emerald-500 group-hover:bg-emerald-100/80 group-hover:text-emerald-600",
  Memories: "bg-amber-50/80 text-amber-500 group-hover:bg-amber-100/80 group-hover:text-amber-600",
  Feeds: "bg-violet-50/80 text-violet-500 group-hover:bg-violet-100/80 group-hover:text-violet-600",
  Groups: "bg-blue-50/80 text-blue-500 group-hover:bg-blue-100/80 group-hover:text-blue-600",
  "Ads Manager":
    "bg-orange-50/80 text-orange-500 group-hover:bg-orange-100/80 group-hover:text-orange-600",
  Messenger: "bg-blue-50/80 text-blue-500 group-hover:bg-blue-100/80 group-hover:text-blue-600",
  Pages: "bg-indigo-50/80 text-indigo-500 group-hover:bg-indigo-100/80 group-hover:text-indigo-600",
  Events: "bg-blue-50/80 text-blue-500 group-hover:bg-blue-100/80 group-hover:text-blue-600",
  History: "bg-teal-50/80 text-teal-500 group-hover:bg-teal-100/80 group-hover:text-teal-600",
  Saved: "bg-yellow-50/80 text-yellow-500 group-hover:bg-yellow-100/80 group-hover:text-yellow-600",
  "Saved Products":
    "bg-yellow-50/80 text-yellow-500 group-hover:bg-yellow-100/80 group-hover:text-yellow-600",
  Besties: "bg-blue-50/80 text-blue-500 group-hover:bg-blue-100/80 group-hover:text-blue-600",
  Settings: "bg-gray-50/80 text-gray-500 group-hover:bg-gray-100/80 group-hover:text-gray-600",
};

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
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/saved-products", label: "Saved Products", icon: Bookmark },
  { to: "/besties", label: "Besties", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

function SidebarItem({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: NavDef & { active: boolean; onClick?: () => void }) {
  const color = NAV_COLORS[label] ?? "bg-muted text-foreground";
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
      }`}
    >
      <span
        className={`h-9 w-9 grid place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : color}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TopSearch() {
  const { query, setQuery } = useSearch();
  return (
    <div className="hidden sm:block flex-1 max-w-[320px] mx-3 lg:mx-4">
      <div className="flex items-center gap-2 rounded-full bg-muted/50 dark:bg-muted/20 border border-border/30 px-3 py-2 cursor-text">
        <Search
          className="h-4 w-4 text-muted-foreground shrink-0 dark:text-muted-foreground/80"
          strokeWidth={2}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, posts..."
          className="flex-1 bg-transparent text-sm outline-none min-w-0 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden lg:inline-flex items-center text-[10px] font-medium text-muted-foreground/60 border border-border/40 rounded px-1.5 h-4 leading-none dark:border-border/30 dark:text-muted-foreground/60">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}

function AppShellInner() {
  const { data: profile } = useMyProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { query, setQuery } = useSearch();
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"friends" | "dm" | "liked" | "messages" | null>(
    () => (window.innerWidth >= 1024 ? "liked" : null),
  );
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);
  const filteredSidebar = SIDEBAR.filter((item) =>
    item.label.toLowerCase().includes(menuSearch.toLowerCase()),
  );
  const visibleSidebar = showAll || menuSearch ? filteredSidebar : filteredSidebar.slice(0, 6);

  useEffect(() => {
    const openToday = () => setTodayOpen(true);
    window.addEventListener("open-today", openToday);
    return () => window.removeEventListener("open-today", openToday);
  }, []);

  useEffect(() => {
    const openCreate = () => setCreateOpen(true);
    window.addEventListener("open-create", openCreate);
    return () => window.removeEventListener("open-create", openCreate);
  }, []);

  const isActive = (to: string) =>
    path === to ||
    (to !== "/feed" && path.startsWith(to + "/")) ||
    (to === "/feed" && path === "/feed");

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center px-3 sm:px-5 bg-white/85 dark:bg-card/90 backdrop-blur-xl border-b border-border/30 shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <Link to="/feed" className="shrink-0 flex items-center gap-2 sm:gap-3">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 grid place-items-center ring-1 ring-primary/10">
            <img src="/logo.svg" alt="SocialVerse" className="h-5 w-auto" />
          </span>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight text-foreground/90">
            SocialVerse
          </span>
        </Link>
        <TopSearch />
        <button
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden h-10 w-10 grid place-items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/20 active:scale-[0.94] transition-all duration-200 cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-5 w-5" strokeWidth={1.8} />
        </button>
        {mobileSearchOpen && (
          <div className="sm:hidden fixed inset-x-0 top-0 z-[70] bg-white/85 dark:bg-card/95 backdrop-blur-xl border-b border-border/30 shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 px-4 h-14">
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="h-10 w-10 grid place-items-center rounded-xl hover:bg-muted/70 dark:hover:bg-muted/20 active:scale-[0.94] transition-all duration-200 cursor-pointer text-muted-foreground shrink-0"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <div className="flex-1 flex items-center gap-2 rounded-full bg-muted/60 dark:bg-muted/30 border border-border/30 px-4 py-2 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-200 dark:dark-border-glow">
                <Search
                  className="h-5 w-5 text-muted-foreground shrink-0 dark:text-muted-foreground/80"
                  strokeWidth={2}
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people, posts..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 dark:placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setRightPanel(rightPanel === "friends" ? null : "friends")}
            className={`relative h-10 w-10 grid place-items-center rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.94] ${
              rightPanel === "friends"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/20"
            }`}
            aria-label="Friends"
          >
            <Users className="h-5 w-5" strokeWidth={1.8} />
            <NotificationBadge count={3} priority="high" />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === "messages" ? null : "messages")}
            className={`relative h-10 w-10 grid place-items-center rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.94] ${
              rightPanel === "messages"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/20"
            }`}
            aria-label="Messages"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === "liked" ? null : "liked")}
            className={`relative h-10 w-10 grid place-items-center rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.94] ${
              rightPanel === "liked"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/20"
            }`}
            aria-label="Liked posts"
          >
            <ThumbsUp className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button
            className="lg:hidden relative h-10 w-10 grid place-items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 dark:hover:bg-muted/20 active:scale-[0.94] transition-all duration-200 cursor-pointer"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent dark:via-border/30" />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 bg-card/95 backdrop-blur-xl border-r border-border/30 dark:border-border/20 flex-col shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)]">
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {visibleSidebar.map((n) => (
            <SidebarItem key={n.to} {...n} active={isActive(n.to)} />
          ))}
          {!menuSearch && filteredSidebar.length > 6 && (
            <button
              onClick={() => setShowAll((p) => !p)}
              className="mx-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 cursor-pointer border border-dashed border-border/40 dark:border-border/30"
            >
              {showAll ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>{showAll ? "Show Less" : "Show All"}</span>
            </button>
          )}
          <div className="mt-6 mx-2 rounded-xl border border-border/40 bg-gradient-to-br from-primary/[0.12] to-primary/[0.03] dark:from-primary/[0.15] dark:to-primary/[0.04] p-4">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" /> On this day
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground/80 dark:text-muted-foreground/70">
              You have 3 memories from previous years. Tap to revisit.
            </div>
          </div>
          <button
            onClick={() => setIsDark((p) => !p)}
            className="mt-3 mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-foreground hover:bg-muted/50 cursor-pointer"
          >
            <span className="h-9 w-9 grid place-items-center rounded-full bg-amber-50/80 text-amber-500 group-hover:bg-amber-100/80 group-hover:text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-300">
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </span>
            <span>{isDark ? "Light Inversion" : "Dark Inversion"}</span>
          </button>
        </nav>
        {profile && (
          <div className="flex items-center gap-2 border-t border-border/30 px-3 py-3 text-xs dark:border-border/20">
            {avatar.data ? (
              <img
                src={avatar.data}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-1 ring-primary/20"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-muted/50 dark:bg-muted/30" />
            )}
            <div className="min-w-0">
              <div className="truncate font-medium">
                {profile.display_name ?? `@${profile.username}`}
              </div>
              <div className="text-muted-foreground/80 dark:text-muted-foreground/70">
                {profile.subscription_tier === "plus" ? (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> Plus
                  </span>
                ) : (
                  "Free"
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-card/95 backdrop-blur-xl border-l border-border/30 dark:border-border/20 flex flex-col animate-in slide-in-from-right duration-200 shadow-[0_0_40px_rgba(0,0,0,0.2)] dark:shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between p-3 border-b border-border/30 dark:border-border/20">
              <img src="/logo.svg" alt="SocialVerse" className="h-8 w-auto" />
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full bg-muted/50 hover:bg-muted dark:hover:bg-muted/30 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 dark:bg-muted/30 px-2.5 py-1.5 border border-border/20 dark:border-border/10">
                <Search className="h-3.5 w-3.5 text-muted-foreground/70 dark:text-muted-foreground/60 shrink-0" />
                <input
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">
              {visibleSidebar.map((n) => (
                <SidebarItem
                  key={n.to}
                  {...n}
                  active={isActive(n.to)}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
              {!menuSearch && filteredSidebar.length > 6 && (
                <button
                  onClick={() => setShowAll((p) => !p)}
                  className="mx-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 cursor-pointer border border-dashed border-border/40 dark:border-border/30"
                >
                  {showAll ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{showAll ? "Show Less" : "Show All"}</span>
                </button>
              )}
              <div className="mt-6 mx-2 rounded-xl border border-border/40 bg-gradient-to-br from-primary/[0.12] to-primary/[0.03] dark:from-primary/[0.15] dark:to-primary/[0.04] p-4">
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" /> On this day
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground/80 dark:text-muted-foreground/70">
                  3 memories to revisit.
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDark((p) => !p);
                  setDrawerOpen(false);
                }}
                className="mt-3 mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-foreground hover:bg-muted/50 cursor-pointer"
              >
                <span className="h-9 w-9 grid place-items-center rounded-full bg-amber-50/80 text-amber-500 group-hover:bg-amber-100/80 group-hover:text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-300">
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </span>
                <span>{isDark ? "Light Inversion" : "Dark Inversion"}</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className={`pt-14 lg:pl-64 pb-24 ${rightPanel ? "lg:pl-64 lg:pr-[420px]" : ""}`}>
        <Outlet />
      </main>

      {/* Right panel */}
      {rightPanel && (
        <>
          {/* Mobile full screen */}
          <div className="lg:hidden fixed inset-0 z-[60] bg-card/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
            <RightPanelContent panel={rightPanel} onClose={() => setRightPanel(null)} />
          </div>
          {/* Desktop panel */}
          <aside className="hidden lg:flex fixed right-0 top-14 bottom-0 w-[420px] bg-card/95 backdrop-blur-xl border-l border-border/30 dark:border-border/20 flex-col z-40 animate-in slide-in-from-right duration-200 shadow-[0_0_40px_rgba(0,0,0,0.15)] dark:shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <RightPanelContent panel={rightPanel} onClose={() => setRightPanel(null)} />
          </aside>
        </>
      )}

      <BottomNav
        path={path}
        rightPanel={rightPanel !== null}
        onProfileOpen={() => setProfileOpen(true)}
      />

      {/* Create menu */}
      {createOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70 animate-in fade-in duration-200"
            onClick={() => setCreateOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom-full duration-300 ease-out max-h-[85vh] overflow-y-auto shadow-[0_-4px_20px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] border-t border-border/30 dark:border-border/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create</h2>
                <p className="text-xs text-muted-foreground mt-1">Share something new</p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="h-8 w-8 grid place-items-center rounded-full bg-muted/50 hover:bg-muted dark:hover:bg-muted/30 active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <CreateOption
                icon={FileText}
                label="Post"
                color="text-primary bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/15 dark:ring-primary/25"
                onClick={() => {
                  setCreateOpen(false);
                  setTodayOpen(true);
                }}
              />
              <CreateOption
                icon={Camera}
                label="Story"
                color="text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20 dark:bg-blue-500/15 dark:ring-blue-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  setTodayOpen(true);
                }}
              />
              <CreateOption
                icon={Film}
                label="Reel"
                color="text-violet-400 bg-violet-500/10 ring-1 ring-violet-500/20 dark:bg-violet-500/15 dark:ring-violet-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  window.location.href = "/reels";
                }}
              />
              <CreateOption
                icon={Heart}
                label="Life Update"
                color="text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20 dark:bg-blue-500/15 dark:ring-blue-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  setTodayOpen(true);
                }}
              />
              <CreateOption
                icon={Notebook}
                label="Note"
                color="text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:ring-amber-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  setTodayOpen(true);
                }}
              />
              <CreateOption
                icon={Flag}
                label="Page"
                color="text-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-500/20 dark:bg-indigo-500/15 dark:ring-indigo-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  window.location.href = "/pages";
                }}
              />
              <CreateOption
                icon={Megaphone}
                label="Ad"
                color="text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20 dark:bg-orange-500/15 dark:ring-orange-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  window.location.href = "/ads";
                }}
              />
              <CreateOption
                icon={UsersRound}
                label="Group"
                color="text-blue-400 bg-blue-500/10 ring-1 ring-blue-500/20 dark:bg-blue-500/15 dark:ring-blue-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  window.location.href = "/groups";
                }}
              />
              <CreateOption
                icon={Calendar}
                label="Event"
                color="text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:ring-emerald-500/25"
                onClick={() => {
                  setCreateOpen(false);
                  window.location.href = "/events";
                }}
              />
            </div>
          </div>
        </div>
      )}

      <TodayModal open={todayOpen} onOpenChange={setTodayOpen} />
      <ProfileEditModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}

function CreateOption({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 ease-out cursor-pointer group"
    >
      <span
        className={`h-14 w-14 grid place-items-center rounded-2xl shadow-sm group-hover:shadow-md transition-shadow duration-200 ${color}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function RightPanelContent({ panel, onClose }: { panel: string; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="font-semibold text-sm">
          {panel === "friends" ? "Friends" : panel === "messages" ? "Messages" : "Liked"}
        </span>
        <button
          onClick={onClose}
          className="h-7 w-7 grid place-items-center rounded-full bg-muted hover:bg-muted/70 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {panel === "friends" ? (
          <FriendsPanel />
        ) : panel === "messages" ? (
          <MessagesPanel />
        ) : (
          <div className="text-sm text-muted-foreground">No liked posts yet.</div>
        )}
      </div>
    </>
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
