import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight,
  MoreHorizontal, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useActions } from "@/lib/data";
import { demoActions, ui } from "@/lib/demo-store";
import { timeAgo, formatCount } from "@/lib/time";
import type { UPost } from "@/lib/types";

function Verified({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <BadgeCheck className={`${className} text-sky-500 fill-background`} />;
}

export function MediaImg({
  src, alt = "", className = "", onClick,
}: { src: string; alt?: string; className?: string; onClick?: () => void }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-br from-muted via-accent/60 to-muted flex items-center justify-center text-muted-foreground text-xs ${className}`}
      >
        {err ? "photo unavailable" : ""}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onClick={onClick}
      onError={() => setErr(true)}
      className={className}
    />
  );
}

export function PostCard({ post, withComments = false }: { post: UPost; withComments?: boolean }) {
  const actions = useActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [saved, setSaved] = useState(post.savedByMe);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const isText = post.media_urls.length === 0;

  const like = (on: boolean) => {
    setLiked(on);
    actions.like(post.id, on);
  };
  const doubleTap = () => {
    if (!liked) like(true);
    setBurst(true);
    setTimeout(() => setBurst(false), 800);
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    actions.comment(post.id, text);
    setDraft("");
    toast("Comment posted");
  };

  return (
    <article className="border-b border-border md:border md:rounded-xl md:bg-card md:overflow-hidden pb-1 md:pb-2">
      {/* header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link to="/profile/$username" params={{ username: post.profiles.username }}>
          <Avatar path={post.profiles.avatar_url} alt={post.profiles.username} size={36} className="ring-1 ring-border" />
        </Link>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1 text-sm">
            <Link to="/profile/$username" params={{ username: post.profiles.username }} className="font-semibold hover:opacity-60 truncate">
              {post.profiles.username}
            </Link>
            {post.profiles.is_verified && <Verified />}
            <span className="text-muted-foreground">· {timeAgo(post.created_at)}</span>
          </div>
          {post.location && <div className="text-[11px] text-muted-foreground truncate">{post.location}</div>}
        </div>
        <button
          type="button"
          aria-label="More options"
          onClick={() => toast("Post options coming soon")}
          className="p-1 hover:opacity-60"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* media */}
      {isText ? (
        <div
          onDoubleClick={doubleTap}
          className="relative mx-3 md:mx-0 rounded-lg md:rounded-none overflow-hidden aspect-square max-h-[585px] flex items-center justify-center p-8 text-center select-none"
          style={{ background: "linear-gradient(135deg, #4F5BD5 0%, #962FBF 30%, #D62976 60%, #FA7E1E 85%, #FEDA75 100%)" }}
        >
          <p className="text-white text-xl md:text-2xl font-semibold leading-snug drop-shadow whitespace-pre-wrap break-words max-w-[85%]">
            {post.caption}
          </p>
        </div>
      ) : (
        <div className="relative select-none">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            onDoubleClick={doubleTap}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-square max-h-[585px] bg-black"
          >
            {post.media_urls.map((m, i) => (
              <div key={i} className="min-w-full snap-center">
                <MediaImg src={m} alt={post.caption ?? "post"} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {post.media_urls.length > 1 && (
            <>
              {idx > 0 && (
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => scrollRef.current?.scrollBy({ left: -scrollRef.current.clientWidth, behavior: "smooth" })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-1 hover:bg-black/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {idx < post.media_urls.length - 1 && (
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => scrollRef.current?.scrollBy({ left: scrollRef.current.clientWidth, behavior: "smooth" })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-1 hover:bg-black/70"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="absolute top-3 right-3 rounded-full bg-black/50 text-white text-[11px] px-2 py-0.5">
                {idx + 1}/{post.media_urls.length}
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.media_urls.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          {burst && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="h-24 w-24 text-white fill-white animate-heart-burst drop-shadow-lg" />
            </div>
          )}
        </div>
      )}

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button type="button" aria-label="Like" onClick={() => like(!liked)} className="active:scale-90 transition-transform">
          {liked
            ? <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            : <Heart className="h-6 w-6 hover:opacity-50" />}
        </button>
        {withComments ? (
          <button type="button" aria-label="Comment" className="active:scale-90 transition-transform">
            <MessageCircle className="h-6 w-6 -scale-x-100 hover:opacity-50" />
          </button>
        ) : (
          <Link to="/post/$id" params={{ id: post.id }} aria-label="Comment" className="active:scale-90 transition-transform">
            <MessageCircle className="h-6 w-6 -scale-x-100 hover:opacity-50" />
          </Link>
        )}
        <button type="button" aria-label="Share" onClick={() => ui.openShare(post, "post")} className="active:scale-90 transition-transform">
          <Send className="h-6 w-6 hover:opacity-50" />
        </button>
        <button
          type="button"
          aria-label="Save"
          onClick={() => {
            const next = !saved;
            setSaved(next);
            if (actions.isDemo) demoActions.toggleSave(post.id);
            toast(next ? "Saved to collection" : "Removed from saved");
          }}
          className="ml-auto active:scale-90 transition-transform"
        >
          {saved ? <Bookmark className="h-6 w-6 fill-current" /> : <Bookmark className="h-6 w-6 hover:opacity-50" />}
        </button>
      </div>

      {/* likes + caption */}
      <div className="px-3 pt-1.5 pb-1 space-y-1 text-sm">
        <button type="button" className="font-semibold block" onClick={() => like(!liked)}>
          {formatCount(post.likes)} likes
        </button>
        {!isText && (
          <div className={`leading-snug ${expanded ? "" : "line-clamp-2"}`}>
            <Link to="/profile/$username" params={{ username: post.profiles.username }} className="font-semibold mr-1.5">
              {post.profiles.username}
            </Link>
            <span className="whitespace-pre-wrap break-words">{post.caption}</span>
            {!expanded && (post.caption ?? "").length > 80 && (
              <button type="button" className="text-muted-foreground ml-1" onClick={() => setExpanded(true)}>more</button>
            )}
          </div>
        )}
        {post.commentsCount > 0 && !withComments && (
          <Link to="/post/$id" params={{ id: post.id }} className="block text-muted-foreground">
            View all {post.commentsCount === 1 ? "1 comment" : `${formatCount(post.commentsCount)} comments`}
          </Link>
        )}
        {withComments && <CommentsSection postId={post.id} onSubmit={submitComment} draft={draft} setDraft={setDraft} />}
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground pt-0.5">{timeAgo(post.created_at)} ago</div>
      </div>

      {/* inline quick comment (feed) */}
      {!withComments && (
        <form onSubmit={submitComment} className="hidden md:flex items-center gap-2 px-3 pt-1 border-t border-border/60 mt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {draft.trim() && (
            <button type="submit" className="text-sm font-semibold text-primary hover:text-primary/70">Post</button>
          )}
        </form>
      )}
    </article>
  );
}

export function CommentsSection({
  postId, onSubmit, draft, setDraft,
}: {
  postId: string;
  onSubmit: (e: React.FormEvent) => void;
  draft: string;
  setDraft: (v: string) => void;
}) {
  void postId;
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 pt-2 border-t border-border/60 mt-1">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a comment…"
        className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      {draft.trim() && (
        <button type="submit" className="text-sm font-semibold text-primary hover:text-primary/70">Post</button>
      )}
    </form>
  );
}

export { Verified };
