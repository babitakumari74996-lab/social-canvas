import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ImagePlus, ListVideo, Type as TypeIcon, X, Music2, MapPin, Smile, CalendarClock, Radio, Camera, Check, ChevronDown, Settings, LayoutTemplate, FileText, ScanFace, Sparkles, SwitchCamera, Square, Gauge } from "lucide-react";
import { toast } from "sonner";
import { MediaImg } from "@/components/PostCard";
import { useActions, dataUrlToFile } from "@/lib/data";
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
  "linear-gradient(135deg,#4338CA,#7C3AED)",
  "linear-gradient(135deg,#6366F1,#2DD4BF)",
  "linear-gradient(135deg,#5EEAD4,#6366F1)",
  "linear-gradient(135deg,#0F9B8E,#1D2671)",
  "linear-gradient(135deg,#ff9966,#ff5e62)",
  "linear-gradient(135deg,#2193b0,#6dd5ed)",
];

type Mode = "photo" | "video" | "text";
type Step = "pick" | "filter" | "edit" | "caption" | "text";

interface Draft {
  files: File[];
  gallery: string[];
  previews: string[]; // object URLs / gallery urls
  filter: string;
  zoom: number;
}

// Waits for a media event, or gives up after a short time so a broken clip cannot hang the editor.
function once(el: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { window.clearTimeout(t); el.removeEventListener(event, done); resolve(); };
    const t = window.setTimeout(done, 4000);
    el.addEventListener(event, done);
  });
}

/** Still frames spread across a clip (9:16 JPEG data URLs), used to pick the reel cover. */
async function captureFrames(src: string, count = 8): Promise<string[]> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = src;
  await once(v, "loadedmetadata");
  if (!v.duration || !isFinite(v.duration) || !v.videoWidth) return [];
  const W = 108, H = 192; // 9:16 thumbnails
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    v.currentTime = v.duration * (0.05 + (0.9 * i) / Math.max(1, count - 1));
    await once(v, "seeked");
    try {
      // cover-fit the frame into the 9:16 box
      const k = Math.max(W / v.videoWidth, H / v.videoHeight);
      const dw = v.videoWidth * k, dh = v.videoHeight * k;
      ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
      out.push(c.toDataURL("image/jpeg", 0.8));
    } catch {
      break;
    }
  }
  v.removeAttribute("src");
  v.load();
  return out;
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

