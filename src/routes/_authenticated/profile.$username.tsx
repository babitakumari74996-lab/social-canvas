import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyProfile } from "@/lib/auth";
import { useSignedUrl, uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Sparkles, Pin, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { usePlus } from "@/components/PlusModal";

export const Route = createFileRoute("/_authenticated/profile/$username")({
  component: ProfilePage,
});

function GridImg({ path, pinned }: { path: string; pinned?: boolean }) {
  const { data } = useSignedUrl(path);
  return (
    <div className="aspect-square bg-muted overflow-hidden relative">
      {data && <img src={data} alt="" className="w-full h-full object-cover" />}
      {pinned && <Pin className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow" fill="currentColor" />}
    </div>
  );
}

function ProfilePage() {
  const { username } = Route.useParams();
  const { userId } = useSession();
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const avatarInput = useRef<HTMLInputElement>(null);
  const { requirePlus } = usePlus();

  const { data: profile } = useQuery({
    queryKey: ["profile-by-username", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });

  const isMe = profile?.id === userId;

  const { data: posts } = useQuery({
    queryKey: ["user-posts", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await supabase.from("posts").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: pins } = useQuery({
    queryKey: ["user-pins", profile?.id],
    queryFn: async () => {
      if (!profile) return new Set<string>();
      const { data } = await supabase.from("pinned_posts").select("post_id").eq("user_id", profile.id);
      return new Set((data ?? []).map((p) => p.post_id));
    },
    enabled: !!profile,
  });

  const { data: counts } = useQuery({
    queryKey: ["profile-counts", profile?.id],
    queryFn: async () => {
      if (!profile) return null;
      const [{ count: followers }, { count: following }, { count: postCount }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile.id),
      ]);
      return { followers: followers ?? 0, following: following ?? 0, posts: postCount ?? 0 };
    },
    enabled: !!profile,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", userId, profile?.id],
    queryFn: async () => {
      if (!userId || !profile || userId === profile.id) return false;
      const { data } = await supabase.from("follows").select("*").eq("follower_id", userId).eq("following_id", profile.id).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !!profile,
  });

  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);

  const toggleFollow = async () => {
    if (!userId || !profile) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", profile.id);
    } else {
      await supabase.from("follows").insert({ follower_id: userId, following_id: profile.id });
    }
    qc.invalidateQueries({ queryKey: ["is-following"] });
    qc.invalidateQueries({ queryKey: ["profile-counts"] });
  };

  const toggleMute = async () => {
    if (!me || !profile) return;
    const muted = new Set(me.muted_users ?? []);
    if (muted.has(profile.id)) muted.delete(profile.id);
    else muted.add(profile.id);
    await supabase.from("profiles").update({ muted_users: Array.from(muted) }).eq("id", me.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
    toast.success(muted.has(profile.id) ? "Muted" : "Unmuted");
  };

  const toggleCloseFriend = async () => {
    if (!me || !profile) return;
    const cf = new Set(me.close_friends ?? []);
    if (cf.has(profile.id)) cf.delete(profile.id);
    else cf.add(profile.id);
    await supabase.from("profiles").update({ close_friends: Array.from(cf) }).eq("id", me.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success(cf.has(profile.id) ? "Added to close friends" : "Removed from close friends");
  };

  const togglePin = async (postId: string) => {
    if (!me) return;
    const cap = me.subscription_tier === "plus" ? 6 : 3;
    if (pins?.has(postId)) {
      await supabase.from("pinned_posts").delete().eq("user_id", me.id).eq("post_id", postId);
    } else {
      if ((pins?.size ?? 0) >= cap) {
        if (me.subscription_tier !== "plus") {
          requirePlus("Pin more than 3 posts");
          return;
        }
        toast.error(`Max ${cap} pinned posts.`);
        return;
      }
      await supabase.from("pinned_posts").insert({ user_id: me.id, post_id: postId });
    }
    qc.invalidateQueries({ queryKey: ["user-pins", profile?.id] });
  };

  const uploadAvatar = async (file: File) => {
    if (!me) return;
    try {
      const path = await uploadMedia(me.id, file);
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", me.id);
      qc.invalidateQueries();
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  if (!profile) {
    return <div className="p-10 text-center text-muted-foreground">Loading profile…</div>;
  }

  const sorted = (posts ?? []).slice().sort((a, b) => {
    const ap = pins?.has(a.id) ? 1 : 0;
    const bp = pins?.has(b.id) ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto px-3 md:px-6 py-4">
      <header className="flex items-start gap-4 md:gap-8 mb-6">
        <button onClick={() => isMe && avatarInput.current?.click()} className="shrink-0">
          {avatar.data ? (
            <img src={avatar.data} alt="" className="h-20 w-20 md:h-28 md:w-28 rounded-full object-cover" />
          ) : (
            <div className="h-20 w-20 md:h-28 md:w-28 rounded-full bg-muted" />
          )}
        </button>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadAvatar(f);
            e.target.value = "";
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold">@{profile.username}</h1>
            {profile.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            {profile.subscription_tier === "plus" && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Plus
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <span><b>{counts?.posts ?? 0}</b> posts</span>
            <span><b>{counts?.followers ?? 0}</b> followers</span>
            <span><b>{counts?.following ?? 0}</b> following</span>
          </div>
          {profile.display_name && <div className="mt-2 font-medium text-sm">{profile.display_name}</div>}
          {profile.bio && <div className="text-sm text-muted-foreground whitespace-pre-line">{profile.bio}</div>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {isMe ? (
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/settings" })}>Edit profile</Button>
            ) : (
              <>
                <Button size="sm" onClick={toggleFollow}>{isFollowing ? "Following" : "Follow"}</Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/dm/$userId", params: { userId: profile.id } })}>
                  Message
                </Button>
                <Button size="sm" variant="ghost" onClick={toggleMute}>
                  {me?.muted_users?.includes(profile.id) ? "Unmute" : "Mute"}
                </Button>
                <Button size="sm" variant="ghost" onClick={toggleCloseFriend}>
                  {me?.close_friends?.includes(profile.id) ? "★ Close friend" : "Add to close friends"}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-1">
        {sorted.map((p) => (
          <div key={p.id} className="relative group">
            {p.media_urls[0] && <GridImg path={p.media_urls[0]} pinned={pins?.has(p.id)} />}
            {isMe && (
              <button
                onClick={() => togglePin(p.id)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity text-xs"
              >
                {pins?.has(p.id) ? "Unpin" : "Pin"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}