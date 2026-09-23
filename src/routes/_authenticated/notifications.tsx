import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPanel } from "@/components/NotificationsPanel";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return <NotificationsPanel force />;
}
