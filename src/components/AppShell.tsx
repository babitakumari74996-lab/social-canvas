import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { X as CloseIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Home, Search, Compass, Film, Send, Heart, Menu, Grid3x3, Smile, Gamepad2, User as UserIcon,
} from "lucide-react";
import { SwipeTabs, type SwipeTab } from "@/components/SwipeTabs";
import { FloatingPanel, type DockPanel } from "@/components/FloatingPanel";
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
const FAB = "grid h-14 w-14 place-items-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border transition-opacity hover:opacity-70";
const NAV_CELLS = 5;
// Desktop Reels card width (9:16 at the window height, capped at 516px). The bottom bar matches it so it sits under the reel.
const REEL_W = "min(516px, (100vh - 24px) * 9 / 16)";
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
      className="pointer-events-none absolute bottom-1 h-1 w-[56px] md:w-[66px] rounded-full"
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
  const navigate = useNavigate();
  const embedMode = useRouterState({ select: (s) => s.location.href.includes("embed=") });
  // The top bars (header + second bar, 96px together) slide up on Reels, following a swipe in or out.
  const swipeP = useSwipeProgress();
  // Pages that hide the top bars (Reels, Create, Moods, Profile). Home and Explore keep them.
  const HIDE_BARS = ["reels", "create", "moods", "profile"];
  const pageKey = pathname.startsWith("/reels") ? "reels" : pathname.startsWith("/create") ? "create"
    : pathname.startsWith("/moods") ? "moods" : pathname.startsWith("/profile") ? "profile" : "other";
  const onReels = HIDE_BARS.includes(pageKey);
  const swipeAmt = swipeP ? (swipeP.committed ? 1 : Math.min(1, Math.abs(swipeP.dx) / Math.max(1, swipeP.full))) : 0;
  // Quick icons belong to Home only: they follow a swipe to or from Home, and jump on a click.
  const onHome = pathname.startsWith("/feed");
  const toHome = swipeP?.to === "home";
  const fromHome = swipeP?.from === "home";
  const homeAmt = swipeP
    ? toHome && !fromHome ? swipeAmt : fromHome && !toHome ? 1 - swipeAmt : toHome ? 1 : 0
    : onHome ? 1 : 0;
  const toHides = swipeP ? HIDE_BARS.includes(swipeP.to) : false;
  let barHide = onReels ? 1 : 0;
  if (swipeP) {
    if (onReels) barHide = toHides ? 1 : 1 - swipeAmt;
    else barHide = toHides ? swipeAmt : 0;
  }
  const swiping = !!swipeP && !swipeP.committed;
  // Floating window opened from a corner icon (desktop). One at a time; clicking the same icon again closes it.
  // Floating windows (desktop corner icons). Several can be open at once; each remembers its place.
  const [docks, setDocks] = useState<DockPanel[]>([]);
  // Same icon again closes it; another icon opens its own window.
  const openDock = (id: string, title: string, extra: Partial<DockPanel> = {}) => {
    const cur = docks.find((d) => d.id === id);
    if (cur && !cur.leaving) {
      setDocks((ds) => ds.map((d) => (d.id === id ? { ...d, leaving: true } : d)));
      return;
    }
    const z = Math.max(0, ...docks.map((d) => d.z ?? 0)) + 1;
    const entry: DockPanel = { id, title, seq: Date.now(), locked: false, leaving: false, z, ...extra };
    // Replace in place (keeps the list order, so the other windows' iframes are not moved in the DOM).
    setDocks((ds) => (ds.some((d) => d.id === id) ? ds.map((d) => (d.id === id ? entry : d)) : [...ds, entry]));
  };
  // Switching tabs: unlocked windows slide out to the right; locked ones stay.
  useEffect(() => {
    setDocks((ds) => ds.map((d) => (d.locked || d.leaving ? d : { ...d, leaving: true })));
  }, [pageKey]);
  // Bring a window to the front (stacking only; the list order never changes).
  const focusDock = (id: string) =>
    setDocks((ds) => {
      const top = Math.max(0, ...ds.map((d) => d.z ?? 0));
      const cur = ds.find((d) => d.id === id);
      if (!cur || (cur.z ?? 0) === top) return ds;
      return ds.map((d) => (d.id === id ? { ...d, z: top + 1 } : d));
    });
  // An unlocked window moves with the Home <-> Reels swipe, the same way the Home tab does.
  const swipeMove =
    swipeP && !swipeP.committed
      ? swipeP.from === "home" && swipeP.to === "reels"
        ? -Math.abs(swipeP.dx)
        : swipeP.from === "reels" && swipeP.to === "home"
          ? Math.abs(swipeP.dx)
          : 0
      : 0;
  // Desktop bottom bar colour: black while Reels is shown, and it blends with the swipe as it goes to or from Reels.
  const toR = swipeP?.to === "reels";
  const fromR = swipeP?.from === "reels";
  // Only the Reels page itself (not Create / Moods / Profile) turns the bar black and hides the sidebar.
  let navBlack = pageKey === "reels" ? 1 : 0;
  if (swipeP) navBlack = toR && !fromR ? swipeAmt : fromR && !toR ? 1 - swipeAmt : toR ? 1 : 0;
  // Sidebar travels with the Home tab during a Home <-> Reels drag: its left edge is the Home page's left edge minus the sidebar width.
  const sideW = typeof window !== "undefined" && window.innerWidth >= 1280 ? 330 : 76;
  const dragPx = swipeP ? Math.abs(swipeP.dx) : 0;
  let asideX = `${-navBlack * 100}%`;
  if (swipeP && !swipeP.committed) {
    if (swipeP.from === "home" && swipeP.to === "reels") asideX = `${-dragPx}px`;
    else if (swipeP.from === "reels" && swipeP.to === "home") asideX = `${dragPx - (window.innerWidth - sideW)}px`;
  }
  const mix = (light: number, dark: number) => Math.round(light + (dark - light) * navBlack);
  // Bar position (not colour): it stays where it was while a swipe is in progress and only moves after the tab changes.
  const navBg = `rgb(${mix(250, 0)},${mix(250, 0)},${mix(250, 0)})`;
  const navFg = `rgb(${mix(38, 255)},${mix(38, 255)},${mix(38, 255)})`;
  useEffect(() => {
    // Content padding follows the bars (CSS var read by the page, the embed wrapper and the swipe preview).
    document.documentElement.style.setProperty("--bar-pad", onHome ? "0px" : `${(1 - barHide) * 96}px`);
    // Desktop sidebar slides away with the swipe (transform only, so the page layout never moves).
    // Swiping to Reels fades the leaving page, so no Home content shows beside the Reels page.
    const toReels = !!swipeP && swipeP.to === "reels";
    // No fade: the Home page slides out beside the Reels layer instead of ghosting over it.
    document.documentElement.style.setProperty("--feed-opacity", "1");
    document.documentElement.dataset.swiping = swiping ? "1" : "0";
  }, [barHide, swiping, swipeP, swipeAmt, onHome]);
  // Home: scrolling down hides the top bars and the bottom bar; scrolling back up brings them back.
  // Only the transform changes here (the page padding does not), so the content never jumps.
  // The amount hidden follows the scroll distance 1:1 (scroll down 30px = 30px of bar slides away, scroll up
  // brings it back by the same amount). Written as CSS variables on <html>, so no re-render per scroll event.
  useEffect(() => {
    const root = document.documentElement;
    const reset = () => {
      root.style.setProperty("--sh-top", "0px");
      root.style.setProperty("--sh-bar", "0px");
    };
    if (pathname !== "/feed" && pathname !== "/moods") {
      reset();
      return;
    }
    let last = window.scrollY;
    let hidden = 0; // px hidden so far (0..96); the nav uses the same value, capped at its own 56px
    let timer = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last;
      last = y;
      // During a swipe between tabs the scroll amount is kept as it is: a small vertical wobble of the finger
      // must not move the bars, and the bars must not jump when the swipe starts.
      if (y <= 8) hidden = 0; // back at the top: always shown, even mid-swipe
      else if (document.documentElement.dataset.swiping !== "1") hidden = Math.min(96, Math.max(0, hidden + d));
      // The top bars only hide on Home; on Moods just the bottom nav slides away.
      root.style.setProperty("--sh-top", `${pathname === "/feed" ? hidden : 0}px`);
      root.style.setProperty("--sh-bar", `${hidden}px`);
      // While the scroll is moving, bars must follow the finger without a transition lag.
      root.dataset.sh = "1";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { delete root.dataset.sh; }, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      delete root.dataset.sh;
      reset();
    };
  }, [pathname]);
  // The scroll amount applies during a swipe too, so the bars stay where the scroll left them.
  const shTop = "var(--sh-top, 0px)";
  const shBar = "var(--sh-bar, 0px)";
  useLayoutEffect(() => {
    // A post opens at its top. Done here (same commit as the page change, before the first paint) so the
    // feed's scroll position never shows with the post off-screen.
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-bar]"));
    const saved = els.map((el) => el.style.transition);
    els.forEach((el) => { el.style.transition = "none"; });
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      els.forEach((el, i) => { el.style.transition = saved[i]; });
    }));
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  const barStyle = {
    // Horizontal swipe offset goes in the separate `translate` property (no transition), so it follows the page exactly.
    translate: "var(--swipe-x, 0px) 0px",
    transform: `translate3d(0, calc(-1 * max(${barHide * 96}px, ${shTop})), 0)`,
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

  // The two top bars, used in the page (Home) or fixed above it (other pages).
const topBarHeader = (
      <header data-bar="" style={onHome ? undefined : barStyle} className={`md:hidden ${onHome ? "" : "fixed top-0 inset-x-0 z-40"} h-12 flex items-center justify-between px-4 bg-background/95 backdrop-blur border-b border-border`}>
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
  );
const topBarSecond = (
      <div data-bar="" style={onHome ? undefined : barStyle} className={`md:hidden ${onHome ? "" : "fixed top-12 inset-x-0 z-40"} h-12 flex items-center justify-end px-4 bg-background/95 backdrop-blur border-b border-border`}>
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
  );

  return (
    <div className="min-h-screen">
      {/* ------- desktop sidebar: the full menu list ------- */}
      <aside
        style={{
          transform: `translate3d(${asideX}, 0, 0)`,
          transition: swiping ? "none" : "transform 260ms cubic-bezier(.2,.8,.2,1)",
        }}
        className="hidden md:flex fixed inset-y-0 left-0 w-[76px] xl:w-[330px] flex-col bg-background px-3 py-6 z-40"
      >
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
      {/* Full-width bar background: same colours as the bar (light, or black on Reels). The bar itself keeps its width. */}
      <div
        aria-hidden
        data-bar=""
        className="hidden md:block fixed bottom-0 left-0 right-0 h-14 z-30 pointer-events-none"
        style={{
          backgroundColor: navBg,
          transform: `translate3d(0, min(${shBar}, 56px), 0)`,
          transition: swiping ? "none" : "transform 220ms ease, background-color 260ms ease",
        }}
      />
      {/* On Reels the bar stays and turns black; the colour follows the swipe (0 = light, 1 = black). */}
      <nav
        aria-label="Main"
        style={{
          color: navFg,
          // On Reels the bar sits 35px further right; it moves with the swipe, so only the Reels tab shows the shift.
          paddingLeft: `calc(var(--bar-home) + ${navBlack} * (50vw - (${REEL_W}) / 2 - var(--bar-home)))`,
          transform: `translate3d(0, min(${shBar}, 56px), 0)`,
          transition: swiping ? "none" : "transform 220ms ease, color 260ms ease, background-color 260ms ease, padding-left 260ms ease",
        }}
        data-bar=""
        className="hidden md:flex fixed bottom-0 left-0 right-0 h-14 z-[60] items-stretch pointer-events-none"
      >
        <div
          style={{
            backgroundColor: navBg,
            transition: swiping ? "none" : "background-color 260ms ease",
            width: `calc(517px + ${navBlack} * ((${REEL_W}) - 517px))`,
          }}
          className="pointer-events-auto relative flex max-w-full h-full items-stretch"
        >
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

      {/* Top bars: on Home they sit inside the page (see below); on other pages they stay fixed. */}
      {!onHome && topBarHeader}
      {!onHome && topBarSecond}

      {/* ------- main (swipeable between Home / Reels / Profile on mobile) ------- */}
      {/* Home: the top bars are the first thing on the page. Sticky at -(hidden amount), so they scroll with the
          page and stay on screen as the page moves; the swipe offset comes from the page itself. */}
      <SwipeTabs
        tabs={swipeTabs}
        activeIndex={activeTabIndex}
        enabled={overlay.overlay === null && !menuOpen}
        className="md:ml-[76px] xl:ml-[330px] md:opacity-[var(--feed-opacity,1)] pt-[var(--bar-pad)] pb-14 md:pt-0 md:pb-14 min-h-screen sv-barpad"
      >
        {onHome && (
          <div
            data-bar=""
            className="md:hidden sticky top-0 z-40"
            style={{
              top: "calc(-1 * var(--sh-top, 0px))",
              transform: `translate3d(0, ${-barHide * 96}px, 0)`,
              marginBottom: `${-barHide * 96}px`,
              transition: "none",
            }}
          >
            {topBarHeader}
            {topBarSecond}
          </div>
        )}
        <Outlet />
      </SwipeTabs>

      {/* ------- mobile bottom nav ------- */}
      <nav
        style={{
          transform: `translate3d(0, min(${shBar}, 56px), 0)`,
          transition: "transform 220ms ease", // colour has no transition: a click on Reels turns black at once, a swipe follows the drag
          backgroundColor: navBg,
          color: navFg,
          borderTopColor: `rgb(${mix(229, 40)},${mix(229, 40)},${mix(229, 40)})`,
        }}
        data-bar=""
        className="md:hidden fixed bottom-0 inset-x-0 h-14 z-40 flex items-stretch border-t"
      >
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

      {/* ------- quick icons: circles stacked upward from the bottom-right corner of the bottom nav ------- */}
      <div
        style={{
          // 1 = Home showing, 0 = any other tab. It follows the swipe; a click jumps straight to the end state.
          transform: `translate3d(${(1 - homeAmt) * 90}px,0,0)`,
          pointerEvents: homeAmt > 0.5 ? "auto" : "none",
          // Gone before the Reels page reaches them: fully hidden once the swipe passes the midpoint.
          opacity: Math.max(0, Math.min(1, (homeAmt - 0.5) * 2)),
        }}
        className="fixed right-4 bottom-3 z-40 hidden md:flex flex-col items-center gap-3">
        <button type="button" aria-label="Messages" onClick={() => openDock("messages", "Messages", { path: "/dm?embed=1" })} className={FAB}>
          <Send className="h-7 w-7 -rotate-12" />
        </button>
        <button type="button" aria-label="Notifications" onClick={() => openDock("notifications", "Notifications", { path: "/notifications?embed=1" })} className={FAB}>
          <Heart className="h-7 w-7" />
        </button>
        <button type="button" aria-label="Gaming" onClick={() => openDock("gaming", "Gaming", { unavailable: true })} className={FAB}>
          <Gamepad2 className="h-7 w-7" />
        </button>
        <button type="button" aria-label="Community" onClick={() => openDock("community", "Community", { path: "/groups?embed=1" })} className="block h-14 w-14 overflow-hidden rounded-full shadow-md ring-1 ring-border">
          <img src="/community.jpg" alt="" width={56} height={56} className="h-full w-full object-cover" />
        </button>
      </div>
      {/* Close (X) for the pages opened from the menu. Bottom-nav tabs and Home keep no close button. */}
      {!(
        pathname === "/feed" ||
        pathname === "/reels" ||
        pathname === "/create" ||
        pathname === "/moods" ||
        pathname === "/profile" ||
        (!!me && pathname === `/profile/${me.username}`)
      ) && (
        <button
          type="button"
          aria-label="Close"
          title="Close"
          onClick={() => navigate({ to: "/feed" })}
          className="fixed right-3 bottom-16 z-40 grid h-9 w-9 place-items-center rounded-full border border-border bg-card/95 shadow-md hover:bg-muted md:bottom-auto md:right-4 md:top-4"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
      {docks.map((d, i) => (
        <FloatingPanel
          key={`${d.id}-${d.seq}`}
          panel={d}
          index={i}
          onClose={() => setDocks((ds) => ds.map((x) => (x.id === d.id ? { ...x, leaving: true } : x)))}
          onGone={() => setDocks((ds) => ds.filter((x) => !(x.id === d.id && x.leaving)))}
          onToggleLock={() => setDocks((ds) => ds.map((x) => (x.id === d.id ? { ...x, locked: !x.locked } : x)))}
          onFocus={() => focusDock(d.id)}
          swipeDx={d.locked ? 0 : swipeMove}
          swiping={!!swipeP && !swipeP.committed}
        />
      ))}

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
