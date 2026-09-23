import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, ListVideo, Type as TypeIcon, X, Music2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MediaImg } from "@/components/PostCard";
import { useActions } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";
import { DEMO_GALLERY, DEMO_VIDEO_GALLERY } from "@/lib/demo-data";

// Same recipes Instagram-style filters emulate
const FILTERS: { name: string; css: string }[] = [
  { name: "Normal", css: "none" },
  { name: "Clarendon", css: "contrast(1.2) saturate(1.35) brightness(1.05)" },
  { name: "Gingham", css: "brightness(1.05) sepia(0.12) contrast(0.95)" },
  { name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Lark", css: "contrast(0.9) saturate(1.15) brightness(1.12)" },
  { name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" },
  { name: "Juno", css: "saturate(1.4) contrast(1.05) sepia(0.15) hue-rotate(-8deg)" },
  { name: "Slumber", css: "saturate(0.66) brightness(1.05) sepia(0.15)" },
  { name: "Crema", css: "sepia(0.2) contrast(1.05) brightness(1.02) saturate(0.9)" },
  { name: "Ludwig", css: "saturate(1.05) contrast(0.9) brightness(1.05)" },
  { name: "Aden", css: "hue-rotate(-18deg) contrast(0.9) saturate(0.85) brightness(1.2)" },
  { name: "Perpetua", css: "contrast(1.1) brightness(1.08) saturate(1.1)" },
];

const TEXT_THEMES = [
  "linear-gradient(135deg,#4F5BD5,#962FBF)",
  "linear-gradient(135deg,#D62976,#FA7E1E)",
  "linear-gradient(135deg,#FEDA75,#D62976)",
  "linear-gradient(135deg,#0F9B8E,#1D2671)",
  "linear-gradient(135deg,#ff9966,#ff5e62)",
  "linear-gradient(135deg,#2193b0,#6dd5ed)",
];

type Mode = "photo" | "video" | "text";
type Step = "pick" | "filter" | "caption" | "text";

interface Draft {
  files: File[];
  gallery: string[];
  previews: string[]; // object URLs / gallery urls
  filter: string;
  zoom: number;
}

function bakeImage(src: string, filter: string): Promise<string> {
  return new Promise((resolve) => {
    if (!filter || filter === "none") return resolve(src);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const max = 1080;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d")!;
        ctx.filter = filter;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function CreateModal() {
  const { overlay, createMode } = useUI();
  const actions = useActions();
  const navigate = useNavigate();

  const open = overlay === "create";
  const [mode, setMode] = useState<Mode | null>(createMode);
  const [step, setStep] = useState<Step>("pick");
  const [draft, setDraft] = useState<Draft>({ files: [], gallery: [], previews: [], filter: "none", zoom: 1 });
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [music, setMusic] = useState("");
  const [theme, setTheme] = useState(0);
  const [textPost, setTextPost] = useState("");
  const [asReel, setAsReel] = useState(true);
  const [alsoStory, setAlsoStory] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const storyInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode(createMode);
      setStep(createMode === "text" ? "text" : "pick");
      setDraft({ files: [], gallery: [], previews: [], filter: "none", zoom: 1 });
      setCaption(""); setLocation(""); setMusic(""); setTextPost("");
    }
  }, [open, createMode]);

  if (!open) return null;

  const close = () => ui.closeAll();

  const pickImages = (files: FileList | null) => {
    if (!files?.length) return;
    const arr = Array.from(files).slice(0, 5);
    setDraft({ files: arr, gallery: [], previews: arr.map((f) => URL.createObjectURL(f)), filter: "none", zoom: 1 });
    setStep("filter");
  };

  const pickGalleryImage = (url: string) => {
    setDraft({ files: [], gallery: [url], previews: [url], filter: "none", zoom: 1 });
    setStep("filter");
  };

  const pickVideo = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    setDraft({ files: [f], gallery: [], previews: [URL.createObjectURL(f)], filter: "none", zoom: 1 });
    setStep("caption");
  };

  const pickGalleryVideo = (v: { url: string; poster: string }) => {
    setDraft({ files: [], gallery: [v.url], previews: [v.url], filter: "none", zoom: 1 });
    setStep("caption");
  };

  const share = async () => {
    setBusy(true);
    try {
      if (mode === "photo") {
        const baked: string[] = [];
        for (const p of draft.previews) baked.push(await bakeImage(p, draft.filter));
        const galleryFallback = baked.every((b) => b.startsWith("http")) ? baked : [];
        await actions.createPost({
          files: draft.files.filter(() => !galleryFallback.length),
          galleryUrls: galleryFallback.length ? baked : [],
          caption,
          location,
        });
        if (alsoStory) await actions.createStory({ galleryUrl: baked[0], file: draft.files[0] });
        toast("Post shared ✅");
        close();
        navigate({ to: "/feed" });
      } else if (mode === "video") {
        await actions.createReel({
          file: draft.gallery.length ? undefined : draft.files[0],
          galleryUrl: draft.gallery[0],
          caption,
          music: music || null,
        });
        toast("Reel shared 🎬");
        close();
        navigate({ to: "/reels" });
      } else {
        if (!textPost.trim()) return;
        await actions.createPost({ files: [], galleryUrls: [], caption: textPost.trim() });
        toast("Text post shared ✅");
        close();
        navigate({ to: "/feed" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Share failed — try again");
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === null ? "Create new post"
    : step === "pick" ? (mode === "photo" ? "Create new photo post" : mode === "video" ? "Create new reel" : "New text post")
    : step === "filter" ? "Edit media"
    : step === "caption" ? "Create new post"
    : "New text post";

  const canNext = mode === "video" ? !!draft.previews.length : mode === "text" ? !!textPost.trim() : !!draft.previews.length;
  const nextLabel = mode === "video" ? (step === "caption" ? "Share" : "Next") : step === "filter" ? "Next" : "Share";

  const onNext = () => {
    if (nextLabel === "Share") return share();
    if (step === "filter") setStep(mode === "video" ? "caption" : "caption");
  };

  return (
    <div className="fixed inset-0 z-[55] bg-black/70 flex items-center justify-center md:p-6" role="dialog" aria-modal>
      <div className="bg-card w-full h-full md:h-[min(660px,88vh)] md:max-w-[900px] md:rounded-2xl flex flex-col overflow-hidden animate-in-fade">
        {/* header */}
        <header className="flex items-center justify-between border-b border-border px-3 h-12 shrink-0">
          <button type="button" aria-label="Back" onClick={() => (step === "pick" || step === "text" ? close() : setStep("pick"))} className="p-1 hover:opacity-60">
            {step === "pick" || step === "text" ? <X className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-[15px]">{title}</span>
          <button
            type="button"
            disabled={step === "pick" || step === "text" ? false : !canNext || busy}
            onClick={() => (step === "pick" ? undefined : step === "text" ? share() : onNext())}
            className="text-primary font-semibold text-sm disabled:opacity-30 px-1"
          >
            {step === "pick" ? "" : busy ? "Sharing…" : step === "text" ? "Share" : nextLabel}
          </button>
        </header>

        {/* body */}
        {step === "pick" && (
          <div className="flex-1 overflow-y-auto">
            {mode === null && (
              <div className="grid md:grid-cols-3 gap-px bg-border">
                <button type="button" onClick={() => { setMode("photo"); }} className="bg-card p-8 flex flex-col items-center gap-3 hover:bg-muted">
                  <ImagePlus className="h-10 w-10 text-primary" />
                  <span className="font-semibold">Photo</span>
                  <span className="text-xs text-muted-foreground">Upload or pick a photo, add filters</span>
                </button>
                <button type="button" onClick={() => { setMode("video"); setStep("pick"); }} className="bg-card p-8 flex flex-col items-center gap-3 hover:bg-muted">
                  <ListVideo className="h-10 w-10 text-primary" />
                  <span className="font-semibold">Reel</span>
                  <span className="text-xs text-muted-foreground">Share a short vertical video</span>
                </button>
                <button type="button" onClick={() => { setMode("text"); setStep("text"); }} className="bg-card p-8 flex flex-col items-center gap-3 hover:bg-muted">
                  <TypeIcon className="h-10 w-10 text-primary" />
                  <span className="font-semibold">Text</span>
                  <span className="text-xs text-muted-foreground">Share a thought on a gradient</span>
                </button>
              </div>
            )}

            {mode === "photo" && (
              <div className="p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-2 hover:border-primary/60 hover:bg-muted/40"
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <span className="font-semibold text-sm">Select from device</span>
                  <span className="text-xs text-muted-foreground">Up to 5 photos (JPEG/PNG)</span>
                </button>
                <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Or pick a sample photo</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {DEMO_GALLERY.map((g) => (
                    <button key={g} type="button" onClick={() => pickGalleryImage(g)} className="aspect-square overflow-hidden rounded-md hover:opacity-80">
                      <MediaImg src={g} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => storyInput.current?.click()}
                  className="w-full rounded-xl bg-muted py-3 text-sm font-semibold hover:bg-accent"
                >
                  + Add to your story instead
                </button>
                <input ref={storyInput} type="file" accept="image/*" hidden onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await actions.createStory({ file: f });
                  toast("Story added ✨");
                  close();
                }} />
              </div>
            )}

            {mode === "video" && (
              <div className="p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-2 hover:border-primary/60 hover:bg-muted/40"
                >
                  <ListVideo className="h-8 w-8 text-muted-foreground" />
                  <span className="font-semibold text-sm">Select a video from device</span>
                  <span className="text-xs text-muted-foreground">MP4/WebM · shared as a reel</span>
                </button>
                <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => pickVideo(e.target.files)} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Or pick a sample clip</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {DEMO_VIDEO_GALLERY.map((v) => (
                    <button key={v.url} type="button" onClick={() => pickGalleryVideo(v)} className="relative aspect-[9/14] overflow-hidden rounded-md hover:opacity-80">
                      <MediaImg src={v.poster} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white rounded px-1">clip</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "filter" && mode === "photo" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="flex-1 grid place-items-center bg-black/90 p-4 min-h-[300px]">
              <div className="relative aspect-square max-h-full max-w-full overflow-hidden">
                <MediaImg
                  src={draft.previews[0]}
                  className="h-full w-full object-cover transition-transform"
                  // @ts-expect-error css var passthrough
                  style={{ filter: draft.filter === "none" ? undefined : draft.filter, transform: `scale(${draft.zoom})` }}
                />
              </div>
            </div>
            <div className="md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border p-3 space-y-3 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Zoom</p>
                <input
                  type="range" min={1} max={2} step={0.01} value={draft.zoom}
                  onChange={(e) => setDraft((d) => ({ ...d, zoom: Number(e.target.value) }))}
                  className="w-full accent-[#0095F6]"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Filters</p>
                <div className="grid grid-cols-3 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, filter: f.css }))}
                      className={`rounded-lg overflow-hidden border-2 ${draft.filter === f.css ? "border-primary" : "border-transparent"}`}
                    >
                      <MediaImg
                        src={draft.previews[0]}
                        className="aspect-square w-full object-cover"
                        // @ts-expect-error css var passthrough
                        style={{ filter: f.css === "none" ? undefined : f.css }}
                      />
                      <span className="block text-[10px] py-1 text-center">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "caption" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="flex-1 grid place-items-center bg-black/90 p-4 min-h-[260px]">
              {mode === "video" ? (
                <video src={draft.previews[0]} className="max-h-full max-w-full md:aspect-[9/16] object-contain rounded-lg" autoPlay muted loop playsInline />
              ) : (
                <MediaImg
                  src={draft.previews[0]}
                  className="max-h-full max-w-full object-cover"
                  // @ts-expect-error css var passthrough
                  style={{ filter: draft.filter === "none" ? undefined : draft.filter }}
                />
              )}
            </div>
            <div className="md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border p-4 space-y-4 overflow-y-auto">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={mode === "video" ? "Write a caption… #reels" : "Write a caption…"}
                rows={5}
                className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {mode === "video" && (
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={music}
                    onChange={(e) => setMusic(e.target.value)}
                    placeholder="Add music name (e.g. Lo-fi beats)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}
              {mode === "video" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={asReel} onChange={(e) => setAsReel(e.target.checked)} className="accent-[#0095F6]" />
                  Share as Reel (recommended)
                </label>
              )}
              {mode === "photo" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={alsoStory} onChange={(e) => setAlsoStory(e.target.checked)} className="accent-[#0095F6]" />
                  Also share to your story
                </label>
              )}
              <button
                type="button"
                onClick={share}
                disabled={busy}
                className="w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm py-2.5 hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        )}

        {step === "text" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="flex-1 grid place-items-center bg-black/90 p-6 min-h-[280px]">
              <div
                className="aspect-square w-full max-w-[380px] rounded-xl p-8 flex items-center justify-center text-center"
                style={{ background: TEXT_THEMES[theme] }}
              >
                <p className="text-white text-xl font-semibold whitespace-pre-wrap break-words drop-shadow">
                  {textPost || "Type something…"}
                </p>
              </div>
            </div>
            <div className="md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border p-4 space-y-4">
              <textarea
                value={textPost}
                onChange={(e) => setTextPost(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                autoFocus
                className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground"
              />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Background</p>
                <div className="flex gap-2 flex-wrap">
                  {TEXT_THEMES.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTheme(i)}
                      className={`h-10 w-10 rounded-lg border-2 ${theme === i ? "border-primary scale-110" : "border-transparent"} transition-transform`}
                      style={{ background: t }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={share}
                disabled={busy || !textPost.trim()}
                className="w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm py-2.5 hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Sharing…" : "Share"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
