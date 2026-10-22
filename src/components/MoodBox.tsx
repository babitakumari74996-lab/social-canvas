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
 * The avatar and type bar sit on one row, and the mood emojis fill the row below.
 * Sharing needs a mood and a note.
 */
export function MoodBox() {
  const me = useMe();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const canSubmit = !!mood && note.trim().length > 0;

  // Slider: advance to the next mood every 3 seconds.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % MOODS.length), 3000);
    return () => window.clearInterval(t);
  }, []);
  const m = MOODS[idx];

  const submit = () => {
    if (!canSubmit) return;
    const picked = MOODS.find((m) => m.id === mood);
    toast(`Mood shared: ${picked?.emoji ?? ""} ${picked?.label ?? ""}`);
    setMood(null);
    setNote("");
  };

  return (
    <div className="px-3 pb-2 pt-4 border-t border-border">
      {/* avatar and type bar, separate */}
      <div className="flex items-center gap-3">
        <Avatar path={me?.avatar_url} alt={me?.username ?? "me"} size={46} className="shrink-0" />
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-full bg-muted/60 px-4 py-3">
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
        </div>
      </div>

      {/* moods fill the full row below */}
      {/* mood slider: one mood slides in from the right every 3 seconds */}
      <div className="mt-3 overflow-hidden rounded-2xl">
        <button
          key={`${m.id}-${idx}`}
          type="button"
          aria-pressed={mood === m.id}
          onClick={() => setMood(m.id)}
          className={`mood-slide-in flex w-full items-center justify-center gap-2 rounded-2xl py-2 transition-colors ${
            mood === m.id ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/60"
          }`}
        >
          <span className="text-2xl leading-none">{m.emoji}</span>
          <span className="text-sm font-medium">{m.label}</span>
        </button>
      </div>

    </div>
  );
}
