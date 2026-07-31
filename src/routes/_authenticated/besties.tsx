import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Heart, UserCheck, UserPlus, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/besties")({
  component: BestiesPage,
});

const TABS = ["Friends", "Relationship", "Others"] as const;
type Tab = (typeof TABS)[number];

function BestiesPage() {
  const [tab, setTab] = useState<Tab>("Friends");
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
    <div className="max-w-3xl mx-auto px-3 md:px-6 py-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
          <Heart className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Besties</h1>
          <p className="text-sm text-muted-foreground">Your inner circle</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t
                ? "border-blue-400 text-blue-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "Friends" && <UserCheck className="h-4 w-4 inline mr-1.5" />}
            {t === "Relationship" && <Heart className="h-4 w-4 inline mr-1.5" />}
            {t === "Others" && <Sparkles className="h-4 w-4 inline mr-1.5" />}
            {t}
          </button>
        ))}
      </div>

      {tab === "Friends" && (
        <div>
          {mutuals.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No besties yet. Start connecting!</p>
            </div>
          )}
          <div className="space-y-2">
            {mutuals.map((r) => (
              <BestieRow
                key={r.follower_id}
                profile={r.profiles}
                badge="Bestie"
                action={
                  <span className="text-blue-400 text-sm flex items-center gap-1">
                    <UserCheck className="h-4 w-4" /> Friends
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}

      {tab === "Relationship" && (
        <div>
          <div className="card-flat p-6 text-center mb-4">
            <Heart className="h-10 w-10 mx-auto mb-2 text-blue-400" />
            <h3 className="font-semibold text-lg">Relationship Status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set your relationship status to find people who match.
            </p>
            <Button
              variant="outline"
              className="mt-3 border-blue-200 text-blue-500 hover:bg-blue-50"
              onClick={() => toast.info("Coming soon!")}
            >
              Update Status
            </Button>
          </div>
          {requests.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                People interested in you
              </h4>
              <div className="space-y-2">
                {requests.map((r) => (
                  <BestieRow
                    key={r.follower_id}
                    profile={r.profiles}
                    badge="Interested"
                    action={
                      <Button size="sm" onClick={() => confirm(r.follower_id)}>
                        <Heart className="h-4 w-4 mr-1" /> Match
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Others" && (
        <div>
          {(!suggestions || suggestions.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No suggestions right now.</p>
            </div>
          )}
          <div className="space-y-2">
            {suggestions?.map((p) => (
              <BestieRow
                key={p.id}
                profile={p}
                badge="Suggested"
                action={
                  <Button size="sm" variant="outline" onClick={() => confirm(p.id)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type ProfileRef = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
} | null;

function BestieRow({
  profile,
  badge,
  action,
}: {
  profile: ProfileRef;
  badge: string;
  action: React.ReactNode;
}) {
  if (!profile) return null;
  return (
    <div className="card-flat p-3 flex items-center gap-3">
      <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0">
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <Link
        to="/profile/$username"
        params={{ username: profile.username }}
        className="flex-1 min-w-0"
      >
        <div className="font-medium truncate">{profile.display_name ?? profile.username}</div>
        <div className="text-xs text-muted-foreground truncate">@{profile.username}</div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-medium text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
          {badge}
        </span>
        {action}
      </div>
    </div>
  );
}
