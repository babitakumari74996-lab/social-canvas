import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { listenDuration } from "@/lib/video-duration";
import { SvSlider } from "@/components/SvSlider";
import {
  Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight,
  MoreHorizontal, BadgeCheck, Volume2, VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, useImageFade } from "@/components/Avatar";
import { useActions, useMyUserId } from "@/lib/data";
import { demoActions, ui, useDemo } from "@/lib/demo-store";
import { timeAgo, formatCount } from "@/lib/time";
import {
  getVideoAudio, registerVideo, setVideoAudio, subscribeVideoAudio, unregisterVideo, updateVideoRatio,
} from "@/lib/video-focus";
import type { UPost } from "@/lib/types";

function Verified({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return <BadgeCheck className={`${className} text-sky-500 fill-background`} />;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i;
function isVideoUrl(src: string) {
  return VIDEO_EXT.test(src);
}

function formatTime(sec: number) {
  const t = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* Video for a feed post. Only the video nearest the middle of the screen plays (see video-focus.ts).
   Top right: a sound icon; the volume slider shows on hover (touch: after tapping the icon).
   Bottom: seek bar (sky blue) with the time. Tapping the video opens it in the Reels tab, from the same point.
   When it ends, a black fade appears with Rewatch (play again) and Reels (open the Reels tab). */
function VideoMedia({ src, className = "", onClick }: { src: string; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [railOpen, setRailOpen] = useState(false); // opened by tapping the sound icon
  const [hovering, setHovering] = useState(false); // mouse over the video
  const railShown = railOpen || hovering;
  const audio = useSyncExternalStore(subscribeVideoAudio, getVideoAudio, getVideoAudio);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    registerVideo(el, 0);
    const io = new IntersectionObserver(
      ([entry]) => updateVideoRatio(el, entry.intersectionRatio),
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      unregisterVideo(el);
    };
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return listenDuration(el, (d) => setDuration(d));
  }, [src]);

  const rewatch = () => {
    const el = ref.current;
    setEnded(false);
    if (el) {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  };

  // Open this video in the Reels tab, from the point it has reached (an ended video opens from the start).
  const openInReels = () => {
    const el = ref.current;
    const t = el && !ended ? el.currentTime : 0;
    document.querySelectorAll("video").forEach((v) => v.pause());
    navigate({ to: "/reels", search: { v: src, t: t > 0.2 ? Number(t.toFixed(2)) : undefined } });
  };

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const muteLabel = audio.muted || audio.volume === 0;

  return (
    <div
      className="relative h-full w-full cursor-pointer"
      onClick={() => {
        onClick?.();
        openInReels();
      }}
    >
      <video
        ref={ref}
        src={src}
        playsInline
        preload="metadata"
        onPlay={() => setEnded(false)}
        onEnded={() => setEnded(true)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        className={className}
      />

      {!ended && (
        <>
          {/* top right: sound icon; the slider appears on hover */}
          <div
            onClick={stop}
            onDoubleClick={stop}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHovering(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") {
                setHovering(false);
                setRailOpen(false);
              }
            }}
            className="absolute top-2 right-2 flex items-center rounded-full bg-black/55 p-1.5 text-white"
          >
            <button
              type="button"
              aria-label={muteLabel ? "Turn sound on" : "Turn sound off"}
              onClick={() => setRailOpen((o) => !o)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/15"
            >
              {muteLabel ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div
              className={`flex items-center overflow-hidden transition-all duration-200 ${
                railShown ? "ml-1 w-20 opacity-100" : "ml-0 w-0 opacity-0"
              }`}
            >
              <SvSlider
                value={audio.muted ? 0 : audio.volume}
                min={0}
                max={1}
                step={0.05}
                ariaLabel="Sound volume"
                thickness={4}
                className="w-20"
                onChange={(v) => setVideoAudio({ volume: v, muted: v === 0 })}
              />
            </div>
          </div>

          {/* bottom: time and seek bar */}
          <div
            onClick={stop}
            onDoubleClick={stop}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-8 text-white"
          >
            <div className="mb-1 text-[11px] font-medium tabular-nums">
              {formatTime(time)} / {formatTime(duration)}
            </div>
            <SvSlider
              value={Math.min(time, duration || 0)}
              min={0}
              max={duration > 0 ? duration : 0}
              step={0.1}
              ariaLabel="Seek"
              thickness={6}
              className="block w-full"
              onChange={(t) => {
                const el = ref.current;
                if (el) el.currentTime = t;
                setTime(t);
              }}
            />
          </div>
        </>
      )}

      {ended && (
        <div
          onClick={stop}
          onDoubleClick={stop}
          className="animate-in-fade absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80"
        >
          <button
            type="button"
            onClick={rewatch}
            className="min-w-[140px] rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90"
          >
            Rewatch
          </button>
          <Link
            to="/reels"
            className="min-w-[140px] rounded-lg border border-white/60 px-6 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            Reels
          </Link>
        </div>
      )}
    </div>
  );
}

export function MediaImg({
  src, alt = "", className = "", onClick,
}: { src: string; alt?: string; className?: string; onClick?: () => void }) {
  const [err, setErr] = useState(false);
  if (src && isVideoUrl(src)) {
    return <VideoMedia src={src} className={className} onClick={onClick} />;
  }
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
  return <MediaImgLoaded src={src} alt={alt} className={className} onClick={onClick} onError={() => setErr(true)} />;
}

function MediaImgLoaded({
  src, alt, className, onClick, onError,
}: { src: string; alt: string; className: string; onClick?: () => void; onError: () => void }) {
  const fade = useImageFade(className, src);
  return (
    <img
      ref={fade.ref}
      {...fade.props}
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onClick={onClick}
      onLoad={fade.onLoad}
      onError={onError}
      className={`bg-muted ${className}`}
    />
  );
}

/**
 * Mouse drag for a horizontal carousel. Touch and trackpad already scroll natively; a mouse
 * drag does not, so the carousel is moved by hand and snapped to the nearest photo on release.
 */
function useMouseDragCarousel(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.style.scrollSnapType = "none";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.style.scrollSnapType = "";
      if (!moved) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    };
    // A drag must not also count as a click (e.g. opening the post).
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClick, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClick, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ref]);
}

export function PostCard({ post, withComments = false, tall = false }: { post: UPost; withComments?: boolean; tall?: boolean }) {
  const actions = useActions();
  const myId = useMyUserId();
  const demo = useDemo();
  const [followedLocal, setFollowedLocal] = useState(false);
  const authorId = post.profiles.id;
  const following = actions.isDemo ? !!demo.following[authorId] : followedLocal;
  const toggleFollow = () => {
    const next = !following;
    if (!actions.isDemo) setFollowedLocal(next);
    actions.follow(authorId, next);
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [saved, setSaved] = useState(post.savedByMe);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const isText = post.media_urls.length === 0;
  useMouseDragCarousel(scrollRef);

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
        {authorId !== myId && (
          <button
            type="button"
            onClick={toggleFollow}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${following ? "border border-border text-foreground" : "sv-gradient-bg text-white hover:opacity-90"}`}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
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
          className={`relative mx-3 md:mx-0 rounded-lg md:rounded-none overflow-hidden ${tall ? "aspect-[4/5] max-h-[740px]" : "aspect-square max-h-[585px]"} flex items-center justify-center p-8 text-center select-none`}
          style={{ background: "linear-gradient(135deg, #4338CA 0%, #7C3AED 30%, #6366F1 60%, #2DD4BF 85%, #5EEAD4 100%)" }}
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
            className={`flex ${post.media_urls.length > 1 ? "overflow-x-auto snap-x snap-mandatory no-scrollbar" : "overflow-hidden"} bg-black ${tall ? "aspect-[4/5] max-h-[740px]" : "aspect-square max-h-[585px]"}`}
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
          className="flex-1 rounded-lg sv-gradient-bg px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80"
        >
          Buy product
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
