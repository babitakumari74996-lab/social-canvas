import { createFileRoute, redirect } from "@tanstack/react-router";

// Auth removed — /auth now just drops you into the app.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/feed", replace: true });
  },
});
