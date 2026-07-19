import { useState } from "react";
import { Heart, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSignedUrl } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { usePlus } from "./PlusModal";

export type FeedPost = {
  id: string;
  user_id: string;
  media_urls: string[];
  caption: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null; display_name: string | null; is_verified: boolean; subscription_tier: string } | null;
};

function Avatar({ path, alt, size = 32 }: { path: string | null | undefined; alt: string; size?: number }) {
  const { data } = useSignedUrl(path ?? undefined);
  return data ? (
    <img src={data} alt={alt} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full bg-muted" style={{ width: size, height: size }} />
  );
}

function MediaImage({ path }: { path: string }) {
  const { data } = useSignedUrl(path);
  return (
    <div className="w-full aspect-square bg-muted overflow-hidden">
      {data && <img src={data} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

export function PostCard({ post, tier }: { post: FeedPost; tier: string }) {
  const { userId } = useSession();
  const qc = useQueryClient();
  const { requirePlus } = usePlus();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [burst, setBurst] = useState(false);

  const { data: likeData } = useQuery({
    queryKey: ["post-likes", post.id],
    queryFn: async () => {
      const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
      const { data: mine } = userId
        ? await supabase.from("likes").select("post_id").eq("post_id", post.id).eq("user_id", userId).maybeSingle()
        : { data: null };
      return { count: count ?? 0, liked: !!mine };
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, profiles(username)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true })
        .limit(50);
      return data ?? [];
    },
    enabled: showComments,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      if (likeData?.liked) {
        await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", userId);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: userId });
        setBurst(true);
        setTimeout(() => setBurst(false), 300);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-likes", post.id] }),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!userId || !commentText.trim()) return;
      await supabase.from("comments").insert({ post_id: post.id, user_id: userId, content: commentText.trim() });
      setCommentText("");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-comments", post.id] }),
  });

  return (
    <article className="card-flat overflow-hidden animate-in-fade">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Link to="/profile/$username" params={{ username: post.profiles?.username ?? "" }}>
          <Avatar path={post.profiles?.avatar_url} alt={post.profiles?.username ?? ""} size={36} />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to="/profile/$username" params={{ username: post.profiles?.username ?? "" }} className="font-semibold text-sm">
            {post.profiles?.username}
          </Link>
          {post.profiles?.subscription_tier === "plus" && (
            <Sparkles className="inline-block h-3.5 w-3.5 ml-1 text-primary" />
          )}
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(post.created_at))} ago
          </div>
        </div>
      </header>

      {post.media_urls[0] && <MediaImage path={post.media_urls[0]} />}

      <div className="px-3 py-2 flex items-center gap-4">
        <button onClick={() => toggleLike.mutate()} className="hover:opacity-70 transition-opacity">
          <Heart
            className={`h-6 w-6 ${likeData?.liked ? "fill-red-500 text-red-500" : ""} ${burst ? "animate-heart-burst" : ""}`}
            strokeWidth={1.6}
          />
        </button>
        <button onClick={() => setShowComments((s) => !s)} className="hover:opacity-70 transition-opacity">
          <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
        </button>
        {tier === "plus" && (
          <button
            onClick={() => {
              setBurst(true);
              setTimeout(() => setBurst(false), 300);
            }}
            className="hover:opacity-70 transition-opacity"
            title="Super heart (Plus)"
          >
            <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.6} />
          </button>
        )}
      </div>

      <div className="px-3 pb-3 text-sm">
        <div className="font-medium">{likeData?.count ?? 0} likes</div>
        {post.caption && (
          <div className="mt-1">
            <span className="font-semibold mr-2">{post.profiles?.username}</span>
            {post.caption}
          </div>
        )}
        {showComments && (
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            {comments?.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-semibold mr-2">{c.profiles?.username}</span>
                {c.content}
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addComment.mutate();
              }}
              className="flex gap-2 mt-2"
            >
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button type="submit" className="text-primary text-sm font-medium disabled:opacity-40" disabled={!commentText.trim()}>
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

export { Avatar };