import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyProfile } from "@/lib/auth";
import { useSignedUrl } from "@/lib/media";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useRef } from "react";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePlus } from "./PlusModal";

function Ring({ path, viewed, username }: { path: string | null | undefined; viewed: boolean; username: string }) {
  const { data } = useSignedUrl(path ?? undefined);
  return (
    <Link to="/story/$username" params={{ username }} className="flex flex-col items-center gap-1 w-16 shrink-0">
      <div className={viewed ? "story-ring-viewed" : "story-ring-unviewed"}>
        <div className="bg-background rounded-full p-0.5">
          {data ? (
            <img src={data} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-muted" />
          )}
        </div>
      </div>
      <span className="text-xs truncate w-full text-center">{username}</span>
    </Link>
  );
}

export function StoryTray() {
  const { userId } = useSession();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { requirePlus } = usePlus();

  const { data: stories } = useQuery({
    queryKey: ["stories-tray", userId, me?.close_friends],
    queryFn: async () => {
      if (!userId) return [];
      // Followed users + self
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
      const ids = [userId, ...(follows?.map((f) => f.following_id) ?? [])];
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_url, close_friend_only, created_at, expires_at, extended_until, profiles(username, avatar_url, close_friends)")
        .in("user_id", ids)
        .order("created_at", { ascending: false });
      const active = (data ?? []).filter((s) => new Date(s.extended_until ?? s.expires_at) > new Date());
      // Filter close_friend_only: only show if I'm in their close_friends
      const visible = active.filter((s) => {
        if (!s.close_friend_only) return true;
        if (s.user_id === userId) return true;
        return (s.profiles?.close_friends ?? []).includes(userId);
      });
      // Group by user, keep latest
      const byUser = new Map<string, typeof visible[number]>();
      for (const s of visible) if (!byUser.has(s.user_id)) byUser.set(s.user_id, s);
      return Array.from(byUser.values());
    },
    enabled: !!userId,
  });

  const onUpload = async (file: File, closeFriendsOnly: boolean, extend: boolean) => {
    if (!userId) return;
    try {
      const path = await uploadMedia(userId, file);
      const extended_until = extend && me?.subscription_tier === "plus"
        ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
        : null;
      const { error } = await supabase.from("stories").insert({
        user_id: userId,
        media_url: path,
        close_friend_only: closeFriendsOnly,
        extended_until,
      });
      if (error) throw error;
      toast.success("Story posted");
      qc.invalidateQueries({ queryKey: ["stories-tray"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <div className="card-flat p-3 mb-4">
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {/* Add story */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-today"))}
          className="flex flex-col items-center gap-1 w-16 shrink-0"
        >
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-background">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <span className="text-xs">Your Today</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const cf = window.confirm("Close friends only? (Tap Cancel for everyone)");
              const extend = me?.subscription_tier === "plus"
                ? window.confirm("Extend to 48h (Plus)? Cancel for standard 24h.")
                : false;
              onUpload(f, cf, extend);
              e.target.value = "";
            }
          }}
        />
        {stories?.map((s) => (
          <Ring key={s.user_id} path={s.profiles?.avatar_url} viewed={false} username={s.profiles?.username ?? ""} />
        ))}
      </div>
    </div>
  );
}