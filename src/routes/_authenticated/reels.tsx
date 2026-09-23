import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Send, MoreHorizontal, Music2, Volume2, VolumeX, Play, Plus, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useMe, useReels } from "@/lib/data";
import { ui } from "@/lib/demo-store";
import { formatCount } from "@/lib/time";
import { useSession } from "@/lib/auth";
import { timeAgo } from "@/lib/time";
import { useComments } from "@/lib/data";
import type { UReel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/reels")({
  component: ReelsPage,
});

function ReelsPage() {
  const { reels, loading } = useReels();
  const [muted, setMuted] = useState(true);

  return (
    <div className="fixed md:relative inset-0 md:inset-auto md:h-screen z-30 bg-black">
      {/* header */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-12 bg-gradient-to-b from-black/60 to-transparent">
        <span className="text-white font-bold text-lg">Reels</span>
        <button
          type="button"
          onClick={() => ui.openCreate("video")}
          className="flex items-center gap-1.5 text-white text-sm font-semibold bg-white/15 backdrop-blur rounded-full px-3 py-1.5"
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

      <div className="h-[calc(100dvh-6.5rem)] md:h-screen overflow-y-scroll snap-y snap-mandatory no-scrollbar">
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
          <ReelItem key={r.id} reel={r} muted={muted} />
        ))}
      </div>
    </div>
  );
}

function ReelItem({ reel, muted }: { reel: UReel; muted: boolean }) {
  const actions = useActions();
  const me = useMe();
  const { userId } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [burst, setBurst] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showPlay, setShowPlay] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => setLiked(reel.likedByMe), [reel.likedByMe]);

  useEffect(() => {
    const el = wrapRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          vid.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          vid.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.muted = muted;
  }, [muted]);

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

  return (
    <div ref={wrapRef} className="h-full w-full snap-start snap-always flex items-center justify-center py-0 md:py-4">
      <div className="relative h-full w-full md:h-full md:aspect-[9/16] md:rounded-xl overflow-hidden bg-zinc-900">
        {reel.poster && <MediaImg src={reel.poster} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
        <video
          ref={videoRef}
          src={reel.video_url}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted={muted}
          playsInline
          autoPlay={false}
          onClick={togglePlay}
          onDoubleClick={doubleLike}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
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
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-16 pb-10 md:pb-12 px-3 flex items-end gap-3">
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
            {reel.music && (
              <div className="mt-2 flex items-center gap-1.5 text-xs overflow-hidden">
                <Music2 className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap animate-[marquee_10s_linear_infinite]">{reel.music} · {reel.music}</span>
              </div>
            )}
          </div>

          {/* action rail */}
          <div className="flex flex-col items-center gap-4 text-white pb-1">
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
            <span className="h-8 w-8 rounded-md border-2 border-white/70 bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] animate-[spin_6s_linear_infinite]" />
          </div>
        </div>

        {/* progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/20">
          <div className="h-full bg-white" style={{ width: `${progress}%` }} />
        </div>

        {commentsOpen && <ReelComments reelId={reel.id} onClose={() => setCommentsOpen(false)} isReal={!!userId} reel={reel} />}
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

// keep supabase import referenced for potential realtime upgrades
void supabase;
