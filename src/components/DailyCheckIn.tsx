import { useState, useRef } from "react";
import { Smile, Target, Coffee, Heart, Zap, Sparkles, Plus } from "lucide-react";
import { useMyProfile, useSession } from "@/lib/auth";
import { useSignedUrl } from "@/lib/media";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const RANDOM_AVATARS = [
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face",
];

const MOODS = [
  { icon: Smile, label: "Happy", color: "amber" },
  { icon: Target, label: "Focused", color: "blue" },
  { icon: Coffee, label: "Chill", color: "teal" },
  { icon: Heart, label: "Grateful", color: "rose" },
  { icon: Zap, label: "Energetic", color: "orange" },
];

const MOOD_COLORS: Record<string, { active: string; inactive: string }> = {
  amber: {
    active: "bg-amber-500 text-white shadow-sm scale-110 ring-2 ring-amber-300",
    inactive: "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 hover:ring-1 hover:ring-amber-300",
  },
  blue: {
    active: "bg-blue-500 text-white shadow-sm scale-110 ring-2 ring-blue-300",
    inactive: "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:ring-1 hover:ring-blue-300",
  },
  teal: {
    active: "bg-teal-500 text-white shadow-sm scale-110 ring-2 ring-teal-300",
    inactive: "bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-100 hover:ring-1 hover:ring-teal-300",
  },
  rose: {
    active: "bg-rose-500 text-white shadow-sm scale-110 ring-2 ring-rose-300",
    inactive: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:ring-1 hover:ring-rose-300",
  },
  orange: {
    active: "bg-orange-500 text-white shadow-sm scale-110 ring-2 ring-orange-300",
    inactive: "bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:ring-1 hover:ring-orange-300",
  },
};

const GRADIENTS: Record<string, string> = {
  morning:
    "from-orange-50/80 via-amber-50/40 to-background dark:from-orange-900/40 dark:via-amber-900/20 dark:to-background",
  afternoon: "from-sky-50/80 via-blue-50/30 to-background dark:from-sky-900/35 dark:via-blue-900/20 dark:to-background",
  evening:
    "from-indigo-50/70 via-violet-50/30 to-background dark:from-indigo-900/35 dark:via-violet-900/25 dark:to-background",
};

function getTimePeriod(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const GREETINGS: Record<string, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

const EMOJIS: Record<string, string> = {
  morning: "☀️",
  afternoon: "🌤️",
  evening: "🌙",
};

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

export function DailyCheckIn() {
  const { data: profile } = useMyProfile();
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [burstMood, setBurstMood] = useState<string | null>(null);
  const period = getTimePeriod();
  const { userId } = useSession();

  const handleMood = (label: string) => {
    navigator.vibrate?.(12);
    setSelectedMood(label);
    setBurstMood(label);
    setTimeout(() => setBurstMood(null), 400);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-today"));
    }, 280);
  };

  return (
    <div className={`relative card-social overflow-hidden bg-gradient-to-br ${GRADIENTS[period]}`}>
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15 flex items-center justify-center overflow-hidden shrink-0">
                {avatar.data ? (
                  <img src={avatar.data} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary/60">
                    {profile?.username?.[0]?.toUpperCase() ?? "U"}
                  </span>
                )}
              </div>
              <span className="absolute -top-0.5 -right-0.5 text-[10px]">{EMOJIS[period]}</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                {GREETINGS[period]}, {profile?.display_name ?? profile?.username ?? "there"}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 lg:hidden">
                How are you feeling Today...
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 hidden lg:block">
                How are you feeling Today? Share it to your friends.
              </p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary/40 shrink-0" strokeWidth={1.5} />
        </div>
      </div>

      {/* Streak badge + Today's preview */}
      <div className="px-4 pb-2"></div>

      <div className="px-4 pb-2">
        <div className="flex items-center justify-between gap-1.5">
          {MOODS.map((mood, i) => {
            const isSelected = selectedMood === mood.label;
            const isBursting = burstMood === mood.label;
            return (
              <button
                key={mood.label}
                onClick={() => handleMood(mood.label)}
                className={`
                  group relative flex flex-col items-center gap-1 flex-1
                  min-h-[44px] min-w-[44px]
                  active:scale-[0.96] transition-transform duration-150 ease-out
                  cursor-pointer
                `}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span
                  className={`
                    relative h-9 w-9 rounded-xl flex items-center justify-center
                    ring-1 transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isSelected
                      ? MOOD_COLORS[mood.color].active
                      : MOOD_COLORS[mood.color].inactive
                    }
                  `}
                >
                  <mood.icon
                    className={`
                      h-[18px] w-[18px] transition-all duration-200
                      ${isSelected ? "scale-110" : "group-hover:scale-110"}
                      ${isBursting ? "animate-heart-burst" : ""}
                    `}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background animate-scale-in" />
                  )}
                </span>
                <span
                  className={`
                    text-[9px] font-medium leading-tight transition-colors duration-200
                    ${isSelected ? "text-foreground font-semibold" : "text-muted-foreground/60 group-hover:text-muted-foreground"}
                  `}
                >
                  {mood.label}
                </span>
              </button>
            );
          })}
      </div>
    </div>
    </div>
  );
}

