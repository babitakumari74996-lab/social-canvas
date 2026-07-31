import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";

const TABS = ["Requests", "Suggestions", "All Friends"] as const;
type Tab = (typeof TABS)[number];

export function FriendsPanel() {
  const [tab, setTab] = useState<Tab>("Requests");
  const { data: me } = useMyProfile();
  const qc = useQueryClient();

  const { data: followers } = useQuery({
    queryKey: ["followers", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select(
          "follower_id, profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)",
        )
        .eq("following_id", me!.id);
      return data ?? [];
    },
  });

  const { data: following } = useQuery({
    queryKey: ["following", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", me!.id);
      return (data ?? []).map((f) => f.following_id);
    },
  });

  const { data: suggestions } = useQuery({
    queryKey: ["suggestions", me?.id, following],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", me!.id)
        .limit(30);
      const followingSet = new Set(following ?? []);
      return (data ?? []).filter((p) => !followingSet.has(p.id));
    },
  });

  const followingSet = new Set(following ?? []);
  const requests = (followers ?? []).filter((f) => !followingSet.has(f.follower_id));
  const mutuals = (followers ?? []).filter((f) => followingSet.has(f.follower_id));

  const confirm = async (userId: string) => {
    if (!me) return;
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: me.id, following_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Friend added");
    qc.invalidateQueries({ queryKey: ["following", me.id] });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1.5 border-b border-border mb-4 overflow-x-auto no-scrollbar shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {tab === "Requests" && (
          <>
            {requests.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No friend requests.</p>
            )}
            {requests.map((r) => (
              <div
                key={r.follower_id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
              >
                <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                  {r.profiles?.avatar_url && (
                    <img
                      src={r.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.profiles?.display_name ?? r.profiles?.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{r.profiles?.username}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => confirm(r.follower_id)}
                >
                  <Check className="h-3 w-3 mr-0.5" /> Confirm
                </Button>
              </div>
            ))}
          </>
        )}
        {tab === "Suggestions" && (
          <>
            {suggestions?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No suggestions right now.
              </p>
            )}
            {suggestions?.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                  {p.avatar_url && (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.display_name ?? p.username}</div>
                  <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2"
                  onClick={() => confirm(p.id)}
                >
                  <UserPlus className="h-3 w-3 mr-0.5" /> Add
                </Button>
              </div>
            ))}
          </>
        )}
        {tab === "All Friends" && (
          <>
            {mutuals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No friends yet.</p>
            )}
            {mutuals.map((r) => (
              <div
                key={r.follower_id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
              >
                <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                  {r.profiles?.avatar_url && (
                    <img
                      src={r.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.profiles?.display_name ?? r.profiles?.username}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{r.profiles?.username}
                  </div>
                </div>
                <span className="text-primary text-xs flex items-center gap-1 shrink-0">
                  <UserCheck className="h-3 w-3" /> Friends
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