/* Live camera for the reel pick: asks permission first, then records a clip that goes to the edit step. */
function CameraCapture({ onCapture, onClose }: { onCapture: (file: File, url: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Start the camera only after the user taps "Allow" (this is what triggers the browser permission prompt).
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no-media"), { name: "NoMediaApi" });
        let s: MediaStream;
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
        } catch (first) {
          // No microphone or mic blocked: keep the camera going with video only.
          if ((first as Error).name === "NotAllowedError" || (first as Error).name === "SecurityError") throw first;
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
        }
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (cancelled) return;
        const name = (err as Error)?.name ?? "";
        const msg =
          name === "NoMediaApi" || name === "SecurityError"
            ? "Camera is page par nahi chal sakta. Secure (https) link se kholein."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "Is device par camera nahi mila."
              : name === "NotReadableError"
                ? "Camera kisi aur app mein use ho raha hai. Use band karke dobara try karein."
                : "Camera ki permission nahi mili. Browser settings mein camera aur mic allow karein.";
        setError(`${msg} (${name || "error"})`);
      }
    })();
    return () => {
      cancelled = true;
      stopTracks();
    };
  }, [started, facing]);

  // Stop everything when the camera closes.
  useEffect(() => () => {
    discardRef.current = true;
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    stopTracks();
  }, []);

  const startRec = () => {
    const s = streamRef.current;
    if (!s) return;
    chunksRef.current = [];
    discardRef.current = false;
    const mime = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      if (discardRef.current) return;
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `camera-${Date.now()}.${ext}`, { type });
      onCapture(file, URL.createObjectURL(blob));
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  };

  const stopRec = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  const close = () => {
    discardRef.current = true;
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    stopTracks();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col">
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Camera className="h-12 w-12" />
          <p className="text-lg font-semibold">Camera aur mic ki permission chahiye</p>
          <p className="text-sm text-white/70">Reel record karne ke liye camera aur microphone ki zarurat hai.</p>
          <button type="button" onClick={() => setStarted(true)} className="rounded-lg sv-gradient-bg px-6 py-2.5 font-semibold text-white">
            Allow
          </button>
          <button type="button" onClick={close} className="text-sm text-white/70 underline">Cancel</button>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} muted playsInline autoPlay className={`absolute inset-0 h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""}`} />
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center">
                <p className="text-sm">{error}</p>
                <button type="button" onClick={() => setStarted(false)} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">Try again</button>
                {typeof window !== "undefined" && window.self !== window.top && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, "_blank", "noopener")}
                    className="rounded-lg sv-gradient-bg px-4 py-2 text-sm font-semibold text-white"
                  >
                    Naye tab mein kholein
                  </button>
                )}
              </div>
            )}
            <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4">
              <button type="button" aria-label="Close camera" onClick={close} className="p-1"><X className="h-7 w-7" /></button>
            </div>
            <div className="absolute right-4 top-16 flex flex-col items-end gap-5 text-sm font-semibold">
              {[
                { label: "Music", icon: Music2 },
                { label: "Speed", icon: Gauge },
                { label: "Effects", icon: Sparkles },
                { label: "Green screen", icon: ScanFace },
              ].map((t) => (
                <button key={t.label} type="button" onClick={() => toast(`${t.label} coming soon`)} className="flex items-center gap-2 drop-shadow">
                  {t.label} <t.icon className="h-6 w-6" />
                </button>
              ))}
            </div>
            {recording && (
              <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded bg-red-600 px-2 py-0.5 text-xs font-bold">REC</span>
            )}
          </div>
          <div className="flex items-center justify-between px-8 py-6">
            <span className="h-10 w-10" />
            <button
              type="button"
              aria-label={recording ? "Stop recording" : "Start recording"}
              onClick={recording ? stopRec : startRec}
              className="grid place-items-center h-20 w-20 rounded-full border-4 border-white/70"
            >
              {recording ? <Square className="h-8 w-8 fill-red-500 text-red-500" /> : <span className="h-16 w-16 rounded-full bg-red-500" />}
            </button>
            <button
              type="button"
              aria-label="Flip camera"
              disabled={recording}
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="grid place-items-center h-10 w-10 disabled:opacity-40"
            >
              <SwitchCamera className="h-7 w-7" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CreateModal({ page = false }: { page?: boolean } = {}) {
  const { overlay, createMode } = useUI();
  const actions = useActions();
  const navigate = useNavigate();

  const open = page || overlay === "create";
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
  const [cover, setCover] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [coverIdx, setCoverIdx] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoFilter, setVideoFilter] = useState("none");
  const [tags, setTags] = useState("");
  const [audience, setAudience] = useState<"everyone" | "followers">("everyone");
  const editVideo = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const storyInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode(createMode);
      setStep(createMode === "text" ? "text" : "pick");
      setDraft({ files: [], gallery: [], previews: [], filter: "none", zoom: 1 });
      setCaption(""); setLocation(""); setMusic(""); setTextPost("");
      setCover(null); setFrames([]); setCameraOpen(false);
      setTrimStart(0); setTrimEnd(0); setDuration(0); setVideoFilter("none");
      setTags(""); setAudience("everyone"); setAlsoStory(false);
    }
  }, [open, createMode]);

  // Reel edit step: sample frames from the clip for the cover picker.
  const videoSrc = mode === "video" ? draft.previews[0] : undefined;
  useEffect(() => {
    if (!open || step !== "edit" || !videoSrc) return;
    let cancelled = false;
    setFrames([]);
    captureFrames(videoSrc).then((f) => {
      if (cancelled) return;
      setFrames(f);
      setCover((c) => c ?? f[0] ?? null);
      setCoverIdx(0);
    });
    return () => { cancelled = true; };
  }, [open, step, videoSrc]);

  if (!open) return null;

  const close = () => (page ? navigate({ to: "/feed" }) : ui.closeAll());

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
    setCover(null);
  };

  const pickGalleryVideo = (v: { url: string; poster: string }) => {
    setDraft({ files: [], gallery: [v.url], previews: [v.url], filter: "none", zoom: 1 });
    setCover(null);
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
        const tagged = tags.split(/[\s,]+/).map((t) => t.replace(/^@/, "").trim()).filter(Boolean);
        const trimmed = duration > 0 && (trimStart > 0.05 || trimEnd < duration - 0.05);
        await actions.createReel({
          file: draft.gallery.length ? undefined : draft.files[0],
          galleryUrl: draft.gallery[0],
          caption,
          music: music || null,
          edits: {
            cover: cover ?? undefined,
            trimStart: trimmed ? trimStart : undefined,
            trimEnd: trimmed ? trimEnd : undefined,
            filter: videoFilter,
            audience,
            tagged,
          },
        });
        if (alsoStory && cover) await actions.createStory({ file: await dataUrlToFile(cover, "cover.jpg") });
        toast("Reel shared 🎬");
        close();
        navigate({ to: "/reels" });
      } else {
        if (!textPost.trim()) return;
        await actions.createPost({ files: [], galleryUrls: [], caption: textPost.trim() });
        toast("Twit shared ✅");
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
    : step === "pick" ? (mode === "photo" ? "Create new photo post" : mode === "video" ? "Create reel" : "New Twit")
    : step === "filter" ? "Edit media"
    : step === "edit" ? "Edit reel"
    : step === "caption" ? (mode === "video" ? "New reel" : "Create new post")
    : "New Twit";

  const canNext = mode === "video" ? !!draft.previews.length : mode === "text" ? !!textPost.trim() : !!draft.previews.length;
  const nextLabel = mode === "video" ? (step === "caption" ? "Share" : "Next") : step === "filter" ? "Next" : "Share";

  const onNext = () => {
    if (nextLabel === "Share") return share();
    if (step === "filter") setStep("caption");
    if (step === "edit") setStep("caption");
  };

  return (
    <div
      {...(page ? {} : { "data-overlay-swipe": "" })}
      className={page ? "min-h-[calc(100vh-3.5rem)] md:min-h-screen flex flex-col bg-card" : "fixed inset-x-0 top-0 bottom-14 md:inset-0 z-[55] bg-black/70 flex items-center justify-center md:p-6"}
      role={page ? "region" : "dialog"}
      aria-modal={page ? undefined : true}
    >
      <div className={page ? "bg-card w-full flex-1 flex flex-col animate-in-fade" : "bg-card w-full h-full md:h-[min(660px,88vh)] md:max-w-[900px] md:rounded-2xl flex flex-col overflow-hidden animate-in-fade"}>
        {/* header */}
        <header className="flex items-center justify-between border-b border-border px-3 h-12 shrink-0">
          <button type="button" aria-label="Back" onClick={() => (step === "pick" || step === "text" ? close() : step === "caption" && mode === "video" ? setStep("edit") : setStep("pick"))} className="p-1 hover:opacity-60">
            {step === "pick" || step === "text" ? (page ? null : <X className="h-5 w-5" />) : <ChevronLeft className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-[15px]">{title}</span>
          {step === "pick" && mode === "video" ? (
            <button type="button" aria-label="Settings" onClick={() => toast("Settings coming soon")} className="md:hidden p-1 hover:opacity-60">
              <Settings className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              disabled={step === "pick" || step === "text" ? false : !canNext || busy}
              onClick={() => (step === "pick" ? undefined : step === "text" ? share() : onNext())}
              className="text-primary font-semibold text-sm disabled:opacity-30 px-1"
            >
              {step === "pick" ? "" : busy ? "Sharing…" : step === "text" ? "Share" : nextLabel}
            </button>
          )}
        </header>

        {cameraOpen && mode === "video" && (
          <CameraCapture
            onClose={() => setCameraOpen(false)}
            onCapture={(file, url) => {
              setDraft({ files: [file], gallery: [], previews: [url], filter: "none", zoom: 1 });
              setCover(null);
              setCameraOpen(false);
              setStep("edit");
            }}
          />
        )}

        {/* body */}
        {step === "pick" && mode === "video" && (
          <div className="md:hidden flex-1 flex flex-col min-h-0 bg-background">
            <div className="overflow-x-auto touch-pan-x overscroll-x-contain pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-full justify-between gap-6 px-4">
              {[
                { label: "Camera", icon: Camera, action: () => setCameraOpen(true) },
                { label: "Music", icon: Music2, action: () => toast("Music coming soon") },
                { label: "Templates", icon: LayoutTemplate, action: () => toast("Templates coming soon") },
                { label: "Drafts", icon: FileText, action: () => toast("Drafts coming soon") },
                { label: "Green screen", icon: ScanFace, action: () => toast("Green screen coming soon") },
                { label: "Effects", icon: Sparkles, action: () => { if (!draft.previews.length) pickGalleryVideo(DEMO_VIDEO_GALLERY[0]); setStep("edit"); } },
              ].map((t) => (
                <button key={t.label} type="button" onClick={t.action} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                  <span className="grid place-items-center h-14 w-14 rounded-full bg-muted">
                    <t.icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-medium text-center leading-tight">{t.label}</span>
                </button>
              ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                Gallery <ChevronDown className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={() => toast("Select multiple coming soon")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium"
              >
                <Check className="h-4 w-4" /> Select multiple
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-px">
                {DEMO_VIDEO_GALLERY.map((v) => {
                  const selected = draft.gallery[0] === v.url;
                  return (
                    <button
                      key={v.url}
                      type="button"
                      onClick={() => pickGalleryVideo(v)}
                      className="relative aspect-square overflow-hidden bg-muted"
                    >
                      <MediaImg src={v.poster} className="w-full h-full object-cover" />
                      {selected && (
                        <>
                          <span className="absolute inset-0 bg-black/30" />
                          <span className="absolute top-1.5 right-1.5 grid place-items-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <button
                type="button"
                disabled={!draft.previews.length}
                onClick={() => setStep("edit")}
                className="w-full rounded-lg sv-gradient-bg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "pick" && mode === "video" && (
          <div
            className="hidden md:flex flex-1 md:flex-row md:overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickVideo(e.dataTransfer.files);
            }}
          >
            {/* left: add a video, sample clips, Upload */}
            <div className="md:w-[320px] shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border">
              <div className="p-4 md:flex-1 md:overflow-y-auto space-y-4">
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="w-full h-44 rounded-xl border border-border flex flex-col items-center justify-center gap-2 hover:bg-muted/50"
                >
                  <span className="grid place-items-center h-12 w-12 rounded-full bg-muted">
                    <ListVideo className="h-6 w-6" />
                  </span>
                  <span className="font-semibold text-sm">Add video</span>
                  <span className="text-xs text-muted-foreground">or drag and drop</span>
                </button>
                <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => pickVideo(e.target.files)} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Or pick a sample clip</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {DEMO_VIDEO_GALLERY.map((v) => (
                    <button
                      key={v.url}
                      type="button"
                      onClick={() => pickGalleryVideo(v)}
                      className={`relative aspect-[9/14] overflow-hidden rounded-md ring-2 ${draft.gallery[0] === v.url ? "ring-primary" : "ring-transparent"}`}
                    >
                      <MediaImg src={v.poster} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <button
                  type="button"
                  disabled={!draft.previews.length}
                  onClick={() => setStep("edit")}
                  className="w-full rounded-lg sv-gradient-bg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Upload
                </button>
              </div>
            </div>
            {/* right: preview card on a dark background */}
            <div className="flex-1 shrink-0 md:shrink min-h-[420px] bg-[#333] flex items-center justify-center p-6">
              <div className="w-full max-w-[340px] rounded-xl bg-white p-4 shadow-xl">
                <p className="text-sm font-semibold mb-3">Preview</p>
                <div className="aspect-[9/16] w-full rounded-lg bg-[#f2f3f6] overflow-hidden grid place-items-center text-center">
                  {draft.previews[0] ? (
                    <video key={draft.previews[0]} src={draft.previews[0]} className="h-full w-full object-contain" autoPlay muted loop playsInline />
                  ) : (
                    <div className="px-6">
                      <p className="font-semibold text-muted-foreground">Your video preview</p>
                      <p className="text-sm text-muted-foreground mt-1">Upload your video in order to see a preview here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "pick" && mode !== "video" && (
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
                  <span className="font-semibold">Twit</span>
                  <span className="text-xs text-muted-foreground">Share a thought on a gradient</span>
                </button>
                {([
                  { label: "Mood", desc: "Share how you feel today", icon: Smile },
                  { label: "Today", desc: "Post a moment from your day", icon: CalendarClock },
                  { label: "Live", desc: "Go live with your followers", icon: Radio },
                ] as const).map((o) => (
                  <button key={o.label} type="button" onClick={() => toast(`${o.label} is coming soon`)} className="bg-card p-8 flex flex-col items-center gap-3 hover:bg-muted">
                    <o.icon className="h-10 w-10 text-primary" />
                    <span className="font-semibold">{o.label}</span>
                    <span className="text-xs text-muted-foreground">{o.desc}</span>
                  </button>
                ))}
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

        {step === "edit" && mode === "video" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="flex-1 grid place-items-center bg-black/90 p-4 min-h-[300px]">
              <video
                ref={editVideo}
                src={draft.previews[0]}
                style={{ filter: videoFilter === "none" ? undefined : videoFilter }}
                className="max-h-[70vh] max-w-full aspect-[9/16] object-contain rounded-lg"
                autoPlay
                muted
                loop
                playsInline
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (isFinite(d) && d > 0) {
                    setDuration(d);
                    setTrimEnd((t) => t || d);
                  }
                }}
                onTimeUpdate={(e) => {
                  // Play only the trimmed range.
                  const v = e.currentTarget;
                  const end = trimEnd || duration;
                  if (end && (v.currentTime >= end || v.currentTime < trimStart)) v.currentTime = trimStart;
                }}
              />
            </div>
            <div className="md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border p-4 space-y-5 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cover</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {frames.length === 0 && <span className="text-xs text-muted-foreground">Loading frames…</span>}
                  {frames.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setCover(f); setCoverIdx(i); }}
                      aria-label={`Cover frame ${i + 1}`}
                      className={`shrink-0 w-14 h-24 rounded-md overflow-hidden border-2 ${coverIdx === i ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={f} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              {duration > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Trim</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Start {trimStart.toFixed(1)}s</span>
                    <span>End {trimEnd.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, duration - 0.5)}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(Math.max(0, Math.min(Number(e.target.value), trimEnd - 0.5)))}
                    aria-label="Trim start"
                    className="w-full accent-[#6366F1]"
                  />
                  <input
                    type="range"
                    min={0.5}
                    max={duration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.min(duration, Math.max(Number(e.target.value), trimStart + 0.5)))}
                    aria-label="Trim end"
                    className="w-full accent-[#6366F1]"
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Filter</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setVideoFilter(f.css)}
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${videoFilter === f.css ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Audio</p>
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={music}
                    onChange={(e) => setMusic(e.target.value)}
                    placeholder="Add music name (e.g. Lo-fi beats)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "caption" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="flex-1 grid place-items-center bg-black/90 p-4 min-h-[260px]">
              {mode === "video" ? (
                cover ? (
                  <img src={cover} alt="Reel cover" className="h-[min(56vh,420px)] aspect-[9/16] object-cover rounded-lg shadow-lg md:h-auto md:max-h-full md:max-w-full" />
                ) : (
                  <video src={draft.previews[0]} className="max-h-full max-w-full md:aspect-[9/16] object-contain rounded-lg" autoPlay muted loop playsInline />
                )
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
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={asReel} onChange={(e) => setAsReel(e.target.checked)} className="accent-[#0095F6]" />
                  Share as Reel (recommended)
                </label>
              )}
              {mode === "video" && (
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Tag people (e.g. @rohan, @priya)"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}
              {mode === "video" && (
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Audience</span>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as "everyone" | "followers")}
                    className="bg-transparent text-sm outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers only</option>
                  </select>
                </label>
              )}
              {mode === "video" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={alsoStory} onChange={(e) => setAlsoStory(e.target.checked)} className="accent-[#0095F6]" />
                  Also share to your story (cover)
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
