import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Home, Search, Compass, Film, Send, Heart, Menu, Grid3x3, Smile, Gamepad2, User as UserIcon,
} from "lucide-react";
import { SwipeTabs, type SwipeTab } from "@/components/SwipeTabs";
import { MenuSheet, MenuList } from "@/components/MenuSheet";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";
import { ui, useUI, resetDemo } from "@/lib/demo-store";
import { useSwipeProgress } from "@/lib/swipe-progress";
const CreateModal = lazy(() => import("@/components/CreateModal").then((m) => ({ default: m.CreateModal })));
const SearchPanel = lazy(() => import("@/components/SearchPanel").then((m) => ({ default: m.SearchPanel })));
const NotificationsPanel = lazy(() => import("@/components/NotificationsPanel").then((m) => ({ default: m.NotificationsPanel })));
const StoryViewer = lazy(() => import("@/components/StoryViewer").then((m) => ({ default: m.StoryViewer })));
const ShareSheet = lazy(() => import("@/components/ShareSheet").then((m) => ({ default: m.ShareSheet })));
const EditProfileModal = lazy(() => import("@/components/EditProfileModal").then((m) => ({ default: m.EditProfileModal })));

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
// Bottom-nav cell position (of 5 cells) for each swipeable section.
const NAV_CELLS = 5;
const NAV_POS: Record<string, number> = { home: 0, reels: 1, create: 2, moods: 3, profile: 4 };
const IG_GRADIENT = "linear-gradient(90deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)";

// One Instagram-coloured line, as wide as an icon, under the selected tab. During a swipe it
// slides from the current icon to the neighbouring one, following the drag.
function NavIndicator({ activeKey }: { activeKey: string | null }) {
  const pos_map = NAV_POS;
  const cells = NAV_CELLS;
  // During a swipe the line slides from the current icon to the neighbouring one, following the drag.
  const p = useSwipeProgress();
  let pos: number | null = null;
  if (p) {
    const a = pos_map[p.from];
    const b = pos_map[p.to];
    if (a !== undefined && b !== undefined) {
      // The indicator moves in step with the swipe while the finger is held. After a committed swipe
      // it glides the rest of the way to the target icon.
      const amount = p.committed ? 1 : Math.min(1, p.dx / p.full);
      pos = a + (b - a) * amount;
    }
  } else if (activeKey && pos_map[activeKey] !== undefined) {
    pos = pos_map[activeKey];
  }
  if (pos === null) return null;
  const center = ((pos + 0.5) / cells) * 100;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-2 h-[3px] w-8 rounded-full"
      style={{
        left: `${center}%`,
        transform: "translateX(-50%)",
        background: IG_GRADIENT,
        // Follows the finger exactly while dragging; glides after a commit, snap-back or tap.
        transition: p && !p.committed ? "none" : "left 260ms cubic-bezier(.2,.8,.2,1)",
      }}
    />
  );
}

function cell(active: boolean) {
  // Only the icon takes the colour (icons use currentColor); the cell background stays plain.
  return `relative flex-1 h-full flex items-center justify-center transition-colors ${active ? "text-[#D62976]" : ""}`;
}

