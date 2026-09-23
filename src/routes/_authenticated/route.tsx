import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { AppShell, Wordmark } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="animate-pulse"><Wordmark /></div>
      </div>
    );
  }

  // No session → run the app in demo mode with pre-populated accounts,
  // stories and reels. Real sign-in is available from the More menu /auth.
  return <AppShell />;
}
