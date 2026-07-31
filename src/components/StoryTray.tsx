import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyProfile } from "@/lib/auth";
import { useSignedUrl } from "@/lib/media";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useRef } from "react";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePlus } from "./PlusModal";

function StoryRing({ path, username }: { path: string | null | undefined; username: string }) {
  const { data } = useSignedUrl(path ?? undefined);
  return (
    <Link
      to="/story/$username"
      params={{ username }}
      className="flex flex-col items-center gap-1 w-16 shrink-0 group"
    >
      <div className="relative">
        <div className="rounded-full p-[2.5px] bg-gradient-to-tr from-primary via-blue-400 to-violet-500 group-hover:brightness-110 transition-all">
          <div className="bg-background rounded-full p-[2.5px]">
            {data ? (
              <img
                src={data}
                alt=""
                className="h-14 w-14 rounded-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted group-hover:scale-105 transition-transform duration-200" />
            )}
          </div>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-500 border-[2.5px] border-background" />
      </div>
      <span className="text-[10px] truncate w-full text-center text-muted-foreground/80 group-hover:text-foreground transition-colors leading-tight">
        {username}
      </span>
    </Link>
  );
}

export function StoryTray() {
  const { userId } = useSession();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { requirePlus } = usePlus();
  const avatar = useSignedUrl(me?.avatar_url ?? undefined);
  const { data: stories } = useQuery({
    queryKey: ["stories-tray", userId, me?.close_friends],
    queryFn: async () => {
      if (!userId) return [];
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      const ids = [userId, ...(follows?.map((f) => f.following_id) ?? [])];
      const { data } = await supabase
        .from("stories")
        .select(
          "id, user_id, media_url, close_friend_only, created_at, expires_at, extended_until, profiles(username, avatar_url, close_friends)",
        )
        .in("user_id", ids)
        .order("created_at", { ascending: false });
      const active = (data ?? []).filter(
        (s) => new Date(s.extended_until ?? s.expires_at) > new Date(),
      );
      const visible = active.filter((s) => {
        if (!s.close_friend_only) return true;
        if (s.user_id === userId) return true;
        return (s.profiles?.close_friends ?? []).includes(userId);
      });
      const byUser = new Map<string, (typeof visible)[number]>();
      for (const s of visible) if (!byUser.has(s.user_id)) byUser.set(s.user_id, s);
      return Array.from(byUser.values());
    },
    enabled: !!userId,
  });

  const onUpload = async (file: File, closeFriendsOnly: boolean, extend: boolean) => {
    if (!userId) return;
    try {
      const path = await uploadMedia(userId, file);
      const extended_until =
        extend && me?.subscription_tier === "plus"
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
    <div className="card-social py-3 px-1">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-today"))}
          className="flex flex-col items-center gap-1 w-16 shrink-0 group"
        >
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center bg-muted/30 group-hover:bg-muted/60 transition-all group-hover:border-border relative">
            {avatar.data ? (
              <img src={avatar.data} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary/60">
                {me?.username?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
            <Sparkles
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-amber-500/80"
              strokeWidth={2}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60 text-center leading-tight group-hover:text-muted-foreground transition-colors truncate max-w-16">
            {me?.display_name ?? me?.username ?? "Today"}
          </span>
        </button>
        <div className="h-px bg-border/40 self-stretch my-1 mx-1.5" />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              const cf = window.confirm("Close friends only? (Tap Cancel for everyone)");
              const extend =
                me?.subscription_tier === "plus"
                  ? window.confirm("Extend to 48h (Plus)? Cancel for standard 24h.")
                  : false;
              onUpload(f, cf, extend);
              e.target.value = "";
            }
          }}
        />
        {stories?.map((s) => (
          <StoryRing
            key={s.user_id}
            path={s.profiles?.avatar_url}
            username={s.profiles?.username ?? ""}
          />
        ))}
      </div>
    </div>
  );
}
