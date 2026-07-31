import { useState } from "react";
import { Heart, MessageCircle, Send, Sparkles, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useSignedUrl } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";
import { formatDistanceToNowStrict, format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePlus } from "./PlusModal";
import { MediaRenderer } from "./MediaRenderer";
import { CommentsPreview } from "./CommentsPreview";
import { PostActionMenu } from "./PostActionMenu";

export type FeedPost = {
  id: string;
  user_id: string;
  media_urls: string[];
  caption: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    display_name: string | null;
    is_verified: boolean;
    subscription_tier: string;
  } | null;
};

const CAPTION_TRUNCATE_LENGTH = 280;

export function Avatar({
  path,
  alt,
  size = 32,
}: {
  path: string | null | undefined;
  alt: string;
  size?: number;
}) {
  const { data } = useSignedUrl(path ?? undefined);
  const initial = alt.charAt(0).toUpperCase();

  return data ? (
    <img
      src={data}
      alt={alt}
      className="rounded-full object-cover ring-1 ring-border/30 dark:ring-border/20"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary ring-1 ring-border/20"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export function PostCard({ post, tier }: { post: FeedPost; tier: string }) {
  const { userId } = useSession();
  const qc = useQueryClient();
  const { requirePlus } = usePlus();
  const [showComments, setShowComments] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [burst, setBurst] = useState(false);

  const isOwnPost = userId === post.user_id;
  const hasLongCaption = (post.caption?.length ?? 0) > CAPTION_TRUNCATE_LENGTH;
  const displayCaption = captionExpanded
    ? post.caption
    : post.caption?.slice(0, CAPTION_TRUNCATE_LENGTH);

  const { data: likeData } = useQuery({
    queryKey: ["post-likes", post.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      const { data: mine } = userId
        ? await supabase
            .from("likes")
            .select("post_id")
            .eq("post_id", post.id)
            .eq("user_id", userId)
            .maybeSingle()
        : { data: null };
      return { count: count ?? 0, liked: !!mine };
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-likes", post.id] });
    },
  });

  const handleCommentToggle = () => setShowComments((s) => !s);

  return (
    <article className="card-social overflow-hidden animate-in-fade hover:shadow-lg hover:border-primary/15 dark:hover:border-primary/25 dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 dark:dark-card-glow">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link to="/profile/$username" params={{ username: post.profiles?.username ?? "" }}>
          <Avatar path={post.profiles?.avatar_url} alt={post.profiles?.username ?? ""} size={40} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              to="/profile/$username"
              params={{ username: post.profiles?.username ?? "" }}
              className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
            >
              {post.profiles?.display_name ?? post.profiles?.username}
            </Link>
            {post.profiles?.is_verified && (
              <svg viewBox="0 0 16 16" width="14" height="14" fill="oklch(0.62 0.14 240)" className="shrink-0">
                <path d="M8 0a.75.75 0 01.673.418l1.582 3.207 3.54.515a.75.75 0 01.416 1.279l-2.56 2.496.604 3.525a.75.75 0 01-1.088.79L8 10.921l-3.167 1.664a.75.75 0 01-1.088-.79l.604-3.525-2.56-2.496a.75.75 0 01.416-1.279l3.54-.515L7.327.418A.75.75 0 018 0z"/>
              </svg>
            )}
            {post.profiles?.subscription_tier === "plus" && (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <time dateTime={post.created_at} title={format(new Date(post.created_at), "PPpp")}>
              {formatDistanceToNowStrict(new Date(post.created_at))} ago
            </time>
          </div>
        </div>
        <PostActionMenu
          postId={post.id}
          isOwnPost={isOwnPost}
          onEdit={() => toast.info("Edit coming soon")}
          onDelete={async () => {
            if (!confirm("Delete this post?")) return;
            await supabase.from("posts").delete().eq("id", post.id);
            qc.invalidateQueries({ queryKey: ["feed"] });
            toast.success("Post deleted");
          }}
        />
      </header>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-3 text-sm text-foreground/85 leading-relaxed">
          <span className="font-semibold text-foreground mr-2">
            {post.profiles?.display_name ?? post.profiles?.username}
          </span>
          {displayCaption}
          {hasLongCaption && !captionExpanded && (
            <>
              …{" "}
              <button
                onClick={() => setCaptionExpanded(true)}
                className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm"
              >
                See more
              </button>
            </>
          )}
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <MediaRenderer mediaUrls={post.media_urls} caption={post.caption} />
      )}

      {/* Link preview when no media */}
      {(!post.media_urls || post.media_urls.length === 0) && post.caption && (
        <MediaRenderer mediaUrls={[]} caption={post.caption} />
      )}

      {/* Engagement stats */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {likeData && likeData.count > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-primary-foreground font-bold">
                ♥
              </span>
              {likeData.count}
            </span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-t border-border/40 dark:border-border/20 mx-4">
        <button
          onClick={() => toggleLike.mutate()}
          disabled={toggleLike.isPending}
          className={cn(
            "flex items-center justify-center gap-1.5 flex-1 h-9 rounded-md text-sm font-medium transition-all duration-200",
            likeData?.liked
              ? "text-primary hover:bg-primary/5"
              : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground",
          )}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-all duration-200",
              likeData?.liked ? "fill-primary text-primary" : "",
              burst ? "animate-heart-burst" : "",
            )}
            strokeWidth={1.8}
          />
          Like
        </button>
        <button
          onClick={handleCommentToggle}
          className={cn(
            "flex items-center justify-center gap-1.5 flex-1 h-9 rounded-md text-sm font-medium transition-all duration-200",
            showComments
              ? "text-primary hover:bg-primary/5"
              : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground",
          )}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
          Comment
        </button>
        <button
          onClick={() => {
            const url = `${window.location.origin}/post/${post.id}`;
            navigator.clipboard?.writeText(url);
            toast.success("Link copied to clipboard");
          }}
          className="flex items-center justify-center gap-1.5 flex-1 h-9 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground transition-all duration-200"
        >
          <Share2 className="h-5 w-5" strokeWidth={1.8} />
          Share
        </button>
        {tier === "plus" && (
          <button
            onClick={() => {
              requirePlus("super heart");
            }}
            className="flex items-center justify-center gap-1.5 flex-1 h-9 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-primary transition-all duration-200"
            title="Super heart"
          >
            <Sparkles className="h-5 w-5" strokeWidth={1.8} />
          </button>
        )}
        <button
          onClick={() => {
            const url = `${window.location.origin}/post/${post.id}`;
            navigator.clipboard?.writeText(url);
            toast.success("Link copied");
          }}
          className="h-9 w-9 rounded-full hover:bg-muted/50 dark:hover:bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 ml-1"
          aria-label="Send"
        >
          <Send className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      {/* Comments */}
      {showComments && <div className="px-4 pb-3"><CommentsPreview postId={post.id} postUserId={post.user_id} /></div>}
    </article>
  );
}
