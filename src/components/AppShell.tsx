import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Film, Send, User, Settings, Sparkles } from "lucide-react";
import { useMyProfile } from "@/lib/auth";
import { PlusProvider } from "./PlusModal";
import { useSignedUrl } from "@/lib/media";

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 rounded-md text-xs md:text-sm transition-opacity ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? "fill-current" : ""}`} strokeWidth={active ? 2.2 : 1.6} />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

export function AppShell() {
  const { data: profile } = useMyProfile();
  const router = useRouterState();
  const path = router.location.pathname;
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);

  const nav = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/reels", label: "Reels", icon: Film },
    { to: "/dm", label: "Messages", icon: Send },
    { to: `/profile/${profile?.username ?? ""}`, label: "Profile", icon: User },
  ];

  return (
    <PlusProvider tier={profile?.subscription_tier} userId={profile?.id ?? null}>
      <div className="min-h-screen flex md:pl-56">
        {/* Sidebar / topbar */}
        <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 border-r border-border bg-background flex-col px-3 py-6 gap-1">
          <Link to="/feed" className="px-3 py-2 text-xl font-semibold tracking-tight">Socialverse</Link>
          <nav className="mt-4 flex flex-col gap-1">
            {nav.map((n) => (
              <NavItem key={n.to} {...n} active={path.startsWith(n.to) && n.to !== "/"} />
            ))}
            <NavItem to="/settings" label="Settings" icon={Settings} active={path === "/settings"} />
          </nav>
          {profile && (
            <div className="mt-auto flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
              {avatar.data ? (
                <img src={avatar.data} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <div className="truncate font-medium">@{profile.username}</div>
                <div className="text-muted-foreground flex items-center gap-1">
                  {profile.subscription_tier === "plus" ? (
                    <><Sparkles className="h-3 w-3" /> Plus</>
                  ) : "Free"}
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 pb-20 md:pb-6 max-w-full">
          <Outlet />
        </main>

        {/* Bottom tab bar (mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-2 py-1 flex justify-around z-40">
          {nav.map((n) => (
            <NavItem key={n.to} {...n} active={path.startsWith(n.to) && n.to !== "/"} />
          ))}
        </nav>

        {/* Mobile top bar */}
        <header className="md:hidden fixed top-0 left-0 right-0 border-b border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between z-40">
          <Link to="/feed" className="text-lg font-semibold tracking-tight">Socialverse</Link>
          <Link to="/dm" className="text-muted-foreground"><Send className="h-5 w-5" /></Link>
        </header>
        <div className="md:hidden h-14" />
      </div>
    </PlusProvider>
  );
}