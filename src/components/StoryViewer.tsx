import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, MoreHorizontal, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useMe, useStoryGroups } from "@/lib/data";
import { demoActions, ui, useUI } from "@/lib/demo-store";
import { timeAgo } from "@/lib/time";

const PHOTO_MS = 5000;

export function StoryViewer() {
  const { storyUser } = useUI();
  const groups = useStoryGroups();
  const me = useMe();
  const actions = useActions();

  const startIdx = groups.findIndex((g) => g.user.username === storyUser);
  const [gi, setGi] = useState(startIdx >= 0 ? startIdx : 0);
  const [ii, setIi] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [reply, setReply] = useState("");
  const [liked, setLiked] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTs = useRef<number>(0);

  const open = !!storyUser && groups.length > 0;

  useEffect(() => {
    if (storyUser) {
      const idx = groups.findIndex((g) => g.user.username === storyUser);
      setGi(idx >= 0 ? idx : 0);
      setIi(0);
      setProgress(0);
      setLiked(false);
    }
  }, [storyUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    setProgress(0);
    setIi((prevIi) => {
      const group = groups[gi];
      if (group && prevIi + 1 < group.items.length) return prevIi + 1;
      if (gi + 1 < groups.length) {
        setGi(gi + 1);
        return 0;
      }
      ui.closeStories();
      return prevIi;
    });
  }, [gi, groups]);

  const prev = useCallback(() => {
    setProgress(0);
    setIi((prevIi) => {
      if (prevIi > 0) return prevIi - 1;
      if (gi > 0) {
        setGi(gi - 1);
        return 0;
      }
      return 0;
    });
  }, [gi]);

  // progress loop
  useEffect(() => {
    if (!open || holding) return;
    const group = groups[gi];
    const item = group?.items[ii];
    if (!group || !item) return;
    if (/\.(mp4|webm|mov|m4v)$/i.test(item.media_url)) return; // videos drive their own progress

    lastTs.current = performance.now();
    const tick = (ts: number) => {
      const dt = ts - lastTs.current;
      lastTs.current = ts;
      setProgress((p) => {
        const np = p + (dt / PHOTO_MS) * 100;
        if (np >= 100) {
          next();
          return 0;
        }
        return np;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, gi, ii, holding, groups, next]);

  // mark group viewed when opening it
  useEffect(() => {
    if (!open) return;
    const group = groups[gi];
    if (group && !actions.isDemo) return;
    if (group) demoActions.markStorySeen(group.user.id);
  }, [gi, open, groups, actions.isDemo]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ui.closeStories();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev]);

  if (!open) return null;
  const group = groups[gi];
  const item = group?.items[ii];
  if (!group || !item) return null;

  const sendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text) return;
    actions.sendMessage(group.user.id, text);
    setReply("");
    toast(`Reply sent to ${group.user.username}`);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a1a1a]/98 flex items-center justify-center" role="dialog" aria-modal>
      {/* desktop prev/next */}
      {gi > 0 && (
        <button type="button" aria-label="Previous story" onClick={prev} className="hidden md:grid absolute left-4 top-1/2 -translate-y-1/2 place-items-center h-9 w-9 rounded-full bg-white/90 text-black hover:scale-105 transition-transform z-10">
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        aria-label="Next story"
        onClick={next}
        className="hidden md:grid absolute right-4 top-1/2 -translate-y-1/2 place-items-center h-9 w-9 rounded-full bg-white/90 text-black hover:scale-105 transition-transform z-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <button type="button" aria-label="Close" onClick={ui.closeStories} className="hidden md:grid absolute right-5 top-5 place-items-center h-9 w-9 text-white/90 hover:text-white z-10">
        <X className="h-7 w-7" />
      </button>

      {/* story card */}
      <div
        className="relative w-full h-full md:w-auto md:h-[92vh] md:aspect-[9/16] md:rounded-xl overflow-hidden bg-black flex flex-col"
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
      >
        {/* progress bars */}
        <div className="absolute top-2 inset-x-2 z-20 flex gap-1">
          {group.items.map((_, i) => (
            <div key={i} className="h-[2.5px] flex-1 rounded-full bg-white/35 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < ii ? "100%" : i === ii ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-5 inset-x-3 z-20 flex items-center gap-2.5 pt-1">
          <Avatar path={group.user.avatar_url} alt={group.user.username} size={34} />
          <div className="flex-1 leading-tight">
            <span className="text-white text-sm font-semibold drop-shadow">{group.user.username}</span>
            <span className="text-white/70 text-xs ml-2">{timeAgo(item.created_at)}</span>
          </div>
          <MoreHorizontal className="h-5 w-5 text-white/90" />
          <button type="button" aria-label="Close" onClick={ui.closeStories} className="md:hidden">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* tap zones */}
        <button type="button" aria-label="Previous" onClick={prev} className="absolute left-0 top-16 bottom-20 w-1/3 z-10 md:hidden" />
        <button type="button" aria-label="Next" onClick={next} className="absolute right-0 top-16 bottom-20 w-1/3 z-10 md:hidden" />

        {/* media */}
        {/\.(mp4|webm|mov|m4v)$/i.test(item.media_url) ? (
          <video
            key={item.id}
            src={item.media_url}
            className="flex-1 w-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={next}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
          />
        ) : (
          <MediaImg src={item.media_url} alt="story" className="flex-1 w-full h-full object-contain" onClick={next} />
        )}

        {holding && (
          <div className="absolute inset-0 z-10" />
        )}

        {/* reply bar */}
        {group.user.id !== me?.id ? (
          <form onSubmit={sendReply} className="absolute bottom-4 inset-x-3 z-20 flex items-center gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder={`Reply to ${group.user.username}…`}
              className="flex-1 rounded-full border border-white/40 bg-transparent text-white text-sm px-4 py-2.5 outline-none placeholder:text-white/60 backdrop-blur-sm"
            />
            <button type="button" aria-label="Like story" onClick={() => { setLiked((v) => !v); toast("❤️ Liked story"); }}>
              <Heart className={`h-6 w-6 ${liked ? "text-red-500 fill-red-500" : "text-white"}`} />
            </button>
            <button type="submit" aria-label="Send reply">
              <Send className="h-6 w-6 text-white" />
            </button>
          </form>
        ) : (
          <div className="absolute bottom-4 inset-x-3 z-20 text-center text-white/70 text-xs">
            Your story · {group.items.length} {group.items.length === 1 ? "frame" : "frames"}
          </div>
        )}
      </div>
    </div>
  );
}
