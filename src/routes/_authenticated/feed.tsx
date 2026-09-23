import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PostCard, MediaImg } from "@/components/PostCard";
import { StoriesRow } from "@/components/StoriesRow";
import { useActions, useFeed, useMe, useSuggestions } from "@/lib/data";
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
            <PostCard post={p} />
            {i === 1 && suggestions.length > 0 && <MobileSuggestions />}
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

function MobileSuggestions() {
  const suggestions = useSuggestions();
  if (suggestions.length === 0) return null;
  return (
    <div className="mx-3 my-4 rounded-xl border border-border p-4 hidden md:block">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Suggested for you</span>
        <Link to="/explore" className="text-xs font-semibold text-primary">See all</Link>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {suggestions.map((s) => (
          <MiniSuggest key={s.user.id} user={s.user} />
        ))}
      </div>
    </div>
  );
}

function MiniSuggest({ user }: { user: { id: string; username: string; avatar_url: string | null } }) {
  const actions = useActions();
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-col items-center gap-1.5 w-24 shrink-0 text-center">
      <Link to="/profile/$username" params={{ username: user.username }}>
        <Avatar path={user.avatar_url} alt={user.username} size={64} />
      </Link>
      <span className="text-xs font-semibold truncate w-full">{user.username}</span>
      <button
        type="button"
        onClick={() => { setOn((v) => !v); actions.follow(user.id, !on); }}
        className={`text-xs font-semibold rounded-lg w-full py-1.5 ${on ? "bg-muted" : "bg-primary text-primary-foreground"}`}
      >
        {on ? "Following" : "Follow"}
      </button>
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
