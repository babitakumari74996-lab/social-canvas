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
 * The avatar sits on the left. The slot next to it alternates every 3 seconds between
 * the mood emojis (sliding in from the right) and the type bar (sliding in from the right).
 * While the user is typing, the type bar stays on screen.
 * Sharing needs a mood and a note.
 */
export function MoodBox() {
  const me = useMe();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [focused, setFocused] = useState(false);
  const [tick, setTick] = useState(0);

  const editing = focused || note.length > 0;
  const showBar = editing || tick % 2 === 1;
  const canSubmit = !!mood && note.trim().length > 0;

  // Switch the slot every 3 seconds, unless the user is typing.
  useEffect(() => {
    if (editing) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 3000);
    return () => window.clearInterval(t);
  }, [editing]);

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

        {showBar ? (
          <div
            key={`bar-${tick}`}
            className="mood-slide-in flex flex-1 min-w-0 items-center gap-2 rounded-full bg-muted/60 px-4 py-3"
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
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
        ) : (
          <div
            key={`emojis-${tick}`}
            className="mood-slide-in flex flex-1 min-w-0 items-center justify-around rounded-full bg-muted/60 px-3 py-3"
          >
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
                  className={`flex items-center justify-center rounded-full px-1.5 py-0.5 text-2xl leading-none transition-transform active:scale-90 ${
                    active ? "bg-primary/15 ring-2 ring-primary" : ""
                  }`}
                >
                  {m.emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
