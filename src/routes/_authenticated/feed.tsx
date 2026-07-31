import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { useSearch } from "@/components/SearchContext";
import { PostCard, type FeedPost } from "@/components/PostCard";

import { DailyCheckIn, StoriesTray } from "@/components/DailyCheckIn";
import {
  PostCardSkeleton,
  ReelCardSkeleton,
  ActivityCardSkeleton,
} from "@/components/SkeletonComponents";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { data: me, isLoading: meLoading } = useMyProfile();
  const { query } = useSearch();

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["feed", me?.id, me?.muted_users],
    queryFn: async (): Promise<FeedPost[]> => {
      if (!me) return [];
      const { data } = await supabase
        .from("posts")
        .select(
          "id, user_id, media_urls, caption, created_at, hide_from_feed, profiles!inner(username, avatar_url, display_name, is_verified, subscription_tier)",
        )
        .eq("hide_from_feed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      const muted = me.muted_users ?? [];
      return (data ?? []).filter((p) => !muted.includes(p.user_id)) as unknown as FeedPost[];
    },
    enabled: !!me,
  });

  const isLoading = meLoading || postsLoading;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? (posts ?? []).filter(
        (p) =>
          (p.caption ?? "").toLowerCase().includes(q) ||
          (p.profiles?.username ?? "").toLowerCase().includes(q) ||
          (p.profiles?.display_name ?? "").toLowerCase().includes(q),
      )
    : posts ?? [];

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-6 py-4 space-y-4">
      <DailyCheckIn />
      <StoriesTray />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {[1, 2, 3].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered?.length === 0 && !q && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <section aria-label="Suggested posts">
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Suggested for you</h3>
              <button className="text-xs font-medium text-primary hover:underline">See all</button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </section>

          <section aria-label="Suggested reels">
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Reels you might like</h3>
              <Link to="/reels" className="text-xs font-medium text-primary hover:underline">
                Explore
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1 -mx-1">
              {[1, 2, 3].map((i) => (
                <ReelCardSkeleton key={i} />
              ))}
            </div>
          </section>

          <section aria-label="Communities to join">
            <h3 className="text-sm font-semibold text-foreground px-1 mb-3">
              Discover communities
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ActivityCardSkeleton variant="group" />
              <ActivityCardSkeleton variant="event" />
              <ActivityCardSkeleton variant="page" />
              <ActivityCardSkeleton variant="besties" />
            </div>
          </section>
        </div>
      )}

      {/* Empty search results */}
      {!isLoading && filtered?.length === 0 && q && (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No results found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            We couldn't find any posts matching "{q}". Try a different search term.
          </p>
        </div>
      )}

      {/* Post Feed */}
      {filtered && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} tier={me?.subscription_tier ?? "free"} />
          ))}
        </div>
      )}
    </div>
  );
}
