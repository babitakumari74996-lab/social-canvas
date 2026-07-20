import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { StoryTray } from "@/components/StoryTray";
import { Link } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { useRef } from "react";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { suggestCaption } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const suggest = useServerFn(suggestCaption);

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

  const onCreatePost = async (file: File) => {
    if (!me) return;
    try {
      const path = await uploadMedia(me.id, file);
      let caption = window.prompt("Add a caption (or leave empty for AI suggestion)") ?? "";
      if (!caption.trim()) {
        try {
          const t = toast.loading("AI writing caption…");
          const res = await suggest({ data: { hint: "" } });
          caption = res.caption;
          toast.dismiss(t);
          if (caption) toast.success("Caption suggested");
        } catch {
          /* ignore, post without caption */
        }
      }
      const { error } = await supabase.from("posts").insert({
        user_id: me.id,
        media_urls: [path],
        caption: caption || null,
      });
      if (error) throw error;
      toast.success("Posted!");
      qc.invalidateQueries({ queryKey: ["feed"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-3 md:px-6 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight md:block hidden">Home</h1>
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Plus className="h-4 w-4 mr-1" /> New post
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCreatePost(f);
            e.target.value = "";
          }}
        />
      </div>
      <StoryTray />
      {isLoading && <div className="text-center text-muted-foreground py-10 text-sm">Loading feed…</div>}
      {!isLoading && posts?.length === 0 && (
        <div className="card-flat p-8 text-center">
          <p className="text-muted-foreground text-sm">Your feed is quiet. Post something or <Link to="/explore" className="text-primary">explore</Link>.</p>
        </div>
      )}
      {posts?.map((p) => (
        <PostCard key={p.id} post={p} tier={me?.subscription_tier ?? "free"} />
      ))}
    </div>
  );
}