import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Video, X, Send } from "lucide-react";
import { toast } from "sonner";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "tired", emoji: "🥱", label: "Tired" },
  { id: "hyped", emoji: "🔥", label: "Hyped" },
];

type Attachment = { id: string; file: File; url: string; kind: "image" | "video" };

/**
 * "What's your mood today?" box shown under the stories row.
 * Needs one mood emoji plus at least one of: a note, a photo, or a video.
 * Several photos/videos and a note can be combined.
 */
export function MoodBox() {
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const canSubmit = !!mood && (note.trim().length > 0 || files.length > 0);

  // Free preview URLs when they're removed or the component unmounts.
  useEffect(() => {
    return () => files.forEach((f) => URL.revokeObjectURL(f.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setMood(null);
    setNote("");
    setFiles([]);
    if (imageInput.current) imageInput.current.value = "";
    if (videoInput.current) videoInput.current.value = "";
  };

  const submit = () => {
    if (!canSubmit) return;
    const picked = MOODS.find((m) => m.id === mood);
    toast(`Mood shared: ${picked?.emoji ?? ""} ${picked?.label ?? ""}`);
    reset();
  };

  const summary = useMemo(() => {
    const parts = [] as string[];
    const photos = files.filter((f) => f.kind === "image").length;
    const videos = files.filter((f) => f.kind === "video").length;
    if (photos) parts.push(`${photos} photo${photos > 1 ? "s" : ""}`);
    if (videos) parts.push(`${videos} video${videos > 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [files]);

  return (
    <div className="px-4 pb-3 pt-1 border-t border-border">
      <p className="text-sm font-semibold mb-2">What's your mood today?</p>

      {/* mood emojis */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {MOODS.map((m) => {
          const active = mood === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMood(m.id)}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-2 border transition-transform active:scale-95 ${
                active ? "border-primary bg-primary/10 scale-105" : "border-border bg-background"
              }`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={280}
        placeholder="Add a note…"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary mb-2"
      />

      {/* photo / video */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => imageInput.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <ImagePlus className="h-4 w-4" /> Photo
        </button>
        <button
          type="button"
          onClick={() => videoInput.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <Video className="h-4 w-4" /> Video
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

      {/* attachment previews */}
      {files.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
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
      {summary && <p className="text-[11px] text-muted-foreground mb-2">Attached: {summary}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-40"
      >
        <Send className="h-4 w-4" /> Share mood
      </button>
      {!canSubmit && (
        <p className="text-[11px] text-muted-foreground text-center mt-1">
          Pick a mood and add a note, photo or video to share.
        </p>
      )}
    </div>
  );
}