export function StoriesTray() {
  const [expanded, setExpanded] = useState(false);
  const { data: profile } = useMyProfile();
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);
  const { userId } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: stories } = useQuery({
    queryKey: ["stories-tray", userId, profile?.close_friends],
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
        extend && profile?.subscription_tier === "plus"
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
    <>
    <div className="px-1 pb-1.5">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-today"))}
          className="flex flex-col items-center gap-2 w-22 shrink-0 group"
        >
          <div className="h-20 w-20 rounded-full border-2 border-dashed border-border/40 flex items-center justify-center bg-muted/15 group-hover:bg-muted/30 transition-all group-hover:border-border/60 relative">
            <Plus className="h-8 w-8 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" strokeWidth={1.5} />
            <Sparkles
              className="absolute -top-0.5 -right-0.5 h-6 w-6 text-amber-500/90"
              strokeWidth={2}
            />
          </div>
            <span className="text-[11px] text-muted-foreground/60 text-center leading-tight group-hover:text-muted-foreground transition-colors truncate max-w-22">
            {profile?.display_name ?? profile?.username ?? "Today"}
          </span>
        </button>
        {RANDOM_AVATARS.slice(1).map((url, i) => (
          <button
            key={i}
            onClick={() => window.dispatchEvent(new CustomEvent("open-today"))}
            className="flex flex-col items-center gap-2 w-22 shrink-0 group"
          >
            <div className="h-[82px] w-[82px] rounded-full bg-gradient-to-tr from-primary via-blue-400 to-violet-500 p-[3px] group-hover:brightness-110 transition-all">
              <div className="rounded-full h-full w-full bg-background p-[3px]">
                <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  <img src={url} alt="" className="h-full w-full rounded-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                </div>
              </div>
            </div>
          <span className="text-[11px] text-muted-foreground/60 text-center leading-tight group-hover:text-muted-foreground transition-colors truncate max-w-22">
              User {i + 1}
            </span>
          </button>
        ))}
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
                profile?.subscription_tier === "plus"
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
    <div className="pl-4">
      <p className={`text-base text-foreground/85 leading-relaxed ${!expanded ? "line-clamp-2" : ""}`}>
        ▣ Did you know Rahul gone Goa yesterday with his family as you can see in his post. He went to Juhu Beach in Goa, enjoying the sunset with his loved ones. The post shows him relaxing by the shore, capturing some beautiful moments. Looks like he's having an amazing time on this family trip, making memories that will last forever.
      </p>
      {expanded ? (
        <button onClick={() => setExpanded(false)} className="text-xs text-blue-500/70 hover:text-blue-500 mt-0.5 transition-colors">
          Show less
        </button>
      ) : (
        <button onClick={() => setExpanded(true)} className="text-xs text-blue-500/70 hover:text-blue-500 mt-0.5 transition-colors">
          Read more
        </button>
      )}
    </div>
    </>
  );
}

