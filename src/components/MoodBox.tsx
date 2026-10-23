import { useEffect, useRef, useState } from "react";
import { ImagePlus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "tired", emoji: "🥱", label: "Tired" },
  { id: "hyped", emoji: "🔥", label: "Hyped" },
];

type Attachment = { id: string; file: File; url: string; kind: "image" | "video" };

/**
 * "What's your mood today?" composer under the stories row.
 * The slot next to the avatar alternates every 3 seconds between the mood emojis and
 * the type bar. Tapping an emoji or the type bar opens a dialog with the chosen mood,
 * a note, and photo/video attachments. Sharing needs a mood plus a note, photo or video.
 */
export function MoodBox() {
  const me = useMe();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const showBar = open || tick % 2 === 1;
  const canSubmit = !!mood && (note.trim().length > 0 || files.length > 0);
  const picked = MOODS.find((m) => m.id === mood);

  // Switch the slot every 3 seconds, but pause while the dialog is open.
  useEffect(() => {
    if (open) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 3000);
    return () => window.clearInterval(t);
  }, [open]);

  // Revoke preview URLs on unmount.
  const filesRef = useRef<Attachment[]>([]);
  filesRef.current = files;
  useEffect(() => {
    return () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url));
  }, []);

  const openWith = (id: string | null) => {
    if (id) setMood(id);
    setOpen(true);
  };

  const addFiles = (list: FileList | null, kind: "image" | "video") => {
    if (!list || list.length === 0) return;
    const next = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
      kind,
    }));
    setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const share = () => {
    if (!canSubmit) return;
    toast(`Mood shared: ${picked?.emoji ?? ""} ${picked?.label ?? ""}`);
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
    setNote("");
    setMood(null);
    if (imageInput.current) imageInput.current.value = "";
    if (videoInput.current) videoInput.current.value = "";
    setOpen(false);
  };

  return (
    <div className="px-3 pb-2 pt-4 border-t border-border">
      <div className="flex items-center gap-3">
        <Avatar path={me?.avatar_url} alt={me?.username ?? "me"} size={46} className="shrink-0" />

        {showBar ? (
          <button
            key={`bar-${tick}`}
            type="button"
            onClick={() => openWith(mood)}
            className={`${tick > 0 ? "mood-slide-in " : ""}flex h-14 flex-1 min-w-0 items-center gap-2 rounded-full bg-muted/60 px-4 text-left`}
          >
            <span className="flex-1 min-w-0 truncate text-base text-muted-foreground">
              What's your mood today?
            </span>
          </button>
        ) : (
          <div
            key={`emojis-${tick}`}
            className={`${tick > 0 ? "mood-slide-in " : ""}flex h-14 flex-1 min-w-0 items-center justify-around rounded-full bg-muted/60 px-3`}
          >
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.label}
                aria-label={m.label}
                onClick={() => openWith(m.id)}
                className="flex items-center justify-center rounded-full px-1.5 py-0.5 text-2xl leading-none transition-transform active:scale-90"
              >
                {m.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What's your mood today?</DialogTitle>
            <DialogDescription>Pick a mood, then add a note, a photo or a video.</DialogDescription>
          </DialogHeader>

          {/* selected mood */}
          <div className="grid grid-cols-4 gap-2">
            {MOODS.map((m) => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMood(m.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 transition-transform active:scale-95 ${
                    active ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/60 hover:bg-muted"
                  }`}
                >
                  <span className="text-3xl leading-none">{m.emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                </button>
              );
            })}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="Add a note…"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-muted"
            >
              <ImagePlus className="h-4 w-4 text-emerald-600" /> Photo
            </button>
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-muted"
            >
              <Video className="h-4 w-4 text-red-500" /> Video
            </button>
            <input
              ref={imageInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files, "image")}
            />
            <input
              ref={videoInput}
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files, "video")}
            />
          </div>

          {files.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {files.map((f) => (
                <div key={f.id} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                  {f.kind === "image" ? (
                    <img src={f.url} alt={f.file.name} className="h-full w-full object-cover" />
                  ) : (
                    <video src={f.url} className="h-full w-full object-cover" muted />
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${f.file.name}`}
                    onClick={() => removeFile(f.id)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={share}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-40"
          >
            Share mood
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
