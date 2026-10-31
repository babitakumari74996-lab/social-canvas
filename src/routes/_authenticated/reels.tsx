import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Send, MoreHorizontal, Volume2, VolumeX, Play, Plus, BadgeCheck, ChevronUp, ChevronDown, Star, Users, CircleUser } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useActions, useMe, useReels } from "@/lib/data";
import { ui } from "@/lib/demo-store";
import { formatCount } from "@/lib/time";
import { listenDuration } from "@/lib/video-duration";
import { useSession } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { useComments } from "@/lib/data";
import type { UReel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/reels")({
  // `v` = the video URL of a feed post that was tapped; that reel is shown first and starts playing.
  // `t` = where the feed video had got to (seconds), so the reel continues from that point.
  validateSearch: (search: Record<string, unknown>): { v?: string; t?: number } => {
    const t = Number(search.t);
    return {
      v: typeof search.v === "string" && search.v ? search.v : undefined,
      t: search.t !== undefined && Number.isFinite(t) && t > 0 ? t : undefined,
    };
  },
  component: ReelsPage,
});

const MUTED_KEY = "sv-reels-muted";

function ReelsPage() {
  const { reels: allReels, loading } = useReels();
  const { v, t } = Route.useSearch();
  // A feed video that was tapped comes first (matched by its video file); otherwise the normal order.
  const reels = (() => {
    if (!v) return allReels;
    const i = allReels.findIndex((r) => r.video_url === v);
    if (i <= 0) return allReels;
    return [allReels[i], ...allReels.slice(0, i), ...allReels.slice(i + 1)];
  })();
  const me = useMe();
  // The sound choice is remembered: unmuted once, the next Reels visit starts with sound (if the browser allows it).
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTED_KEY) !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(MUTED_KEY, muted ? "1" : "0"); } catch { /* storage unavailable: keep in memory only */ }
  }, [muted]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A freshly opened Reels page always starts at the first reel, the same one the swipe preview shows.
  // The first render can settle after the list is laid out (the browser may keep the second reel), so
  // the start position is set again after the first paint and once the reels arrive.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);
  const hasReels = reels.length > 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const id = requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [hasReels]);

  return (
    <div className="fixed inset-0 md:bottom-14 z-30 md:z-50 bg-black">
      {/* header */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-12 bg-gradient-to-b from-black/60 to-transparent">
        <span className="text-white font-bold text-lg md:hidden">Reels</span>
        <button
          type="button"
          onClick={() => ui.openCreate("video")}
          className="flex items-center gap-1.5 text-white text-sm font-semibold bg-white/15 backdrop-blur rounded-full px-3 py-1.5 md:ml-auto"
        >
          <Plus className="h-4 w-4" /> Create reel
        </button>
      </div>
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={() => setMuted((m) => !m)}
        className="absolute right-3 top-14 z-30 grid place-items-center h-9 w-9 rounded-full bg-black/50 text-white"
      >
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* desktop: left panel with the Reels sections */}
      <aside className="hidden md:flex absolute left-0 top-0 bottom-0 w-[220px] flex-col px-3 pt-3 z-40 text-white">
        <span className="px-3 mb-3 text-lg font-bold">Reels</span>
        <Link to="/reels" className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold">
          <Star className="h-5 w-5" /> For you
        </Link>
        <Link to="/feed" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5">
          <Users className="h-5 w-5" /> Following
        </Link>
        <Link
          to="/profile/$username"
          params={{ username: me?.username ?? "" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5"
        >
          <CircleUser className="h-5 w-5" /> Profile
        </Link>
      </aside>

      {/* desktop: up / down buttons to move between reels */}
      <div className="hidden md:flex flex-col gap-3 absolute right-6 top-1/2 -translate-y-1/2 z-30">
        <button
          type="button"
          aria-label="Previous reel"
          onClick={() => scrollRef.current?.scrollBy({ top: -scrollRef.current.clientHeight, behavior: "smooth" })}
          className="grid place-items-center h-10 w-10 rounded-full border border-white/50 text-white hover:bg-white/10"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next reel"
          onClick={() => scrollRef.current?.scrollBy({ top: scrollRef.current.clientHeight, behavior: "smooth" })}
          className="grid place-items-center h-10 w-10 rounded-full border border-white/50 text-white hover:bg-white/10"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar">
        {loading && (
          <div className="h-full snap-start grid place-items-center">
            <div className="text-white/60 text-sm animate-pulse">Loading reels…</div>
          </div>
        )}
        {!loading && reels.length === 0 && (
          <div className="h-full snap-start grid place-items-center text-center px-6">
            <div>
              <p className="text-white font-semibold">No reels yet</p>
              <p className="text-white/60 text-sm mt-1">Create the first reel!</p>
              <button type="button" onClick={() => ui.openCreate("video")} className="mt-4 bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2">
                Create reel
              </button>
            </div>
          </div>
        )}
        {reels.map((r) => (
          <ReelItem key={r.id} reel={r} muted={muted} startAt={v && r.video_url === v ? t : undefined} />
        ))}
      </div>
    </div>
  );
}

function ReelItem({ reel, muted, startAt }: { reel: UReel; muted: boolean; startAt?: number }) {
  const actions = useActions();
  const me = useMe();
  const { userId } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef(false);
  // The effects below run once, so they read the latest start point from this ref.
  const startAtRef = useRef(startAt);
  startAtRef.current = startAt;
  const seekRef = useRef<HTMLDivElement>(null);
  const seekingRef = useRef(false);

  // Move the reel to the point under the finger/mouse on the seek bar.
  const seekAt = (clientX: number) => {
    const bar = seekRef.current;
    const vid = videoRef.current;
    if (!bar || !vid || !Number.isFinite(vid.duration) || vid.duration <= 0) return;
    const r = bar.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    vid.currentTime = f * vid.duration;
    setProgress(f * 100);
  };

  // Some clips do not store their length; this learns it so the seek bar works.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    return listenDuration(vid, undefined, () => startAtRef.current);
  }, [reel.video_url]);
  // Each time Reels is opened from a feed video (new start point), jump to that point right away,
  // even if this reel is already on the page. If the clip is not loaded yet, playWithSound does it.
  useEffect(() => {
    startedAtRef.current = false;
    const vid = videoRef.current;
    if (vid && startAt !== undefined && vid.readyState >= 1) {
      vid.currentTime = startAt;
      startedAtRef.current = true;
    }
  }, [startAt, reel.video_url]);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [burst, setBurst] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // The video stays hidden until its first frame is ready, so the poster shows instead of a black
  // frame and there is no visible swap ("blink") when the real video starts.
  const [frameReady, setFrameReady] = useState(false);

  // Reveal the video only when its picture is actually bright. Uploaded clips often open with a black
  // intro; a time-based reveal would show that black. While the reel plays, a tiny copy of the current
  // frame is checked; the video appears once it is not black (with a time limit, so it never stays hidden).
  useEffect(() => {
    const vid = videoRef.current;
    if (!playing || !reel.poster || frameReady || !vid) return;
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const started = performance.now();
    const id = window.setInterval(() => {
      const timedOut = performance.now() - started > 4000;
      let bright = false;
      if (ctx && vid.readyState >= 2) {
        try {
          ctx.drawImage(vid, 0, 0, 16, 16);
          const d = ctx.getImageData(0, 0, 16, 16).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
          bright = sum / (16 * 16 * 3) > 16;
        } catch {
          bright = true; // cannot read the frame (e.g. cross-origin): do not keep the poster forever
        }
      }
      if (bright || timedOut) {
        window.clearInterval(id);
        setFrameReady(true);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [playing, reel.poster, frameReady]);

  useEffect(() => setLiked(reel.likedByMe), [reel.likedByMe]);

  useEffect(() => {
    const el = wrapRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    // Swipe-preview copies of this page (embed mode) are only pictures: they never play media, so the
    // preview does not show a reel that then changes. The real Reels page plays once it is on screen.
    if (document.documentElement.hasAttribute("data-embed")) return;
    // How much of this reel is on screen (both directions). Read from the layout, so it is right even when
    // IntersectionObserver misses a move (the page can be moved by a swipe commit with no new callback).
    const shown = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return 0;
      const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
      return (w * h) / (r.width * r.height);
    };
    const playWithSound = () => {
      // Opened from a feed video: start where that video was (only the first time this reel plays).
      const at = startAtRef.current;
      if (at !== undefined && !startedAtRef.current) {
        startedAtRef.current = true;
        vid.currentTime = at;
      }
      vid.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay with sound was blocked: play silently now, and restore the user's sound choice on the next tap.
        vid.muted = true;
        vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        const unlock = () => {
          vid.muted = mutedRef.current;
          document.removeEventListener("pointerdown", unlock);
        };
        document.addEventListener("pointerdown", unlock);
      });
    };
    const check = () => {
      if (shown() >= 0.6) {
        if (vid.paused) playWithSound();
      } else if (!vid.paused) {
        vid.pause();
        setPlaying(false);
      }
    };
    const io = new IntersectionObserver(check, { threshold: [0, 0.6, 1] });
    io.observe(el);
    // Right after the page is shown (also after a swipe commit), check a few times in case no callback comes.
    const timers = [0, 120, 300, 600, 1000].map((ms) => window.setTimeout(check, ms));
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.muted = muted;
  }, [muted]);

  // A tap anywhere on the reel pauses or plays it. Buttons, links and the comments sheet keep their own clicks.
  // The pause/play waits briefly so that a double-tap (like) does not also pause.
  const tapTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
  }, []);
  const onReelTap = (e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [data-no-tap]")) return;
    if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      togglePlay();
    }, 220);
  };
  const onReelDoubleTap = (e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [data-no-tap]")) return;
    if (tapTimer.current !== null) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    doubleLike();
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setPaused(false);
    } else {
      vid.pause();
      setPaused(true);
    }
    setShowPlay(true);
    setTimeout(() => setShowPlay(false), 600);
  };

  const doubleLike = () => {
    if (!liked) {
      setLiked(true);
      actions.like(reel.id, true);
    }
    setBurst(true);
    setTimeout(() => setBurst(false), 800);
  };

  const likeNow = () => {
    setLiked((v) => {
      actions.like(reel.id, !v);
      return !v;
    });
  };

  const rail = (cls: string) => (
            <div className={`flex flex-col items-center gap-4 text-white pb-1 ${cls}`}>
            <RailBtn
              onClick={likeNow}
              label={formatCount(reel.likes + (liked && !reel.likedByMe ? 1 : !liked && reel.likedByMe ? -1 : 0))}
              icon={<Heart className={`h-7 w-7 ${liked ? "fill-red-500 text-red-500" : ""}`} />}
            />
            <RailBtn onClick={() => setCommentsOpen(true)} label={formatCount(reel.commentsCount)} icon={<MessageCircle className="h-7 w-7 -scale-x-100" />} />
            <RailBtn
              onClick={() => ui.openShare({
                id: reel.id, user_id: reel.user_id, media_urls: reel.poster ? [reel.poster] : [],
                caption: reel.caption, created_at: reel.created_at, profiles: reel.profiles,
                likes: reel.likes, likedByMe: liked, savedByMe: false, commentsCount: reel.commentsCount,
              }, "reel")}
              label="Share"
              icon={<Send className="h-7 w-7" />}
            />
            <RailBtn onClick={() => toast("More options coming soon")} label="" icon={<MoreHorizontal className="h-6 w-6" />} />
            <span className="h-8 w-8 rounded-md border-2 border-white/70 bg-gradient-to-tr from-[#5EEAD4] via-[#6366F1] to-[#4338CA] animate-[spin_6s_linear_infinite]" />
          </div>
  );

  return (
    <div ref={wrapRef} className="h-full w-full snap-start snap-always flex items-center justify-center py-0 md:py-3 md:relative">
      <div
        onClick={onReelTap}
        onDoubleClick={onReelDoubleTap}
        className="relative h-full w-full md:h-full md:w-auto md:aspect-[9/16] md:flex-none md:rounded-xl overflow-hidden bg-zinc-900"
      >
        {reel.poster && (
          // Plain eager image at full opacity (no lazy load, no fade), so the poster is already on screen.
          <img
            src={reel.poster}
            alt=""
            decoding="sync"
            fetchPriority="high"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover bg-zinc-900"
          />
        )}
        <video
          ref={videoRef}
          src={reel.video_url}
          poster={reel.poster ?? undefined}
          style={{ filter: reel.videoFilter && reel.videoFilter !== "none" ? reel.videoFilter : undefined }}
          // Swipe-preview copies (embed mode) never play, so they download nothing.
          preload={typeof document !== "undefined" && document.documentElement.hasAttribute("data-embed") ? "none" : "metadata"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ${frameReady ? "opacity-100" : "opacity-0"}`}
          // With a poster, reveal the video only once it is past its first frames (uploaded clips often
          // start black). Without a poster, show the video as soon as its first frame is ready.
          onLoadedData={() => { if (!reel.poster) setFrameReady(true); }}
          onPlaying={() => { if (!reel.poster) setFrameReady(true); }}
          loop
          muted={muted}
          playsInline
          autoPlay={false}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            // Trimmed reels loop inside their range.
            const start = reel.trimStart ?? 0;
            const end = reel.trimEnd ?? 0;
            if (end && (v.currentTime >= end || v.currentTime < start)) v.currentTime = start;
            if (v.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
        />

        {showPlay && !playing && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Play className="h-16 w-16 text-white/90 fill-white/90" />
          </div>
        )}
        {paused && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Play className="h-16 w-16 text-white/80 fill-white/80" />
          </div>
        )}
        {burst && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <Heart className="h-28 w-28 text-white fill-white animate-heart-burst drop-shadow-xl" />
          </div>
        )}

        {/* bottom gradient + info */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-16 pb-6 px-3 flex items-end gap-3">
          <div className="flex-1 min-w-0 text-white">
            <div className="flex items-center gap-2">
              <Link to="/profile/$username" params={{ username: reel.profiles.username }}>
                <Avatar path={reel.profiles.avatar_url} alt={reel.profiles.username} size={32} className="ring-1 ring-white/40" />
              </Link>
              <Link to="/profile/$username" params={{ username: reel.profiles.username }} className="text-sm font-semibold drop-shadow">
                {reel.profiles.username}
              </Link>
              {reel.profiles.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-white fill-transparent" />}
              {reel.user_id !== me?.id && (
                <FollowInline userId={reel.user_id} />
              )}
            </div>
            {reel.caption && (
              <p className="mt-2 text-sm leading-snug line-clamp-2 drop-shadow">{reel.caption}</p>
            )}
            {reel.tagged && reel.tagged.length > 0 && (
              <p className="mt-1 text-xs text-white/85 drop-shadow">with {reel.tagged.map((t) => "@" + t).join(" ")}</p>
            )}
            <button
              type="button"
              className="mt-3 w-full rounded-lg sv-gradient-bg py-2.5 text-sm font-semibold text-white hover:opacity-90 active:opacity-80"
            >
              Buy product
            </button>
          </div>

          {/* action rail (inside the card on mobile) */}
          {rail("md:hidden")}
        </div>

        {/* seek bar: tap or drag anywhere on it to move the reel */}
        <div
          ref={seekRef}
          data-no-tap
          onPointerDown={(e) => {
            e.stopPropagation();
            seekingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            seekAt(e.clientX);
          }}
          onPointerMove={(e) => {
            if (seekingRef.current) seekAt(e.clientX);
          }}
          onPointerUp={() => {
            seekingRef.current = false;
          }}
          onPointerCancel={() => {
            seekingRef.current = false;
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 inset-x-0 h-6 z-30 flex items-end cursor-pointer touch-none"
        >
          <div className="relative h-[3px] w-full bg-white/25">
            <div className="h-full bg-sky-400" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {commentsOpen && (
          <div data-no-tap>
            <ReelComments reelId={reel.id} onClose={() => setCommentsOpen(false)} isReal={!!userId} reel={reel} />
          </div>
        )}
      </div>
      {/* desktop: action buttons sit beside the reel, like the reference layout */}
      <div className="hidden md:flex absolute bottom-16 md:left-[calc(50%+(100dvh-24px)*9/32+16px)] text-white">
        {rail("")}
      </div>
    </div>
  );
}

function FollowInline({ userId }: { userId: string }) {
  const actions = useActions();
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); setOn((v) => !v); actions.follow(userId, !on); }}
      className={`text-xs font-semibold rounded-md px-2.5 py-1 border ${on ? "border-white/60 text-white" : "border-white bg-transparent text-white"}`}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}

function RailBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      {icon}
      {label && <span className="text-[11px] font-semibold drop-shadow">{label}</span>}
    </button>
  );
}

function ReelComments({ reelId, reel, onClose, isReal }: { reelId: string; reel: UReel; onClose: () => void; isReal: boolean }) {
  const { comments } = useComments(reelId);
  const actions = useActions();
  const me = useMe();
  const [draft, setDraft] = useState("");
  void isReal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    actions.comment(reelId, draft.trim());
    setDraft("");
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-16 z-30 rounded-t-2xl bg-card flex flex-col animate-in-fade" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Comments</span>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-primary">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar path={c.profiles?.avatar_url} alt={c.profiles?.username ?? "?"} size={32} />
            <div className="text-sm">
              <span className="font-semibold mr-1.5">{c.profiles?.username ?? "user"}</span>
              <span className="break-words">{c.content}</span>
              <div className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(c.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 p-3 border-t border-border">
        <Avatar path={me?.avatar_url} alt="me" size={32} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={!draft.trim()} className="text-sm font-semibold text-primary disabled:opacity-40">Post</button>
      </form>
    </div>
  );
}

