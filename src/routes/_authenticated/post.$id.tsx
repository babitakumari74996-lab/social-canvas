import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { useMyProfile } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/post/$id")({
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const { data: me } = useMyProfile();

  const { data: post } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(
          "id, user_id, media_urls, caption, created_at, profiles!inner(username, avatar_url, display_name, is_verified, subscription_tier)",
        )
        .eq("id", id)
        .maybeSingle();
      return data as unknown as FeedPost | null;
    },
  });

  return (
    <div className="max-w-xl mx-auto px-3 md:px-6 py-4 space-y-4">
      <Link to="/feed" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      {post ? <PostCard post={post} tier={me?.subscription_tier ?? "free"} /> : <div>Loading…</div>}
    </div>
  );
}
