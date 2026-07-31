import { Sparkles, Smile, Target, Coffee, Heart, Zap } from "lucide-react";
import { useMyProfile } from "@/lib/auth";
import { useSignedUrl } from "@/lib/media";

const MOODS = [
  {
    icon: Smile,
    emoji: "✨",
    label: "Happy",
    color: "text-primary bg-primary/10 dark:bg-primary/10",
  },
  {
    icon: Target,
    emoji: "💪",
    label: "Focused",
    color: "text-teal-500 bg-teal-50 dark:bg-teal-50/10",
  },
  {
    icon: Coffee,
    emoji: "😌",
    label: "Chill",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-50/10",
  },
  {
    icon: Heart,
    emoji: "🙏",
    label: "Grateful",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-50/10",
  },
  {
    icon: Zap,
    emoji: "⚡",
    label: "Energetic",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-50/10",
  },
];

interface TodayMoment {
  text: string;
  mood?: string;
}

interface TodayCardProps {
  moment?: TodayMoment | null;
  variant?: "full" | "compact";
}

export function TodayCard({ moment, variant = "full" }: TodayCardProps) {
  const { data: profile } = useMyProfile();
  const avatar = useSignedUrl(profile?.avatar_url ?? undefined);
  const hasPosted = !!moment;
  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent("open-today"));
  };

  const moodEmoji = hasPosted ? (MOODS.find((m) => m.label === moment.mood)?.emoji ?? "✨") : "✨";

  if (variant === "compact") {
    return (
      <button
        onClick={handleOpen}
        className="flex flex-col items-center gap-1 w-[68px] shrink-0 group pt-1"
      >
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 active:scale-95 transition-all duration-200">
          {hasPosted ? (
            <span className="text-xl">{moodEmoji}</span>
          ) : (
            <>
              <Sparkles
                className="h-5 w-5 text-primary/50 group-hover:text-primary transition-colors"
                strokeWidth={1.5}
              />
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
            </>
          )}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 text-center leading-tight group-hover:text-muted-foreground transition-colors truncate max-w-16">
          {profile?.display_name ?? profile?.username ?? "Today"}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={handleOpen}
      className="card-social p-4 cursor-pointer group active:scale-[0.99] transition-all duration-200 hover:shadow-md hover:border-primary/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {avatar.data ? (
              <img src={avatar.data} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary/60">
                {profile?.username?.[0]?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>
        </div>
        {!hasPosted && <Sparkles className="h-3.5 w-3.5 text-amber-500/60" strokeWidth={1.5} />}
      </div>

      {hasPosted ? (
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5 shrink-0">{moodEmoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug text-foreground/90">{moment.text}</p>
            {moment.mood && (
              <span className="inline-flex items-center mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {moment.mood}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0 mt-1">
            →
          </span>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground/60 leading-relaxed pt-[0.2rem]">
            What's your vibe today?
          </p>
          <div className="grid grid-cols-5 gap-0.5 shrink-0">
            {MOODS.map((mood) => (
              <button
                key={mood.label}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
                className="grid place-items-center h-7 w-9 rounded-lg hover:bg-muted/70 active:scale-95 transition-all duration-200 cursor-pointer group/mood"
              >
                <span className={`h-5 w-5 grid place-items-center rounded ${mood.color}`}>
                  <mood.icon className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
