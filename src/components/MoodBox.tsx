import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { useMe } from "@/lib/data";

const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "tired", emoji: "🥱", label: "Tired" },
  { id: "hyped", emoji: "🔥", label: "Hyped" },
];

type Attachment = { id: string; file: File; url: string; kind: "image" | "video" };

/**
 * "What's your mood today?" composer under the stories row, styled like the
 * "What's on your mind?" bar. The text field is the note. Mood emojis sit below it.
 * Sharing needs a mood plus at least one of: a note, a photo, or a video.
 */
export function MoodBox() {
  const me = useMe();
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const canSubmit = !!mood && (note.trim().length > 0 || files.length > 0);

  // Revoke preview URLs when the component unmounts.
  const filesRef = useRef<Attachment[]>([]);
  filesRef.current = files;
  useEffect(() => {
    return () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url));
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
    <div className="px-3 pb-3 pt-3 border-t border-border">
      {/* composer: avatar and type bar are separate, sized up */}
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

      {/* moods spread across the full row, photo/video on the right */}
      <div className="flex items-center gap-2 mt-3">
        <div className="grid flex-1 grid-cols-4 gap-2">
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
                className={`flex items-center justify-center rounded-xl py-2 text-2xl leading-none transition-transform active:scale-95 ${
                  active ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/60 hover:bg-muted"
                }`}
              >
                {m.emoji}
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Add photo" onClick={() => imageInput.current?.click()} className="p-1">
          <ImagePlus className="h-6 w-6 text-emerald-600" />
        </button>
        <button type="button" aria-label="Add video" onClick={() => videoInput.current?.click()} className="p-1">
          <Video className="h-6 w-6 text-red-500" />
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
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2">
          {files.map((f) => (
            <div key={f.id} className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted">
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
      {summary && <p className="text-[10px] text-muted-foreground mt-1 px-1">Attached: {summary}</p>}
      {!canSubmit && (
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          Pick a mood and add a note, photo or video to share.
        </p>
      )}
    </div>
  );
}
