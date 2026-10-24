import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MOODS } from "@/components/MoodBox";
import { useMoods, useMyUserId } from "@/lib/data";
import { demoActions, resolveVideoUrl, useDemo } from "@/lib/demo-store";
import { formatCount, timeAgo } from "@/lib/time";
import type { UMood } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/moods")({
  component: MoodsPage,
});

function MoodsPage() {
  const { moods } = useMoods();

  return (
    <div className="max-w-[520px] mx-auto pb-10">
      <h1 className="px-4 pt-4 pb-2 text-lg font-semibold">Moods</h1>
      {moods.map((m) => (
        <MoodCard key={m.id} mood={m} />
      ))}
      {moods.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-16">
          No moods yet. Share how you feel from Home.
        </p>
      )}
    </div>
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
            className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            Follow
          </button>
        )}
      </header>

      {meta && (
        <p className="px-3 pb-1 text-sm">
          <span className="mr-1">{meta.emoji}</span>
          <span className="font-semibold">Feeling {meta.label.toLowerCase()}</span>
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
