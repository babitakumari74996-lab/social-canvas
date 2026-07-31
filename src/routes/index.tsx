import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/feed", replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-2xl font-semibold tracking-tight animate-in-fade">Socialverse</div>
    </div>
  );
}
