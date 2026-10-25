import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { ChevronRight, Film, Heart, MessageCircle, UsersRound, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PostCard, MediaImg } from "@/components/PostCard";
import { StoriesRow } from "@/components/StoriesRow";
import { useActions, useFeed, useMe, useReels, useSuggestions } from "@/lib/data";
import { Wordmark } from "@/components/AppShell";
import { formatCount } from "@/lib/time";
import type { UPost } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const me = useMe();
  const { posts, loading } = useFeed();
  const suggestions = useSuggestions();
  const { reels } = useReels();

  return (
    <div className="flex justify-center">
      {/* main column */}
      <div className="w-full max-w-[470px] md:px-0 pb-8">
        <StoriesRow />
        {loading && <div className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading feed…</div>}
        {!loading && posts.length === 0 && (
          <div className="mx-3 mt-4 rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Your feed is quiet. Create a post or follow people from Explore.</p>
          </div>
        )}
        {posts.map((p, i) => (
          <div key={p.id}>
            <PostCard post={p} tall={i === 0} />
            {/* Facebook-style inserts between posts. Never both at the same spot (Reels after post 3, People after post 7). */}
            {i === 2 && reels.length > 0 && <ReelsStrip reels={reels} />}
            {i === 6 && suggestions.length > 0 && <PeopleYouMayKnow people={suggestions} />}
          </div>
        ))}
        <div className="text-center text-[11px] text-muted-foreground uppercase tracking-widest pt-8">
          © 2026 Socialverse
        </div>
      </div>

      {/* right rail (desktop) */}
      <aside className="hidden lg:block w-[320px] shrink-0 pl-16 pt-9 pr-8">
        <div className="mb-6"><Wordmark /></div>
        {me && (
          <div className="flex items-center gap-3 mb-5">
            <Link to="/profile/$username" params={{ username: me.username }}>
              <Avatar path={me.avatar_url} alt={me.username} size={56} />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to="/profile/$username" params={{ username: me.username }} className="block text-sm font-semibold truncate hover:opacity-70">
                {me.username}
              </Link>
              <span className="block text-sm text-muted-foreground truncate">{me.display_name}</span>
            </div>
            <Link to="/profile/$username" params={{ username: me.username }} className="text-xs font-semibold text-primary">
              View profile
            </Link>
          </div>
        )}
        {suggestions.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Suggested for you</span>
              <Link to="/explore" className="text-xs font-semibold hover:opacity-60">See all</Link>
            </div>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionRow key={s.user.id} user={s.user} reason={s.reason} />
              ))}
            </div>
          </>
        )}
        <div className="mt-8 space-y-3 text-[11px] text-muted-foreground/70 leading-relaxed">
          <p className="flex flex-wrap gap-x-2 gap-y-1 uppercase tracking-wide">
            <span>About</span><span>·</span><span>Help</span><span>·</span><span>Press</span><span>·</span><span>API</span>
            <span>·</span><span>Jobs</span><span>·</span><span>Privacy</span><span>·</span><span>Terms</span><span>·</span><span>Locations</span>
          </p>
          <p>© 2026 SOCIALVERSE FROM SOCIALVERSE LABS</p>
        </div>
      </aside>
    </div>
  );
}

function SuggestionRow({ user, reason }: { user: { id: string; username: string; display_name: string | null; avatar_url: string | null }; reason: string }) {
  const actions = useActions();
  const [on, setOn] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <Link to="/profile/$username" params={{ username: user.username }}>
        <Avatar path={user.avatar_url} alt={user.username} size={44} />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <Link to="/profile/$username" params={{ username: user.username }} className="block text-sm font-semibold truncate hover:opacity-70">
          {user.username}
        </Link>
        <span className="block text-xs text-muted-foreground truncate">{reason}</span>
      </div>
      <button
        type="button"
        onClick={() => { setOn((v) => !v); actions.follow(user.id, !on); }}
        className={`text-xs font-semibold ${on ? "text-foreground" : "text-primary"}`}
      >
        {on ? "Following" : "Follow"}
      </button>
    </div>
  );
}

// Horizontal row for the feed modules. Touch and trackpad scroll natively; a mouse can also drag it
// (desktop), and the arrow button scrolls it. A drag never triggers the click on the item under it.
function Carousel({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el || e.button !== 0) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    let moved = false;
    e.preventDefault(); // no text selection or native image drag while dragging
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (moved) {
        const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, true), 0);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return (
    <div className="relative">
      <div
        ref={rowRef}
        onMouseDown={onMouseDown}
        className={`flex gap-2 overflow-x-auto no-scrollbar px-3 pb-3 cursor-grab select-none ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={label}
        onClick={() => rowRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
        className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full bg-card shadow-md border border-border"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function ReelsStrip({ reels }: { reels: { id: string; poster?: string | null }[] }) {
  return (
    <section className="my-4 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <Film className="h-5 w-5" />
        <span className="text-sm font-semibold">Reels</span>
      </div>
      <Carousel label="Next reels" className="snap-x">
        {reels.slice(0, 8).map((r) => (
          <Link key={r.id} to="/reels" className="relative aspect-[9/16] w-36 shrink-0 snap-start overflow-hidden rounded-lg bg-muted">
            {r.poster && <img src={r.poster} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />}
          </Link>
        ))}
      </Carousel>
    </section>
  );
}

function PeopleYouMayKnow({ people }: { people: { user: { id: string; username: string; display_name: string | null; avatar_url: string | null }; reason: string }[] }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const visible = people.filter((p) => !hidden[p.user.id]).slice(0, 6);
  if (visible.length === 0) return null;
  return (
    <section className="my-4 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <UsersRound className="h-5 w-5" />
        <span className="text-sm font-semibold">People you may know</span>
      </div>
      <Carousel label="Next people">
        {visible.map((p) => (
          <PersonCard key={p.user.id} user={p.user} reason={p.reason} onClose={() => setHidden((h) => ({ ...h, [p.user.id]: true }))} />
        ))}
      </Carousel>
    </section>
  );
}

function PersonCard({ user, reason, onClose }: { user: { id: string; username: string; display_name: string | null; avatar_url: string | null }; reason: string; onClose: () => void }) {
  const actions = useActions();
  const [added, setAdded] = useState(false);
  return (
    <div className="relative w-40 shrink-0 overflow-hidden rounded-lg border border-border">
      <button type="button" aria-label="Remove suggestion" onClick={onClose} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-background/90">
        <X className="h-4 w-4" />
      </button>
      <Link to="/profile/$username" params={{ username: user.username }} className="grid h-36 w-full place-items-center bg-muted">
        <Avatar path={user.avatar_url} alt={user.username} size={96} />
      </Link>
      <div className="px-3 pt-2 pb-3">
        <Link to="/profile/$username" params={{ username: user.username }} className="block truncate text-sm font-semibold">
          {user.display_name || user.username}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">{reason}</span>
        <button
          type="button"
          onClick={() => { setAdded((v) => !v); actions.follow(user.id, !added); }}
          className={`mt-2 w-full rounded-md py-1.5 text-sm font-semibold ${added ? "bg-muted" : "bg-primary text-primary-foreground"}`}
        >
          {added ? "Following" : "Add friend"}
        </button>
      </div>
    </div>
  );
}

export function PostStats({ post }: { post: UPost }) {
  return (
    <span className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {formatCount(post.likes)}</span>
      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {formatCount(post.commentsCount)}</span>
    </span>
  );
}

export { MediaImg };
