import { createFileRoute } from "@tanstack/react-router";
import { Megaphone as Ic } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ads")({ component: Page });
function Page() {
  return (
    <div className="max-w-3xl mx-auto px-3 md:px-6 py-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Ic className="h-6 w-6 text-primary" /> Ads Manager
      </h1>
      <p className="text-sm text-muted-foreground mt-2">Coming soon.</p>
    </div>
  );
}
