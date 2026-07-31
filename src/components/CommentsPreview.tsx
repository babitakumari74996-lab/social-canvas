import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar } from "./PostCard";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
}

interface CommentsPreviewProps {
  postId: string;
  postUserId: string;
}

const COMMENTS_TO_SHOW = 2;

export function CommentsPreview({ postId, postUserId }: CommentsPreviewProps) {
  const { userId } = useSession();
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async (): Promise<Comment[]> => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, profiles!inner(username, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(50);
      return (data ?? []) as unknown as Comment[];
    },
  });

  const totalCount = comments?.length ?? 0;
  const displayComments = showAll ? comments : comments?.slice(0, COMMENTS_TO_SHOW);
  const remaining = totalCount - COMMENTS_TO_SHOW;

  const addComment = useMutation({
    mutationFn: async () => {
      if (!userId || !commentText.trim()) return;
      await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: userId, content: commentText.trim() });
      setCommentText("");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
      qc.invalidateQueries({ queryKey: ["post-likes", postId] });
    },
  });

  if (!comments && !isLoading) return null;

  return (
    <div className="border-t border-border/40 dark:border-border/20 pt-3 mt-2">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading comments…
        </div>
      )}

      {totalCount > COMMENTS_TO_SHOW && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          View all {totalCount} comments
        </button>
      )}

      {displayComments?.map((c) => (
        <div key={c.id} className="flex gap-2.5 py-1.5 group">
          <Link
            to="/profile/$username"
            params={{ username: c.profiles?.username ?? "" }}
            className="shrink-0 mt-0.5"
          >
            <Avatar path={c.profiles?.avatar_url} alt={c.profiles?.username ?? ""} size={28} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="bg-muted/40 dark:bg-muted/20 rounded-2xl px-3 py-2">
              <Link
                to="/profile/$username"
                params={{ username: c.profiles?.username ?? "" }}
                className="text-xs font-semibold text-foreground hover:underline"
              >
                {c.profiles?.username ?? "anonymous"}
              </Link>
              <p className="text-sm text-foreground/85 mt-0.5 break-words">{c.content}</p>
            </div>
            <div className="flex items-center gap-3 mt-0.5 px-3">
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNowStrict(new Date(c.created_at))} ago
              </span>
              <button className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Like
              </button>
              <button className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Reply
              </button>
            </div>
          </div>
        </div>
      ))}

      {showAll && totalCount > COMMENTS_TO_SHOW && (
        <button
          onClick={() => setShowAll(false)}
          className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          Show less
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addComment.mutate();
        }}
        className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20"
      >
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 py-1.5"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || addComment.isPending}
          className="text-sm font-semibold text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
        >
          {addComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Post"
          )}
        </button>
      </form>
    </div>
  );
}