export function AppShell() {
  const me = useMe();
  const overlay = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Mount the code-split overlays only after the first screen has settled (see the lazy imports above).
  const [overlaysReady, setOverlaysReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOverlaysReady(true), 1000);
    return () => clearTimeout(t);
  }, []);
  const isDemo = !me?.id || me.id === "me";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const embedMode = useRouterState({ select: (s) => s.location.href.includes("embed=") });
  // The top bars (header + second bar, 96px together) slide up on Reels, following a swipe in or out.
  const swipeP = useSwipeProgress();
  // Pages that hide the top bars (Reels, Create, Moods, Profile). Home and Explore keep them.
  const HIDE_BARS = ["reels", "create", "moods", "profile"];
  const pageKey = pathname.startsWith("/reels") ? "reels" : pathname.startsWith("/create") ? "create"
    : pathname.startsWith("/moods") ? "moods" : pathname.startsWith("/profile") ? "profile" : "other";
  const onReels = HIDE_BARS.includes(pageKey);
  const swipeAmt = swipeP ? (swipeP.committed ? 1 : Math.min(1, Math.abs(swipeP.dx) / Math.max(1, swipeP.full))) : 0;
  const toHides = swipeP ? HIDE_BARS.includes(swipeP.to) : false;
  let barHide = onReels ? 1 : 0;
  if (swipeP) {
    if (onReels) barHide = toHides ? 1 : 1 - swipeAmt;
    else barHide = toHides ? swipeAmt : 0;
  }
  const swiping = !!swipeP && !swipeP.committed;
  useEffect(() => {
    // Content padding follows the bars (CSS var read by the page, the embed wrapper and the swipe preview).
    document.documentElement.style.setProperty("--bar-pad", `${(1 - barHide) * 96}px`);
    document.documentElement.dataset.swiping = swiping ? "1" : "0";
  }, [barHide, swiping]);
  const barStyle = {
    transform: `translate3d(0, ${-barHide * 96}px, 0)`,
    transition: swiping ? "none" : "transform 260ms cubic-bezier(.2,.8,.2,1)",
  } as const;

  // Switching section (e.g. bottom-nav Reels/Profile) should dismiss the search/notifications panels.
  useEffect(() => {
    if (overlay.overlay === "search" || overlay.overlay === "notifications") ui.closeAll();
    setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Swipe order matches the bottom nav: Home, Reels, Create, Moods, Profile. Every tab is a real page.
  const swipeTabs: SwipeTab[] = [
    { key: "home", label: "Home", to: "/feed", icon: Home },
    { key: "reels", label: "Reels", to: "/reels", icon: Film },
    { key: "create", label: "Create", to: "/create", icon: PlusIcon },
    { key: "moods", label: "Moods", to: "/moods", icon: Smile },
    {
      key: "profile",
      label: "Profile",
      to: "/profile/$username",
      params: { username: me?.username ?? "aarav_sharma" },
      icon: UserIcon,
    },
  ];
  // The profile tab is only "selected" on my own profile; someone else's profile selects no tab.
  const profileUsername = pathname.startsWith("/profile/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : null;
  const onOwnProfile = profileUsername !== null && profileUsername === me?.username;
  // Index in swipeTabs and NAV_POS (-1 when the current page is not one of the sections).
  const activeTabIndex = pathname === "/feed" || pathname === "/"
    ? 0
    : pathname.startsWith("/reels")
      ? 1
      : pathname.startsWith("/create")
        ? 2
        : pathname.startsWith("/moods")
          ? 3
          : onOwnProfile
            ? 4
            : -1;
  // While search is open no tab is selected (Instagram-style): only the nav highlight changes, not the swipe position.
  const navIndex = overlay.overlay === "search" ? -1 : activeTabIndex;
  const activeKey = navIndex === 0 ? "home" : navIndex === 1 ? "reels" : navIndex === 2 ? "create"
    : navIndex === 3 ? "moods" : navIndex === 4 ? "profile" : null;

  const reset = () => {
    if (confirm("Reset demo data? Your demo posts, likes and edits will be cleared.")) {
      resetDemo();
      toast("Demo data reset");
    }
  };

  // Embedded inside a swipe preview: render just the page. Read from the router, not `window`,
  // so the server-rendered HTML matches the client.
  if (embedMode) {
    return (
      <div className="min-h-screen pt-[var(--bar-pad)] pb-14 md:pt-0 md:pb-0 sv-barpad">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ------- desktop sidebar: the full menu list ------- */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[76px] xl:w-[330px] flex-col bg-background px-3 py-6 z-40">
        {/* logo icon, then the search bar (pill from xl; a full-width icon button on md) */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 xl:gap-2 pl-3 pr-0 mb-4">
          <Link to="/feed" className="flex items-center shrink-0" aria-label="Socialverse home">
            <img src="/header-logo.png" alt="" aria-hidden width={112} height={112} className="h-10 w-10" />
          </Link>
          {/* On Explore (desktop) the search bar is swapped for the Socialverse wordmark; it returns when you leave */}
          {pathname.startsWith("/explore") && (
            <span className="hidden xl:flex flex-1 min-w-0 items-center">
              <Wordmark className="text-[26px]" />
            </span>
          )}
          <button
            type="button"
            onClick={ui.openSearch}
            aria-label="Search"
            className={`${pathname.startsWith("/explore") ? "xl:hidden " : ""}flex h-10 flex-1 min-w-0 cursor-text items-center justify-center xl:justify-start gap-2 rounded-full bg-muted xl:px-4 text-base text-muted-foreground ring-1 ring-border shadow-[0_0_8px_rgba(214,41,118,0.18)]`}
          >
            <Search className="h-5 w-5 shrink-0" />
            <span className="hidden xl:inline">Search social</span>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <MenuList
            inline
            username={me?.username ?? "aarav_sharma"}
            onClose={closeMenu}
            onReset={reset}
          />
        </div>
      </aside>

      {/* ------- desktop bottom bar: the same 5 tabs as the phone bottom nav, kept to phone width ------- */}
      <nav aria-label="Main" className="hidden md:flex fixed bottom-0 left-[76px] right-0 xl:left-[330px] h-14 z-40 items-stretch">
        <div className="relative flex w-full h-full items-stretch bg-background border-t border-border">
        <NavIndicator activeKey={activeKey} />
        <Link to="/feed" aria-label="Home" className={cell(navIndex === 0)} onClick={() => ui.closeAll()}>
          <Home className="h-6 w-6" />
        </Link>
        <Link to="/reels" aria-label="Reels" className={cell(navIndex === 1)}>
          <Film className="h-6 w-6" />
        </Link>
        <Link to="/create" aria-label="Create" className={cell(navIndex === 2)}>
          <span className="block h-6 w-6 rounded-[7px] border-2 border-current relative">
            <span className="absolute inset-0 m-auto h-3 w-0.5 bg-current" />
            <span className="absolute inset-0 m-auto h-0.5 w-3 bg-current" />
          </span>
        </Link>
        <Link to="/moods" aria-label="Moods" className={cell(navIndex === 3)}>
          <Smile className="h-6 w-6" />
        </Link>
        <Link
          to="/profile/$username"
          params={{ username: me?.username ?? "aarav_sharma" }}
          aria-label="Profile"
          className={cell(navIndex === 4)}
        >
          <Avatar path={me?.avatar_url} alt="me" size={26} className={activeTabIndex === 4 ? "ring-2 ring-[#D62976]" : "ring-1 ring-border"} />
        </Link>
        </div>
      </nav>

      {/* ------- mobile top bar ------- */}
      <header style={barStyle} className="md:hidden fixed top-0 inset-x-0 h-12 z-40 flex items-center justify-between px-4 bg-background/95 backdrop-blur border-b border-border">
        <Link to="/feed" className="flex items-center gap-2">
          {/* logo icon only (no text), to the left of the wordmark */}
          <img src="/header-logo.png" alt="" aria-hidden width={112} height={112} className="h-7 w-7" />
          <Wordmark className="text-[22px]" />
        </Link>
        <div className="flex items-center gap-5">
          <button type="button" aria-label="Gaming" onClick={() => toast("Gaming demo mein abhi available nahi hai")}>
            <Gamepad2 className="h-6 w-6" />
          </button>
          <button type="button" aria-label="Notifications" onClick={ui.openNotifications}>
            <Heart className="h-6 w-6" />
          </button>
          <button type="button" aria-label="Menu" onClick={() => setMenuOpen(true)} className="grid place-items-center cursor-pointer transition-opacity hover:opacity-60">
            <Grid3x3 className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* ------- second bar under the top bar: Community tab ------- */}
      <div style={barStyle} className="md:hidden fixed top-12 inset-x-0 h-12 z-40 flex items-center justify-end px-4 bg-background/95 backdrop-blur border-b border-border">
        {/* under the Menu button: search bar, then Messages and Community icons (right edge aligned) */}
        <button type="button" onClick={ui.openSearch} aria-label="Search" className="flex flex-1 min-w-0 cursor-text items-center gap-2 mr-4 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border shadow-[0_0_8px_rgba(214,41,118,0.18)]">
          <Search className="h-4 w-4" /> Search
        </button>
        <div className="flex items-center gap-5">
          <Link to="/dm" aria-label="Messages" className="grid h-6 w-6 place-items-center">
            <Send className="h-6 w-6 -rotate-12" />
          </Link>
          <Link to="/groups" aria-label="Community" className="grid h-6 w-6 place-items-center">
            <img src="/community.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full object-cover" />
          </Link>
        </div>
      </div>

      {/* ------- main (swipeable between Home / Reels / Profile on mobile) ------- */}
      <SwipeTabs
        tabs={swipeTabs}
        activeIndex={activeTabIndex}
        enabled={overlay.overlay === null && !menuOpen}
        className="md:ml-[76px] xl:ml-[330px] pt-[var(--bar-pad)] pb-14 md:pt-0 md:pb-14 min-h-screen sv-barpad"
      >
        <Outlet />
      </SwipeTabs>

      {/* ------- mobile bottom nav ------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 z-40 flex items-stretch bg-background border-t border-border">
        <NavIndicator activeKey={activeKey} />
        <Link to="/feed" aria-label="Home" className={cell(navIndex === 0)} onClick={() => ui.closeAll()}>
          <Home className="h-6 w-6" />
        </Link>
        <Link to="/reels" aria-label="Reels" className={cell(navIndex === 1)}>
          <Film className="h-6 w-6" />
        </Link>
        <Link to="/create" aria-label="Create" className={cell(navIndex === 2)}>
          <span className="block h-6 w-6 rounded-[7px] border-2 border-current relative">
            <span className="absolute inset-0 m-auto h-3 w-0.5 bg-current" />
            <span className="absolute inset-0 m-auto h-0.5 w-3 bg-current" />
          </span>
        </Link>
        <Link to="/moods" aria-label="Moods" className={cell(navIndex === 3)}>
          <Smile className="h-6 w-6" />
        </Link>
        <Link
          to="/profile/$username"
          params={{ username: me?.username ?? "aarav_sharma" }}
          aria-label="Profile"
          className={cell(navIndex === 4)}
        >
          <Avatar path={me?.avatar_url} alt="me" size={26} className={activeTabIndex === 4 ? "ring-2 ring-[#D62976]" : "ring-1 ring-border"} />
        </Link>
      </nav>

      {/* ------- menu (mobile: from the grid button; desktop: More) ------- */}
      {menuOpen && (
        <MenuSheet
          open={menuOpen}
          onClose={closeMenu}
          username={me?.username ?? "aarav_sharma"}
          onReset={reset}
        />
      )}

      {/* ------- global overlays ------- */}
      {/* Overlays are code-split and mounted after the first paint, so their JS is not on the critical path. */}
      {overlaysReady && (
        <Suspense fallback={null}>
          <CreateModal />
          <SearchPanel />
          <NotificationsPanel />
          <StoryViewer />
          <ShareSheet />
          <EditProfileModal />
        </Suspense>
      )}
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
