import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AppLayout,
});

// No auth guard — the app is open to everyone (demo world).
function AppLayout() {
  return <AppShell />;
}
