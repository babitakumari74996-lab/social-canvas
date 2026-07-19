import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { useMyProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/explore")({
  component: ExplorePage,
});

function GridTile({ path, id }: { path: string; id: string }) {
  const { data } = useSignedUrl(path);
  return (
    <Link to="/post/$id" params={{ id }} className="aspect-square bg-muted overflow-hidden">
      {data && <img src={data} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />}
    </Link>
  );
}

function ExplorePage() {
  const { data: me } = useMyProfile();
  const { data: posts } = useQuery({
    queryKey: ["explore", me?.id, me?.muted_users],
    queryFn: async () => {
      if (!me) return [];
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", me.id);
      const following = new Set([...(follows?.map((f) => f.following_id) ?? []), me.id]);
      const muted = new Set(me.muted_users ?? []);
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, media_urls, created_at")
        .eq("hide_from_feed", false)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []).filter((p) => !following.has(p.user_id) && !muted.has(p.user_id));
    },
    enabled: !!me,
  });

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-4">
      <h1 className="text-xl font-semibold tracking-tight mb-4">Explore</h1>
      {posts?.length === 0 && (
        <div className="card-flat p-8 text-center text-sm text-muted-foreground">Nothing new yet.</div>
      )}
      <div className="grid grid-cols-3 gap-1">
        {posts?.map((p) => p.media_urls[0] && <GridTile key={p.id} path={p.media_urls[0]} id={p.id} />)}
      </div>
    </div>
  );
}