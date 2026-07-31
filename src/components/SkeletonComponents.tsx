import { UsersRound, Calendar, Flag, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PostCardSkeleton() {
  return (
    <article className="card-social overflow-hidden animate-pulse">
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="h-10 w-10 rounded-full bg-muted/60" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-32 rounded bg-muted/60" />
          <div className="h-2.5 w-20 rounded bg-muted/40" />
        </div>
        <div className="h-8 w-8 rounded-full bg-muted/40" />
      </header>
      <div className="px-4 pb-2 space-y-1.5">
        <div className="h-3.5 w-3/4 rounded bg-muted/40" />
        <div className="h-3.5 w-1/2 rounded bg-muted/40" />
      </div>
      <div className="aspect-video bg-muted/30" />
      <div className="flex items-center gap-1 px-2 py-1 mx-4 border-t border-border/40">
        <div className="flex-1 h-9 rounded-md bg-muted/30" />
        <div className="flex-1 h-9 rounded-md bg-muted/30" />
        <div className="flex-1 h-9 rounded-md bg-muted/30" />
        <div className="h-9 w-9 rounded-full bg-muted/30" />
      </div>
      <div className="px-4 pb-4 pt-2 space-y-1.5">
        <div className="h-3 w-24 rounded bg-muted/40" />
        <div className="h-3 w-full rounded bg-muted/30" />
        <div className="h-3 w-2/3 rounded bg-muted/30" />
      </div>
    </article>
  );
}

export function ReelCardSkeleton() {
  return (
    <div className="shrink-0 w-[140px]">
      <div className="aspect-[9/16] rounded-2xl bg-muted overflow-hidden" />
      <div className="mt-2 px-1 space-y-1">
        <div className="h-3.5 w-20 rounded bg-muted" />
        <div className="h-2.5 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ActivityCardSkeleton({ variant }: { variant: string }) {
  const icons: Record<string, React.ReactNode> = {
    group: <UsersRound className="h-6 w-6" strokeWidth={1.5} />,
    event: <Calendar className="h-6 w-6" strokeWidth={1.5} />,
    page: <Flag className="h-6 w-6" strokeWidth={1.5} />,
    besties: <Heart className="h-6 w-6" strokeWidth={1.5} />,
  };

  const links: Record<string, string> = {
    group: "/groups",
    event: "/events",
    page: "/pages",
    besties: "/besties",
  };

  return (
    <Link
      to={links[variant] ?? "/"}
      className="card-social p-4 flex flex-col items-center gap-2 text-center group hover:shadow-md hover:border-primary/20 transition-all"
    >
      <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center text-primary group-hover:bg-primary/20 transition-colors">
        {icons[variant]}
      </div>
      <div className="space-y-0.5">
        <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
        <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
      </div>
    </Link>
  );
}
