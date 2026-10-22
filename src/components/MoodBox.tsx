import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "tired", emoji: "🥱", label: "Tired" },
  { id: "hyped", emoji: "🔥", label: "Hyped" },
];

/**
 * "What's your mood today?" composer under the stories row.
 * The avatar and type bar sit on one row. The mood emojis slide in inside the type bar.
 * Sharing needs a mood and a note.
 */
export function MoodBox() {
  const me = useMe();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const canSubmit = !!mood && note.trim().length > 0;

  // Re-keying the emoji row every 3 seconds replays the slide-in from the right.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 3000);
    return () => window.clearInterval(t);
  }, []);

  const submit = () => {
    if (!canSubmit) return;
    const picked = MOODS.find((m) => m.id === mood);
    toast(`Mood shared: ${picked?.emoji ?? ""} ${picked?.label ?? ""}`);
    setMood(null);
    setNote("");
  };

  return (
    <div className="px-3 pb-2 pt-4 border-t border-border">
      <div className="flex items-center gap-3">
        <Avatar path={me?.avatar_url} alt={me?.username ?? "me"} size={46} className="shrink-0" />
        {/* type bar: the mood emojis slide in from the right inside this bar every 3 seconds */}
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-full bg-muted/60 px-3 py-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={280}
            placeholder="What's your mood today?"
            className="flex-1 min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {canSubmit && (
            <button type="button" onClick={submit} className="text-sm font-semibold text-primary">
              Share
            </button>
          )}
          <div key={tick} className="mood-slide-in flex shrink-0 items-center gap-1">
            {MOODS.map((m) => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  aria-label={m.label}
                  aria-pressed={active}
                  onClick={() => setMood(m.id)}
                  className={`flex items-center justify-center rounded-full px-1 text-xl leading-none transition-transform active:scale-90 ${
                    active ? "bg-primary/15 ring-2 ring-primary" : ""
                  }`}
                >
                  {m.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
