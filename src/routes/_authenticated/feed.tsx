import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { StoryTray } from "@/components/StoryTray";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/components/SearchContext";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { data: me } = useMyProfile();
  const { query } = useSearch();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", me?.id, me?.muted_users],
    queryFn: async (): Promise<FeedPost[]> => {
      if (!me) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, media_urls, caption, created_at, hide_from_feed, profiles!inner(username, avatar_url, display_name, is_verified, subscription_tier)")
        .eq("hide_from_feed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      const muted = me.muted_users ?? [];
      return (data ?? []).filter((p) => !muted.includes(p.user_id)) as unknown as FeedPost[];
    },
    enabled: !!me,
  });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? (posts ?? []).filter((p) =>
        (p.caption ?? "").toLowerCase().includes(q) ||
        (p.profiles?.username ?? "").toLowerCase().includes(q) ||
        (p.profiles?.display_name ?? "").toLowerCase().includes(q))
    : posts;

  return (
    <div className="max-w-xl mx-auto px-3 md:px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight md:block hidden">Home</h1>
        <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent("open-today"))}>
          <Plus className="h-4 w-4 mr-1" /> New post
        </Button>
      </div>
      <StoryTray />
      {isLoading && <div className="text-center text-muted-foreground py-10 text-sm">Loading feed…</div>}
      {!isLoading && filtered?.length === 0 && (
        <div className="card-flat p-8 text-center">
          <p className="text-muted-foreground text-sm">{q ? `No posts match "${query}".` : (<>Your feed is quiet. Post something or <Link to="/explore" className="text-primary">explore</Link>.</>)}</p>
        </div>
      )}
      {filtered?.map((p) => (
        <PostCard key={p.id} post={p} tier={me?.subscription_tier ?? "free"} />
      ))}
    </div>
  );
}