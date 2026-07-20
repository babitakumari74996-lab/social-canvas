import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/friends")({
  component: FriendsPage,
});

const TABS = ["Requests", "Suggestions", "All Friends", "Custom Lists"] as const;
type Tab = (typeof TABS)[number];

function FriendsPage() {
  const [tab, setTab] = useState<Tab>("Requests");
  const { data: me } = useMyProfile();
  const qc = useQueryClient();

  const { data: followers } = useQuery({
    queryKey: ["followers", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)").eq("following_id", me!.id);
      return data ?? [];
    },
  });
  const { data: following } = useQuery({
    queryKey: ["following", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", me!.id);
      return (data ?? []).map((f) => f.following_id);
    },
  });
  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", me?.id, following],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url").neq("id", me!.id).limit(30);
      const followingSet = new Set(following ?? []);
      return (data ?? []).filter((p) => !followingSet.has(p.id));
    },
  });

  const followingSet = new Set(following ?? []);
  const requests = (followers ?? []).filter((f) => !followingSet.has(f.follower_id));
  const mutuals = (followers ?? []).filter((f) => followingSet.has(f.follower_id));

  const confirm = async (userId: string) => {
    if (!me) return;
    const { error } = await supabase.from("follows").insert({ follower_id: me.id, following_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Friend added");
    qc.invalidateQueries({ queryKey: ["following", me.id] });
  };

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-6 py-4">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>
      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >{t}</button>
        ))}
      </div>

      {tab === "Requests" && (
        <div className="space-y-2">
          {requests.length === 0 && <p className="text-sm text-muted-foreground">No friend requests.</p>}
          {requests.map((r) => (
            <FriendRow key={r.follower_id} profile={r.profiles} action={<Button size="sm" onClick={() => confirm(r.follower_id)}><Check className="h-4 w-4 mr-1" /> Confirm</Button>} />
          ))}
        </div>
      )}
      {tab === "Suggestions" && (
        <div className="space-y-2">
          {suggestions?.length === 0 && <p className="text-sm text-muted-foreground">No suggestions right now.</p>}
          {suggestions?.map((p) => (
            <FriendRow key={p.id} profile={p} action={<Button size="sm" variant="outline" onClick={() => confirm(p.id)}><UserPlus className="h-4 w-4 mr-1" /> Add</Button>} />
          ))}
        </div>
      )}
      {tab === "All Friends" && (
        <div className="space-y-2">
          {mutuals.length === 0 && <p className="text-sm text-muted-foreground">No friends yet.</p>}
          {mutuals.map((r) => (
            <FriendRow key={r.follower_id} profile={r.profiles} action={<span className="text-primary text-sm flex items-center gap-1"><UserCheck className="h-4 w-4" /> Friends</span>} />
          ))}
        </div>
      )}
      {tab === "Custom Lists" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card-flat p-4">
            <div className="font-semibold">Close Friends</div>
            <div className="text-xs text-muted-foreground mt-1">{me?.close_friends?.length ?? 0} members</div>
          </div>
          <div className="card-flat p-4">
            <div className="font-semibold">Work</div>
            <div className="text-xs text-muted-foreground mt-1">0 members</div>
          </div>
          <div className="card-flat p-4">
            <div className="font-semibold">Family</div>
            <div className="text-xs text-muted-foreground mt-1">0 members</div>
          </div>
        </div>
      )}
    </div>
  );
}

type ProfileRef = { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
function FriendRow({ profile, action }: { profile: ProfileRef; action: React.ReactNode }) {
  if (!profile) return null;
  return (
    <div className="card-flat p-3 flex items-center gap-3">
      <div className="h-11 w-11 rounded-full bg-muted overflow-hidden">
        {profile.avatar_url && <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />}
      </div>
      <Link to="/profile/$username" params={{ username: profile.username }} className="flex-1 min-w-0">
        <div className="font-medium truncate">{profile.display_name ?? profile.username}</div>
        <div className="text-xs text-muted-foreground truncate">@{profile.username}</div>
      </Link>
      {action}
    </div>
  );
}