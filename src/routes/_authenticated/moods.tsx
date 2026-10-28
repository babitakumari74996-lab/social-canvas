import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { MOODS } from "@/components/MoodBox";
import { useFeed, useMoods, useMyUserId } from "@/lib/data";
import { demoActions, resolveVideoUrl, useDemo } from "@/lib/demo-store";
import { formatCount, timeAgo } from "@/lib/time";
import type { UMood, UPost } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/moods")({
  component: MoodsPage,
});

const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

// Twit: only posts with a photo or video AND a message (caption), like X's media posts. No buy button.
function MoodsPage() {
  const { moods } = useMoods();
  const { posts } = useFeed();
  const twit = posts.filter((p) => p.media_urls.length > 0 && (p.caption ?? "").trim().length > 0);
  const [tab, setTab] = useState<0 | 1>(0);
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ x: number; id: number; lock: "h" | "v" | null } | null>(null);
  const swiped = useRef(false);

  // Horizontal drag between the two sub-tabs. The page is marked data-no-swipe, so the app-wide tab swipe
  // does not also fire here.
  const onDown = (e: React.PointerEvent) => {
    gesture.current = { x: e.clientX, id: e.pointerId, lock: null };
    swiped.current = false;
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x;
    if (!g.lock) {
      if (Math.abs(dx) < 8) return;
      g.lock = "h";
      swiped.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (g.lock === "h") setDrag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.lock === "h") {
      const dx = e.clientX - g.x;
      if (dx < -60 && tab === 0) setTab(1);
      else if (dx > 60 && tab === 1) setTab(0);
    }
    setDrag(null);
  };

  return (
    <div data-no-swipe className="max-w-[520px] mx-auto pb-10">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        {/* Pill switcher: a sliding thumb marks the active side (no underline). */}
        <div className="relative flex rounded-full bg-muted p-1">
          <span
            aria-hidden
            className="absolute bottom-1 top-1 left-1 rounded-full bg-background shadow-sm transition-transform duration-300 ease-out"
            style={{ width: "calc(50% - 4px)", transform: `translateX(${tab * 100}%)` }}
          />
          {(["Moods", "Twits"] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(i as 0 | 1)}
              className={`relative z-10 flex-1 rounded-full py-1.5 text-sm font-semibold transition-colors duration-300 ${tab === i ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={(e) => {
          if (swiped.current) {
            e.preventDefault();
            e.stopPropagation();
            swiped.current = false;
          }
        }}
      >
        <div
          className="flex w-[200%]"
          style={{
            transform: `translate3d(calc(${tab * -50}% + ${drag ?? 0}px), 0, 0)`,
            transition: drag === null ? "transform 260ms cubic-bezier(.2,.8,.2,1)" : "none",
          }}
        >
          <div className="w-1/2 min-w-0">
            <h1 className="sr-only">Moods</h1>
            {moods.map((m) => (
              <MoodCard key={m.id} mood={m} />
            ))}
            {moods.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-16">
                No moods yet. Share how you feel from Home.
              </p>
            )}
          </div>
          <div className="w-1/2 min-w-0">
            {twit.map((p) => (
              <TwitPost key={p.id} post={p} />
            ))}
            {twit.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-16">
                No posts with a photo or video and a message yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TwitPost({ post }: { post: UPost }) {
  const demo = useDemo();
  const liked = !!demo.liked[post.id];
  const likes = post.likes + (liked === post.likedByMe ? 0 : liked ? 1 : -1);
  const username = post.profiles?.username ?? "user";
  return (
    <article className="flex gap-2.5 border-b border-border px-3 py-3">
      <Link to="/profile/$username" params={{ username }} className="shrink-0">
        <Avatar path={post.profiles?.avatar_url} alt={username} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="truncate font-semibold">{username}</span>
          <span className="truncate text-muted-foreground">· {timeAgo(post.created_at)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px]">{post.caption}</p>
        <div className="mt-2 space-y-2">
          {post.media_urls.map((u, i) =>
            isVideoUrl(u) ? (
              <video key={i} src={u} controls playsInline preload="metadata" className="w-full max-h-[520px] rounded-2xl bg-black" />
            ) : (
              <MediaImg key={i} src={u} alt="" className="w-full max-h-[520px] rounded-2xl object-cover" />
            ),
          )}
        </div>
        <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
          <button
            type="button"
            aria-label={liked ? "Unlike" : "Like"}
            onClick={() => demoActions.toggleLike(post.id)}
            className="flex items-center gap-1.5"
          >
            <Heart className={`h-5 w-5 ${liked ? "fill-[#ED4956] text-[#ED4956]" : ""}`} />
            <span>{formatCount(likes)}</span>
          </button>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-5 w-5" />
            <span>{formatCount(post.commentsCount)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function MoodCard({ mood }: { mood: UMood }) {
  const demo = useDemo();
  const myId = useMyUserId();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");

  const profile = mood.profiles;
  const username = profile?.username ?? "user";
  const meta = MOODS.find((x) => x.id === mood.mood);
  const liked = !!demo.liked[mood.id];
  const isMine = mood.user_id === myId;
  const following = !!demo.following[mood.user_id];
  const comments = demo.moodComments.filter((c) => c.mood_id === mood.id);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    demoActions.addMoodComment(mood.id, text);
    setDraft("");
  };

  return (
    <article className="border-b border-border pb-3">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <Link to="/profile/$username" params={{ username }} className="shrink-0">
          <Avatar path={profile?.avatar_url} alt={username} size={32} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to="/profile/$username" params={{ username }} className="block truncate text-sm font-semibold">
            {username}
          </Link>
          <p className="text-xs text-muted-foreground">{timeAgo(mood.created_at)}</p>
        </div>
        {!isMine && !following && (
          <button
            type="button"
            onClick={() => demoActions.toggleFollow(mood.user_id)}
            className="sv-gradient-bg rounded-md px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
          >
            Follow
          </button>
        )}
      </header>

      {meta && (
        <p className="px-3 pb-1 text-lg">
          <span className="mr-2 text-2xl align-middle">{meta.emoji}</span>
          <span className="font-semibold align-middle">Feeling {meta.label.toLowerCase()}</span>
        </p>
      )}
      {mood.note && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{mood.note}</p>}

      {mood.media.map((md, i) => {
        const src = resolveVideoUrl(md.url);
        if (!src) return <div key={i} className="aspect-[4/5] w-full bg-muted" />;
        return md.kind === "video" ? (
          <video
            key={i}
            src={src}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[640px] bg-black"
          />
        ) : (
          <img
            key={i}
            src={src}
            alt=""
            decoding="async"
            className="w-full max-h-[640px] object-cover bg-muted"
          />
        );
      })}

      <div className="flex items-center gap-4 px-3 pt-2.5">
        <button
          type="button"
          aria-label={liked ? "Unlike" : "Like"}
          onClick={() => demoActions.toggleMoodLike(mood.id)}
          className="flex items-center gap-1.5 text-sm"
        >
          <Heart className={`h-6 w-6 ${liked ? "fill-[#ED4956] text-[#ED4956]" : ""}`} />
          <span>{formatCount(mood.likes)}</span>
        </button>
        <button
          type="button"
          aria-label="Comments"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm"
        >
          <MessageCircle className="h-6 w-6" />
          <span>{formatCount(comments.length)}</span>
        </button>
        <button
          type="button"
          className="ml-auto rounded-lg sv-gradient-bg px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80"
        >
          Buy product
        </button>
      </div>

      {showComments && (
        <div className="px-3 pt-2 space-y-1.5">
          {comments.map((c) => (
            <p key={c.id} className="text-sm">
              <span className="font-semibold mr-1.5">{c.profiles?.username ?? "user"}</span>
              {c.content}
            </p>
          ))}
          <form
            className="flex items-center gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="text-sm font-semibold text-primary disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
