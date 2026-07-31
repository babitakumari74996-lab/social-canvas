import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession, useMyProfile } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/story/$username")({
  component: StoryViewer,
});

function StoryViewer() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const { userId } = useSession();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);

  const { data } = useQuery({
    queryKey: ["story-user", username],
    queryFn: async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, close_friends")
        .eq("username", username)
        .maybeSingle();
      if (!p) return null;
      const { data: stories } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", p.id)
        .order("created_at", { ascending: true });
      return { profile: p, stories: stories ?? [] };
    },
  });

  const stories = data?.stories ?? [];
  const current = stories[idx];
  const media = useSignedUrl(current?.media_url);

  // Log view after 3s (Plus preview logic)
  useEffect(() => {
    if (!current || !userId || current.user_id === userId) return;
    const isPlus = me?.subscription_tier === "plus";
    const delay = isPlus ? 3000 : 500;
    const t = setTimeout(async () => {
      await supabase
        .from("story_views")
        .upsert({ story_id: current.id, viewer_id: userId }, { onConflict: "story_id,viewer_id" });
      qc.invalidateQueries({ queryKey: ["story-views"] });
    }, delay);
    return () => clearTimeout(t);
  }, [current, userId, me?.subscription_tier, qc]);

  // Auto-advance 5s
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      if (idx < stories.length - 1) setIdx(idx + 1);
      else navigate({ to: "/feed" });
    }, 5000);
    return () => clearTimeout(t);
  }, [idx, stories.length, current, navigate]);

  if (!data)
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  if (stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p>No active stories</p>
          <Link to="/feed" className="text-primary text-sm">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
      <div className="flex gap-1 p-2">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className={`h-full bg-white transition-all ${i < idx ? "w-full" : i === idx ? "w-full animate-[progress_5s_linear]" : "w-0"}`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="font-medium text-sm">@{data.profile.username}</div>
        <button onClick={() => navigate({ to: "/feed" })}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        {media.data && (
          <img src={media.data} alt="" className="max-h-full max-w-full object-contain" />
        )}
        <button
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => setIdx(Math.max(0, idx - 1))}
        >
          <ChevronLeft className="h-6 w-6 opacity-0 hover:opacity-70 mx-2" />
        </button>
        <button
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={() => (idx < stories.length - 1 ? setIdx(idx + 1) : navigate({ to: "/feed" }))}
        >
          <ChevronRight className="h-6 w-6 opacity-0 hover:opacity-70 mx-2 ml-auto" />
        </button>
      </div>
    </div>
  );
}
