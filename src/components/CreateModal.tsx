import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, RefreshCw, ChevronLeft, ImagePlus, ListVideo, Type as TypeIcon, X, Music2, MapPin, Smile, CalendarClock, Radio, Camera, Check, ChevronDown, Settings, LayoutTemplate, FileText, ScanFace, Sparkles, SwitchCamera, Square, Gauge, Scissors, ArrowRight, MoreHorizontal, Volume2, VolumeX, ChevronRight, Globe, Tag, PlusCircle, Share2, Hash, FlaskConical, Save, Coins, Pause, Play, Plus, Video, SlidersHorizontal, Undo2, Redo2, Repeat2, FlipHorizontal2, AlignLeft, AlignCenter, AlignRight, Clock, Mic, Crop, Search, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MediaImg } from "@/components/PostCard";
import { useActions, dataUrlToFile, useMe } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";
import { DEMO_GALLERY, DEMO_VIDEO_GALLERY } from "@/lib/demo-data";
import { MusicPicker, VoiceoverRecorder, type MusicTrack } from "@/components/ReelTools";
import { SvSlider } from "@/components/SvSlider";
import { MoodDialog } from "@/components/MoodBox";
import { EFFECT_REGIONS, WORLD_EFFECTS, worldEffectBg, type EffectRegion } from "@/lib/effect-catalog";
import { STICKER_CATEGORIES, STICKER_LIBRARY, STICKER_EMOJI, twemojiUrl } from "@/lib/sticker-catalog";

// Playback speeds offered by the reel editor and the camera.
const SPEEDS = [0.5, 1, 2] as const;
type CaptureMeta = { speed: number; filter: string };
const TEXT_COLOURS = ["#ffffff", "#000000", "#facc15", "#f472b6", "#38bdf8", "#22c55e"];
type TextFont = "sans" | "serif" | "mono" | "display" | "script" | "rounded" | "slab" | "comic";
const TEXT_FONT_KEYS: TextFont[] = ["sans", "serif", "mono", "display", "script", "rounded", "slab", "comic"];
const TEXT_FONT_LABELS: Record<TextFont, string> = { sans: "Classic", serif: "Serif", mono: "Typewriter", display: "Bold", script: "Script", rounded: "Rounded", slab: "Slab", comic: "Comic" };
type TextAlign = "left" | "center" | "right";
const TEXT_FONTS: Record<TextFont, string> = {
  sans: "system-ui, sans-serif",
  serif: "Georgia, serif",
  mono: "ui-monospace, monospace",
  display: "Impact, 'Arial Black', sans-serif",
  script: "'Brush Script MT', 'Segoe Script', cursive",
  rounded: "'Trebuchet MS', system-ui, sans-serif",
  slab: "Rockwell, 'Courier New', serif",
  comic: "'Comic Sans MS', 'Comic Neue', cursive",
};
// Effects picker entries: the css is applied to the preview; badge is the circle label.
const EFFECT_OPTIONS: { name: string; css: string; bg: string; fg: string; badge: string }[] = [
  { name: "None", css: "none", bg: "#3f3f46", fg: "#fff", badge: "⊘" },
  { name: "Sunset", css: "sepia(0.3) saturate(1.4) contrast(1.05)", bg: "linear-gradient(#60a5fa,#f59e0b)", fg: "#fff", badge: "" },
  { name: "8K Ultra HD", css: "contrast(1.25) saturate(1.3) brightness(1.05)", bg: "#facc15", fg: "#000", badge: "8K\nULTRA HD" },
  { name: "Glitch", css: "contrast(1.4) hue-rotate(-30deg) saturate(1.6)", bg: "#000", fg: "#fff", badge: "GLITCH" },
  { name: "Teal", css: "hue-rotate(160deg) saturate(1.2)", bg: "linear-gradient(90deg,#0d9488,#2dd4bf)", fg: "#fff", badge: "" },
  { name: "Vintage", css: "sepia(0.55) contrast(0.9) brightness(1.05)", bg: "#a16207", fg: "#fff", badge: "VINTAGE" },
  { name: "Mono", css: "grayscale(1) contrast(1.1)", bg: "#52525b", fg: "#fff", badge: "B&W" },
  { name: "Vivid", css: "saturate(1.6) contrast(1.1)", bg: "linear-gradient(90deg,#f43f5e,#f59e0b)", fg: "#fff", badge: "" },
  { name: "Warm", css: "sepia(0.35) saturate(1.2) brightness(1.05)", bg: "linear-gradient(#fb923c,#fde68a)", fg: "#000", badge: "" },
  { name: "Cool", css: "brightness(1.05) contrast(1.05) hue-rotate(-12deg) saturate(1.1)", bg: "linear-gradient(#38bdf8,#818cf8)", fg: "#fff", badge: "" },
  { name: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.95)", bg: "#18181b", fg: "#fff", badge: "NOIR" },
  { name: "Retro", css: "sepia(0.45) hue-rotate(-20deg) saturate(1.4) contrast(0.95)", bg: "#b45309", fg: "#fff", badge: "RETRO" },
  { name: "Faded", css: "contrast(0.8) brightness(1.12) saturate(0.7)", bg: "#d6d3d1", fg: "#000", badge: "FADE" },
  { name: "Dreamy", css: "brightness(1.12) contrast(0.9) saturate(1.2) blur(0.4px)", bg: "linear-gradient(#f0abfc,#c4b5fd)", fg: "#fff", badge: "DREAM" },
  { name: "Ocean", css: "saturate(1.3) hue-rotate(10deg) brightness(1.04) contrast(1.05)", bg: "linear-gradient(#0369a1,#22d3ee)", fg: "#fff", badge: "" },
  { name: "Mint", css: "hue-rotate(60deg) saturate(0.8) brightness(1.08)", bg: "linear-gradient(#a7f3d0,#6ee7b7)", fg: "#000", badge: "" },
  { name: "Rose", css: "sepia(0.25) hue-rotate(-30deg) saturate(1.3) brightness(1.06)", bg: "linear-gradient(#fda4af,#fb7185)", fg: "#fff", badge: "" },
  { name: "Golden", css: "sepia(0.4) saturate(1.6) brightness(1.1) contrast(1.05)", bg: "linear-gradient(#fbbf24,#b45309)", fg: "#fff", badge: "GOLD" },
  { name: "Cinema", css: "contrast(1.25) saturate(0.85) brightness(0.92) sepia(0.1)", bg: "#1e293b", fg: "#fff", badge: "CINE" },
  { name: "Pop", css: "saturate(2) contrast(1.15) brightness(1.05)", bg: "linear-gradient(90deg,#ec4899,#8b5cf6,#06b6d4)", fg: "#fff", badge: "POP" },
  { name: "Drama", css: "contrast(1.5) saturate(1.2) brightness(0.9)", bg: "#7f1d1d", fg: "#fff", badge: "DRAMA" },
  { name: "Cyber", css: "hue-rotate(180deg) saturate(1.8) contrast(1.2)", bg: "linear-gradient(#7c3aed,#22d3ee)", fg: "#fff", badge: "CYBER" },
  { name: "Bright", css: "brightness(1.2) contrast(1.05)", bg: "#fef9c3", fg: "#000", badge: "" },
  { name: "Soft", css: "contrast(0.92) brightness(1.08) saturate(0.95) blur(0.3px)", bg: "#fce7f3", fg: "#000", badge: "SOFT" },
  { name: "Fresh", css: "brightness(1.1) saturate(1.25) hue-rotate(-5deg)", bg: "linear-gradient(#86efac,#22c55e)", fg: "#fff", badge: "" },
  { name: "Sepia", css: "sepia(0.8) contrast(1.05)", bg: "#78350f", fg: "#fff", badge: "SEPIA" },
];
// Templates shown on the Create page. Picking one opens the camera with it in mind.
const TEMPLATES = [
  { name: "Quick cut", desc: "Fast cuts to the beat", bg: "from-fuchsia-600 to-orange-400" },
  { name: "Slideshow", desc: "Photos with smooth transitions", bg: "from-sky-500 to-indigo-600" },
  { name: "Before & after", desc: "Show a change side by side", bg: "from-emerald-500 to-teal-600" },
  { name: "Countdown", desc: "3, 2, 1, then go", bg: "from-amber-400 to-red-500" },
  { name: "Split screen", desc: "Two clips in one frame", bg: "from-violet-500 to-pink-500" },
  { name: "Intro title", desc: "Big title, then your clip", bg: "from-slate-500 to-zinc-800" },
];

// Drafts are saved in this browser (the video file itself is not kept).
type SavedDraft = { id: string; caption: string; music: string | null; filter: string; speed: number; savedAt: number };
const DRAFTS_KEY = "sv-drafts";
function readDrafts(): SavedDraft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeDrafts(list: SavedDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
}


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
  { name: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  { name: "Warm", css: "sepia(0.35) saturate(1.2) brightness(1.05)" },
  { name: "Cool", css: "brightness(1.05) contrast(1.05) hue-rotate(-12deg) saturate(1.1)" },
  { name: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.95)" },
  { name: "Sepia", css: "sepia(0.8) contrast(1.05)" },
  { name: "Retro", css: "sepia(0.45) hue-rotate(-20deg) saturate(1.4) contrast(0.95)" },
  { name: "Faded", css: "contrast(0.8) brightness(1.12) saturate(0.7)" },
  { name: "Dreamy", css: "brightness(1.12) contrast(0.9) saturate(1.2) blur(0.4px)" },
  { name: "Sunset", css: "sepia(0.3) saturate(1.5) hue-rotate(-15deg) brightness(1.08)" },
  { name: "Ocean", css: "saturate(1.3) hue-rotate(10deg) brightness(1.04) contrast(1.05)" },
  { name: "Mint", css: "hue-rotate(60deg) saturate(0.8) brightness(1.08)" },
  { name: "Rose", css: "sepia(0.25) hue-rotate(-30deg) saturate(1.3) brightness(1.06)" },
  { name: "Golden", css: "sepia(0.4) saturate(1.6) brightness(1.1) contrast(1.05)" },
  { name: "Cinema", css: "contrast(1.25) saturate(0.85) brightness(0.92) sepia(0.1)" },
  { name: "Pop", css: "saturate(2) contrast(1.15) brightness(1.05)" },
  { name: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(1.05) saturate(0.8)" },
  { name: "Drama", css: "contrast(1.5) saturate(1.2) brightness(0.9)" },
  { name: "Cyber", css: "hue-rotate(180deg) saturate(1.8) contrast(1.2)" },
  { name: "Bright", css: "brightness(1.2) contrast(1.05)" },
  { name: "Soft", css: "contrast(0.92) brightness(1.08) saturate(0.95) blur(0.3px)" },
  { name: "Fresh", css: "brightness(1.1) saturate(1.25) hue-rotate(-5deg)" },
];

const WORD_STICKERS = ["WOW", "LOL", "OMG", "YAY", "LOVE", "NEW", "HOT", "#reels", "Vibes ✨", "Happy Birthday 🎂"];
const SHAPE_STICKERS = ["★", "♥", "●", "■", "▲", "◆", "✦", "☀", "☁", "⚡"];

type Mode = "photo" | "video" | "text";
type Step = "pick" | "filter" | "edit" | "preview" | "caption" | "text";

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

/* Once the user has allowed the camera, remember it (memory + storage) so the Allow screen is never shown again. */
let cameraGrantedInMemory = false;
function readCameraGranted(): boolean {
  if (cameraGrantedInMemory) return true;
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("sv-camera-granted") === "1";
  } catch {
    return false;
  }
}
function rememberCameraGranted() {
  cameraGrantedInMemory = true;
  try {
    window.localStorage.setItem("sv-camera-granted", "1");
  } catch {
    /* storage blocked: in-memory flag still applies */
  }
}

/* Live camera for the reel pick: asks permission first, then records a clip that goes to the edit step. */
function CameraCapture({
  onCapture,
  onClose,
  onMusic,
  musicId,
  initialFilter,
}: {
  onCapture: (file: File, url: string, meta: CaptureMeta) => void;
  onClose: () => void;
  onMusic: (t: MusicTrack) => void;
  musicId: string | null;
  initialFilter?: string;
}) {
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState(initialFilter ?? "none");
  const [musicOpen, setMusicOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  // Recorder callbacks are created once per recording, so they read the latest choices through refs.
  const metaRef = useRef<CaptureMeta>({ speed: 1, filter: "none" });
  metaRef.current = { speed, filter };
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState(() => readCameraGranted());
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // If the browser already has camera permission, skip the Allow screen.
  useEffect(() => {
    if (started) return;
    let cancelled = false;
    try {
      navigator.permissions?.query({ name: "camera" as PermissionName }).then((st) => {
        if (!cancelled && st.state === "granted") {
          rememberCameraGranted();
          setStarted(true);
        }
      }).catch(() => {});
    } catch {
      /* Permissions API not supported */
    }
    return () => {
      cancelled = true;
    };
  }, [started]);

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
        rememberCameraGranted();
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
      onCapture(file, URL.createObjectURL(blob), metaRef.current);
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
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onCapture(f, URL.createObjectURL(f), metaRef.current);
          e.target.value = "";
        }}
      />
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Camera className="h-12 w-12" />
          <p className="text-lg font-semibold">Camera aur mic ki permission chahiye</p>
          <p className="text-sm text-white/70">Reel record karne ke liye camera aur microphone ki zarurat hai.</p>
          <button type="button" onClick={() => setStarted(true)} className="rounded-lg sv-gradient-bg px-6 py-2.5 font-semibold text-white">
            Allow
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-white/40 px-6 py-2.5 text-sm font-semibold text-white">
            Video chunein
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
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg sv-gradient-bg px-4 py-2 text-sm font-semibold text-white"
                >
                  Video chunein
                </button>

              </div>
            )}
            <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4">
              <button type="button" aria-label="Close camera" onClick={close} className="p-1"><X className="h-7 w-7" /></button>
            </div>
            <div className="absolute right-4 top-16 flex flex-col items-end gap-5 text-sm font-semibold">
              <button type="button" onClick={() => setMusicOpen(true)} className="flex items-center gap-2 drop-shadow">
                Music <Music2 className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length])}
                className="flex items-center gap-2 drop-shadow"
              >
                Speed {speed}x <Gauge className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => setEffectsOpen((o) => !o)} className="flex items-center gap-2 drop-shadow">
                Effects <Sparkles className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => toast("Green screen isn't available in this version")}
                className="flex items-center gap-2 drop-shadow"
              >
                Green screen <ScanFace className="h-6 w-6" />
              </button>
            </div>
            {effectsOpen && (
              <div className="absolute inset-x-0 bottom-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFilter(f.css)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${filter === f.css ? "bg-white text-black" : "bg-black/50 text-white"}`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            {musicOpen && (
              <MusicPicker
                selectedId={musicId}
                onClose={() => setMusicOpen(false)}
                onSelect={(t) => {
                  onMusic(t);
                  setMusicOpen(false);
                  toast(`Music: ${t.title}`);
                }}
              />
            )}
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

/* Scroll area whose scrollbar is clipped away: the inner box is widened by the scrollbar width, so the
   content keeps its normal width and the scrollbar sits outside the visible area in every browser. */
function ClipScroll({ className, children }: { className?: string; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [gutter, setGutter] = useState(0);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => setGutter(el.offsetWidth - el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`${className ?? ""} overflow-hidden`}>
      <div ref={innerRef} className="h-full overflow-y-auto" style={{ width: `calc(100% + ${gutter}px)` }}>
        {children}
      </div>
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
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [music, setMusic] = useState("");
  const [textPost, setTextPost] = useState("");
  // Twit photos are picked from the gallery below the composer.
  const [twitPhotos, setTwitPhotos] = useState<string[]>([]);
  const canShareTwit = !!textPost.trim() || twitPhotos.length > 0;
  const [asReel, setAsReel] = useState(true);
  const [alsoStory, setAlsoStory] = useState(false);
  // Preview tools: bottom sheet (audio / text / stickers) and the items placed over the preview.
  const [toolSheet, setToolSheet] = useState<null | "stickers">(null);
  // Full-screen reel tools (match the Facebook reel editor screens).
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPanel, setEditorPanel] = useState<null | "filter" | "speed" | "crop">(null);
  const [editorAddOpen, setEditorAddOpen] = useState(false);
  const editorVideoInput = useRef<HTMLInputElement>(null);
  // Editor speed choices (the camera keeps its own SPEEDS list).
  const EDITOR_SPEEDS = [1, 1.25, 1.5, 2, 3] as const;
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorTime, setEditorTime] = useState(0);
  const editorRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | "start" | "end">(null);
  // Last trim range before Undo, so Redo can bring it back.
  const trimHistory = useRef<{ start: number; end: number } | null>(null);
  const [textOpen, setTextOpen] = useState(false);
  // Effects picker: the choice is previewed live and only applied with the check button.
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [effectPick, setEffectPick] = useState("none");
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [textFont, setTextFont] = useState<TextFont>("sans");
  // Text overlay being edited (tap a text on the video to edit it); null when adding new text.
  const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
  const [musicFromMix, setMusicFromMix] = useState(false);
  // "Mood" tile opens the same mood popup as the feed's mood box.
  const [moodOpen, setMoodOpen] = useState(false);
  // Set when the camera was opened from the Effects screen: the clip then returns to that screen.
  const effectsPending = useRef(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<SavedDraft[]>([]);
  // Green screen: pick a scene (background) and apply it to the preview.
  const [greenOpen, setGreenOpen] = useState(false);
  const [greenTab, setGreenTab] = useState<"scenes" | "roll">("scenes");
  const [greenScene, setGreenScene] = useState<string | null>(null);
  const greenPrev = useRef<string | null>(null);
  const greenInput = useRef<HTMLInputElement>(null);
  // Reel audio: picked track, mix levels, and the optional voiceover clip.
  const [musicTrack, setMusicTrack] = useState<MusicTrack | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [mixOpen, setMixOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [originalVolume, setOriginalVolume] = useState(1);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  // Speed, crop and mirror shown on the reel preview.
  const [speed, setSpeed] = useState(1);
  const [crop, setCrop] = useState<"fit" | "fill">("fit");
  // Editor crop: a frame of this shape; the video is cropped to it. "original" leaves the video whole.
  const [cropAspect, setCropAspect] = useState<string>("original");
  const CROP_RATIOS: Record<string, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };
  // Largest frame of the given shape inside the video box (container units keep the shape exact).
  const cropFrameStyle = (a: string): React.CSSProperties => {
    const r = CROP_RATIOS[a];
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: `min(100cqw, calc(100cqh * ${r}))`, height: `min(100cqh, calc(100cqw / ${r}))` };
  };
  const [mirror, setMirror] = useState(false);
  const [overlays, setOverlays] = useState<{ id: number; kind: "text" | "sticker" | "image"; value: string; color: string; font?: TextFont; align?: TextAlign; x?: number; y?: number }[]>([]);
  const [overlayText, setOverlayText] = useState("");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(false);
  // Playback progress of the reel preview, shown on the thin bar under the video.
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewVideo = useRef<HTMLVideoElement>(null);
  const mixVideo = useRef<HTMLVideoElement>(null);
  const [previewFlash, setPreviewFlash] = useState<"play" | "pause" | null>(null);
  // Preview plays the clip's own sound. If the browser blocks sound, fall back to muted playback.
  useEffect(() => {
    if (step !== "preview" || !draft.previews[0]) return;
    const v = previewVideo.current;
    if (!v) return;
    v.muted = false;
    setPreviewMuted(false);
    v.play().catch(() => {
      v.muted = true;
      setPreviewMuted(true);
      v.play().catch(() => {});
    });
  }, [step, draft.previews[0]]);
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
  const me = useMe();
  const [stickerTab, setStickerTab] = useState<string>("Trending");
  const [stickerQuery, setStickerQuery] = useState("");
  // Effects picker: built-in looks are ready; world looks are downloaded once, then used.
  const [effectRegion, setEffectRegion] = useState<"All" | EffectRegion>("All");
  const [downloadedFx, setDownloadedFx] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("sv-effects-downloaded") || "[]");
    } catch {
      return [];
    }
  });
  const [downloadingFx, setDownloadingFx] = useState<string | null>(null);
  const [locDraft, setLocDraft] = useState<string | null>(null);

  // Chosen song: its preview plays alongside the video (the audio element follows the video's position).
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const getMusic = () => {
    if (!musicRef.current) musicRef.current = new Audio();
    return musicRef.current;
  };
  const syncMusic = (v: HTMLVideoElement | null, playing: boolean) => {
    if (!musicTrack?.previewUrl) return;
    const a = getMusic();
    if (playing) {
      const t = musicTarget(v?.currentTime ?? 0);
      if (Math.abs(a.currentTime - t) > 0.3) a.currentTime = t;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };
  useEffect(() => {
    if (!musicTrack?.previewUrl) {
      musicRef.current?.pause();
      return;
    }
    const a = getMusic();
    a.loop = true;
    if (a.src !== musicTrack.previewUrl) a.src = musicTrack.previewUrl;
    const v = editorOpen ? editorRef.current : previewVideo.current;
    if (v && !v.paused) syncMusic(v, true);
    else a.pause();
  }, [musicTrack]);
  useEffect(() => {
    if (!open) musicRef.current?.pause();
  }, [open]);
  // Song card on the video: shown when a song is chosen; drag it, tap it to edit, drop it on the bin to remove.
  const [musicCard, setMusicCard] = useState<{ x: number; y: number } | null>(null);
  const [cardEditOpen, setCardEditOpen] = useState(false);
  const [cardStyle, setCardStyle] = useState(0);
  const [musicStart, setMusicStart] = useState(0); // where in the song the reel's audio starts (seconds)
  const [cardPlaying, setCardPlaying] = useState(false);
  const cardMoved = useRef(false);
  useEffect(() => {
    if (!musicTrack) {
      setMusicCard(null);
      setCardEditOpen(false);
      setMusicStart(0);
    } else {
      setMusicCard((c) => c ?? { x: 50, y: 72 });
    }
  }, [musicTrack]);
  // Position in the song for a given position in the video.
  const musicTarget = (videoTime: number) => {
    const a = getMusic();
    const len = isFinite(a.duration) && a.duration > 0 ? a.duration : 30;
    return (musicStart + videoTime) % len;
  };

  // Reverse playback, split cuts and removed parts (edited on the timeline).
  const [reversed, setReversed] = useState(false);
  const [revRunning, setRevRunning] = useState(false);
  const [cuts, setCuts] = useState<number[]>([]);
  const [removed, setRemoved] = useState<number[]>([]); // segment start times in hundredths of a second
  // Reverse playback: browsers can't play a video backwards, so the position is stepped back one seek at a
  // time. The next step waits for the previous seek to land (a seek that is cut off never draws its frame),
  // with a timer as a fallback so playback can't stall.
  const revRaf = useRef<number | null>(null); // non-null while reverse playback is running
  const revTimer = useRef<number | null>(null);
  const revSeekCleanup = useRef<(() => void) | null>(null);
  const revLast = useRef(0);
  const revPos = useRef(0);
  const stopReverse = () => {
    if (revTimer.current !== null) window.clearTimeout(revTimer.current);
    revTimer.current = null;
    revSeekCleanup.current?.();
    revSeekCleanup.current = null;
    revRaf.current = null;
    setRevRunning(false);
    setEditorPlaying(false);
  };
  const startReverse = (v: HTMLVideoElement) => {
    v.pause();
    revLast.current = performance.now();
    revPos.current = v.currentTime;
    setRevRunning(true);
    setEditorPlaying(true);
    revRaf.current = 1;
    const step = () => {
      if (revRaf.current === null) return;
      const now = performance.now();
      const dt = Math.min(0.25, (now - revLast.current) / 1000);
      revLast.current = now;
      const end = (trimEnd || duration || v.duration) as number;
      let t = revPos.current - dt * speed;
      if (t <= trimStart) t = Math.max(trimStart, end - 0.05);
      revPos.current = t;
      v.currentTime = t;
      if (revTimer.current !== null) window.clearTimeout(revTimer.current);
      revTimer.current = window.setTimeout(step, 200);
    };
    const onSeeked = () => step();
    v.addEventListener("seeked", onSeeked);
    revSeekCleanup.current = () => v.removeEventListener("seeked", onSeeked);
    step();
  };
  const toggleReverse = (v: HTMLVideoElement) => {
    if (revRaf.current !== null) stopReverse();
    else startReverse(v);
  };
  useEffect(() => {
    if (!reversed || !editorOpen) stopReverse();
  }, [reversed, editorOpen]);
  useEffect(() => () => {
    if (revTimer.current !== null) window.clearTimeout(revTimer.current);
    revSeekCleanup.current?.();
  }, []);
  // Timeline pieces: the trimmed clip cut at each split point.
  const segmentPoints = (dur: number) => {
    const end = trimEnd || dur;
    const inner = cuts.filter((c) => c > trimStart + 0.05 && c < end - 0.05).sort((a, b) => a - b);
    return [trimStart, ...inner, end];
  };
  const segmentIndexAt = (pts: number[], t: number) => {
    for (let i = 0; i < pts.length - 1; i++) if (t >= pts[i] && t < pts[i + 1]) return i;
    return -1;
  };
  const isRemovedSeg = (pts: number[], i: number) => removed.includes(Math.round(pts[i] * 100));
  // While playing, jump over parts the user removed.
  const skipRemoved = (v: HTMLVideoElement) => {
    if (cuts.length === 0 || removed.length === 0) return;
    const pts = segmentPoints(duration || v.duration);
    const i = segmentIndexAt(pts, v.currentTime);
    if (i < 0 || !isRemovedSeg(pts, i)) return;
    let j = i + 1;
    while (j < pts.length - 1 && isRemovedSeg(pts, j)) j++;
    v.currentTime = j < pts.length - 1 ? pts[j] : trimStart;
  };
  const splitAtPlayhead = () => {
    const v = editorRef.current;
    const t = v?.currentTime ?? editorTime;
    const end = trimEnd || duration;
    if (t <= trimStart + 0.1 || t >= end - 0.1) {
      toast("Move the playhead inside the clip to split");
      return;
    }
    setCuts((c) => [...c, Math.round(t * 100) / 100]);
    toast(`Split at ${(Math.round(t * 10) / 10).toFixed(1)}s: ${cuts.length + 2} parts. Use Remove part to drop one.`);
  };
  const togglePartRemoved = () => {
    const pts = segmentPoints(duration);
    const i = segmentIndexAt(pts, editorTime);
    if (i < 0) return;
    const key = Math.round(pts[i] * 100);
    setRemoved((r) => (r.includes(key) ? r.filter((x) => x !== key) : [...r, key]));
  };

  // Undo / redo for the editor: trim, filter, speed, cuts, removed parts, reverse and text/sticker overlays.
  type EditSnap = { trimStart: number; trimEnd: number; videoFilter: string; speed: number; overlays: typeof overlays; cuts: number[]; removed: number[]; reversed: boolean };
  const [, setHistTick] = useState(0);
  const histPast = useRef<EditSnap[]>([]);
  const histFuture = useRef<EditSnap[]>([]);
  const histPrev = useRef<EditSnap | null>(null);
  const histRestoring = useRef(false);
  useEffect(() => {
    const cur: EditSnap = { trimStart, trimEnd, videoFilter, speed, overlays, cuts, removed, reversed };
    if (histRestoring.current) {
      histRestoring.current = false;
      histPrev.current = cur;
      return;
    }
    const prev = histPrev.current;
    if (prev && JSON.stringify(prev) !== JSON.stringify(cur)) {
      histPast.current.push(prev);
      if (histPast.current.length > 50) histPast.current.shift();
      histFuture.current = [];
      setHistTick((t) => t + 1);
    }
    histPrev.current = cur;
  }, [trimStart, trimEnd, videoFilter, speed, overlays, cuts, removed, reversed]);
  const applySnap = (snap: EditSnap) => {
    const cur = histPrev.current;
    histRestoring.current = true;
    setTrimStart(snap.trimStart);
    setTrimEnd(snap.trimEnd);
    setVideoFilter(snap.videoFilter);
    setSpeed(snap.speed);
    setOverlays(snap.overlays);
    setCuts(snap.cuts);
    setRemoved(snap.removed);
    setReversed(snap.reversed);
    if (editorRef.current) editorRef.current.playbackRate = snap.speed;
    setHistTick((t) => t + 1);
    void cur;
  };
  const undoEdit = () => {
    const cur = histPrev.current;
    const prev = histPast.current.pop();
    if (!prev || !cur) return;
    histFuture.current.push(cur);
    applySnap(prev);
  };
  const redoEdit = () => {
    const cur = histPrev.current;
    const next = histFuture.current.pop();
    if (!next || !cur) return;
    histPast.current.push(cur);
    applySnap(next);
  };

  useEffect(() => {
    if (open) {
      setMode(createMode);
      setStep(createMode === "text" ? "text" : "pick");
      setDraft({ files: [], gallery: [], previews: [], filter: "none", zoom: 1 });
      setCaption(""); setLocation(""); setMusic(""); setTextPost(""); setTwitPhotos([]);
      setCover(null); setFrames([]); setCameraOpen(false);
      setTrimStart(0); setTrimEnd(0); setDuration(0); setVideoFilter("none");
      setTags(""); setAudience("everyone"); setAlsoStory(false);
      setMusicTrack(null); setMusicOpen(false); setMixOpen(false); setVoiceOpen(false);
      setVoiceUrl(null); setVoiceVolume(1); setOriginalVolume(1); setKeepOriginalSound(true);
      setSpeed(1); setCrop("fit"); setCropAspect("original"); setMirror(false); setToolSheet(null); setOverlays([]);
      setEditorOpen(false); setEditorPanel(null); setTextOpen(false); setMusicFromMix(false); setEffectsOpen(false);
      histPast.current = []; histFuture.current = []; histPrev.current = null;
      setCuts([]); setRemoved([]); setReversed(false);
    }
  }, [open, createMode]);

  // Reel edit step: sample frames from the clip for the cover picker.
  const videoSrc = mode === "video" ? draft.previews[0] : undefined;
  useEffect(() => {
    if (!open || (step !== "edit" && !editorOpen) || !videoSrc) return;
    let cancelled = false;
    setFrames([]);
    captureFrames(videoSrc).then((f) => {
      if (cancelled) return;
      setFrames(f);
      setCover((c) => c ?? f[0] ?? null);
      setCoverIdx(0);
    });
    return () => { cancelled = true; };
  }, [open, step, editorOpen, videoSrc]);

  // Full-screen editor: start playing when it opens.
  useEffect(() => {
    if (editorOpen) {
      // Only the editor plays while it is open, so the preview underneath stays silent.
      previewVideo.current?.pause();
      editorRef.current?.play().catch(() => {});
    }
  }, [editorOpen]);

  // Text, sticker and image overlays. Shown on the preview and in the editor.
  const renderOverlays = () => (
    <>
    {overlays.map((o, i) => (
      <button
        key={o.id}
        type="button"
        aria-label="Remove"
        onPointerDown={(e) => startOverlayDrag(e, o, i)}
        onClick={() => {
          // A drag ends with a click; that must not open anything.
          if (overlayMoved.current) {
            overlayMoved.current = false;
            return;
          }
          if (o.kind !== "text") return;
          setEditingOverlayId(o.id);
          setOverlayText(o.value);
          setOverlayColor(o.color);
          setTextFont(o.font ?? "sans");
          setTextAlign(o.align ?? "center");
          setTextOpen(true);
        }}
        className={`absolute touch-none whitespace-pre-wrap font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${o.kind === "sticker" ? "text-5xl" : "text-2xl px-2"}`}
        style={{
          left: `${o.x ?? 50}%`,
          top: `${o.y ?? 30 + ((i * 14) % 50)}%`,
          transform: "translate(-50%, -50%)",
          color: o.color,
          fontFamily: o.font ? TEXT_FONTS[o.font] : undefined,
          textAlign: o.align ?? "center",
          width: "max-content",
          maxWidth: "90%",
        }}
      >
        {o.kind === "sticker" && STICKER_EMOJI.has(o.value) ? <img src={twemojiUrl(o.value)} alt="" draggable={false} className="h-24 w-24 select-none" /> : o.kind === "image" ? <img src={o.value} alt="" draggable={false} className="h-28 w-28 rounded-full border-4 border-white object-cover" /> : o.value}
      </button>
    ))}
    {musicTrack && musicCard && (
      <div
        role="button"
        aria-label={`Song ${musicTrack.title}. Tap to edit`}
        onPointerDown={startCardDrag}
        onClick={() => {
          if (cardMoved.current) {
            cardMoved.current = false;
            return;
          }
          setCardEditOpen(true);
        }}
        className={`absolute touch-none w-[38%] max-w-[170px] overflow-hidden rounded-md shadow-xl ${cardStyle === 1 ? "bg-zinc-900 text-white" : cardStyle === 2 ? "bg-gradient-to-br from-fuchsia-600 to-indigo-700 text-white" : "bg-white text-zinc-900"}`}
        style={{ left: `${musicCard.x}%`, top: `${musicCard.y}%`, transform: "translate(-50%, -50%)" }}
      >
        {musicTrack.artwork ? (
          <img src={musicTrack.artwork} alt="" draggable={false} className="aspect-square w-full object-cover" />
        ) : (
          <span className="grid aspect-square w-full place-items-center bg-gradient-to-br from-fuchsia-600 via-orange-500 to-amber-300">
            <Music2 className="h-10 w-10 text-white/90" />
          </span>
        )}
        {cardStyle !== 3 && (
          <div className="px-2 py-2 text-center">
            <p className="truncate text-sm font-bold uppercase tracking-wide">{musicTrack.title}</p>
            <p className="truncate text-[10px] opacity-70">♫ {musicTrack.artist}</p>
          </div>
        )}
      </div>
    )}
    {dragOv && (
      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-4 left-1/2 z-50 grid -translate-x-1/2 place-items-center rounded-full transition-transform ${dragOv.hot ? "h-20 w-20 scale-110 bg-red-600" : "h-16 w-16 bg-black/60"}`}
      >
        <Trash2 className="h-7 w-7 text-white" />
      </div>
    )}
    </>
  );
  // Drag the song card. Dropping it on the bin removes the song from the reel.
  const startCardDrag = (e: React.PointerEvent<HTMLElement>) => {
    const frame = e.currentTarget.parentElement;
    if (!frame || !musicCard) return;
    cardMoved.current = false; // a stale flag from an earlier drag must not swallow this tap
    const r = frame.getBoundingClientRect();
    const ox = musicCard.x;
    const oy = musicCard.y;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    let hot = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) setDragOv({ id: -1, hot: false });
      moved = true;
      const nowHot = ev.clientY > r.bottom - r.height * 0.22 && Math.abs(ev.clientX - (r.left + r.width / 2)) < r.width * 0.2;
      if (nowHot !== hot) {
        hot = nowHot;
        setDragOv({ id: -1, hot });
      }
      setMusicCard({
        x: Math.min(100, Math.max(0, ox + (dx / r.width) * 100)),
        y: Math.min(100, Math.max(0, oy + (dy / r.height) * 100)),
      });
    };
    const up = () => {
      cardMoved.current = moved;
      if (moved && hot) setMusicCard(null); // the card goes; the song stays in the audio bar
      setDragOv(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // Set while a text or sticker is being dragged: shows the trash zone and whether it is over it.
  const [dragOv, setDragOv] = useState<{ id: number; hot: boolean } | null>(null);
  // Drag a text or sticker anywhere on the video. Position is stored as a percentage of the video frame.
  const overlayMoved = useRef(false);
  const startOverlayDrag = (e: React.PointerEvent<HTMLButtonElement>, o: (typeof overlays)[number], i: number) => {
    const frame = e.currentTarget.parentElement;
    if (!frame) return;
    overlayMoved.current = false; // a stale flag from an earlier drag must not swallow this tap
    const r = frame.getBoundingClientRect();
    const ox = o.x ?? 50;
    const oy = o.y ?? 30 + ((i * 14) % 50);
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    let hot = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) setDragOv({ id: o.id, hot: false });
      moved = true;
      // Over the trash zone: bottom fifth of the frame, centre.
      const nowHot = ev.clientY > r.bottom - r.height * 0.22 && Math.abs(ev.clientX - (r.left + r.width / 2)) < r.width * 0.2;
      if (nowHot !== hot) {
        hot = nowHot;
        setDragOv({ id: o.id, hot });
      }
      const nx = Math.min(100, Math.max(0, ox + (dx / r.width) * 100));
      const ny = Math.min(100, Math.max(0, oy + (dy / r.height) * 100));
      setOverlays((list) => list.map((x) => (x.id === o.id ? { ...x, x: nx, y: ny } : x)));
    };
    const up = () => {
      overlayMoved.current = moved;
      if (moved && hot) setOverlays((list) => list.filter((x) => x.id !== o.id));
      setDragOv(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  const addSticker = (kind: "text" | "sticker" | "image", value: string) => {
    setOverlays((list) => [...list, { id: Date.now(), kind, value, color: "#ffffff" }]);
    setToolSheet(null);
  };
  // Tabs: the emoji categories, then word and shape stickers, then animated (GIF) stickers.
  const STICKER_TABS: { id: string; label: string }[] = [
    ...STICKER_CATEGORIES.map((c) => ({ id: c, label: c })),
    { id: "Words", label: "Words" },
    { id: "Shapes", label: "Shapes" },
    { id: "GIF", label: "GIF" },
  ];
  // Every sticker in the library, filtered by the search box (keywords and names) or by tab.
  const stickerItems = (() => {
    type Item = { key: string; label: string; kind: "text" | "sticker"; cat: string; keys: string };
    const emoji: Item[] = STICKER_LIBRARY.map((x, i) => ({ key: `e-${i}`, label: x.emoji, kind: "sticker", cat: x.cat, keys: x.keys.toLowerCase() }));
    const words: Item[] = WORD_STICKERS.map((w) => ({ key: `w-${w}`, label: w, kind: "text", cat: "Words", keys: w.toLowerCase() }));
    const shapes: Item[] = SHAPE_STICKERS.map((x) => ({ key: `s-${x}`, label: x, kind: "sticker", cat: "Shapes", keys: "shape " + x }));
    const q = stickerQuery.trim().toLowerCase();
    if (q) return [...emoji, ...words, ...shapes].filter((x) => x.keys.includes(q) || x.label.toLowerCase().includes(q));
    if (stickerTab === "GIF") return emoji.filter((x) => x.cat === "Trending").slice(0, 24);
    return [...emoji, ...words, ...shapes].filter((x) => x.cat === stickerTab);
  })();

  const effectList = [
    ...EFFECT_OPTIONS.map((f) => ({ name: f.name, css: f.css, bg: f.bg, fg: f.fg, badge: f.badge, region: "Built in" as const, builtIn: true })),
    ...WORLD_EFFECTS.map((w, i) => ({ name: w.name, css: w.css, bg: worldEffectBg(i), fg: "#fff", badge: w.name.slice(0, 2).toUpperCase(), region: w.region, builtIn: false })),
  ];
  const effectTiles = effectList.filter((e) => e.builtIn || effectRegion === "All" || e.region === effectRegion);
  const tapEffect = (e: (typeof effectList)[number]) => {
    if (e.builtIn || downloadedFx.includes(e.name)) {
      setEffectPick(e.css);
      return;
    }
    if (downloadingFx) return;
    setDownloadingFx(e.name);
    window.setTimeout(() => {
      const next = [...downloadedFx, e.name];
      setDownloadedFx(next);
      try {
        localStorage.setItem("sv-effects-downloaded", JSON.stringify(next));
      } catch {
        /* storage full: the effect still works for this session */
      }
      setDownloadingFx(null);
      setEffectPick(e.css);
      toast(`${e.name} downloaded`);
    }, 900);
  };

  if (!open) return null;

  const close = () => (page ? navigate({ to: "/feed" }) : ui.closeAll());
  const filmStyle = () => ({
    filter: videoFilter === "none" ? undefined : videoFilter,
    transform: mirror ? "scaleX(-1)" : undefined,
  });
  // Leaving the music list returns to the mix screen when it was opened from there.
  const leaveMusic = () => {
    setMusicOpen(false);
    if (musicFromMix) {
      setMusicFromMix(false);
      setMixOpen(true);
    }
  };
  // Play or pause the editor video. Starts inside the trimmed range, uses the chosen speed,
  // and falls back to muted playback if the browser blocks sound.
  const toggleEditorPlay = () => {
    const v = editorRef.current;
    if (!v) return;
    if (reversed) {
      toggleReverse(v);
      return;
    }
    if (!v.paused) {
      v.pause();
      return;
    }
    const end = trimEnd || duration;
    if (end > trimStart + 0.1 && (v.currentTime >= end - 0.05 || v.currentTime < trimStart)) v.currentTime = trimStart;
    v.playbackRate = speed;
    v.play().catch(() => {
      v.muted = true;
      setPreviewMuted(true);
      v.play().catch(() => {
        setEditorPlaying(false);
        toast("Couldn't start the video. Tap play again.");
      });
    });
  };
  const closeEditor = () => {
    editorRef.current?.pause();
    setEditorOpen(false);
    setEditorPanel(null);
  };
  const togglePanel = (p: "filter" | "speed" | "crop") => setEditorPanel((cur) => (cur === p ? null : p));
  // Set the editor speed (0.25x to 3x, quarter steps) and apply it to both players.
  const applySpeed = (v: number) => {
    const sp = Math.min(3, Math.max(0.25, Math.round(v * 4) / 4));
    setSpeed(sp);
    if (editorRef.current) editorRef.current.playbackRate = sp;
    if (previewVideo.current) previewVideo.current.playbackRate = sp;
  };
  // Gallery in the editor: replace the clip. Cuts, removed parts and reverse belong to the old clip, so they reset.
  const replaceClipFromEditor = (files: FileList | null) => {
    if (!files?.length) return;
    pickVideo(files);
    setCuts([]);
    setRemoved([]);
    setReversed(false);
    toast("Clip replaced");
  };

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
          music: musicTrack ? musicTrack.title : music || null,
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
        if (!canShareTwit) return;
        await actions.createPost({ files: [], galleryUrls: twitPhotos, caption: textPost.trim(), isTwit: true });
        toast("Twit shared ✅");
        close();
        navigate({ to: "/moods" });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Share failed — try again");
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

  const canNext = mode === "video" ? !!draft.previews.length : mode === "text" ? canShareTwit : !!draft.previews.length;
  const nextLabel = mode === "video" ? (step === "caption" ? "Share" : "Next") : step === "filter" ? "Next" : "Share";

  const onNext = () => {
    if (nextLabel === "Share") return share();
    if (step === "filter") setStep("caption");
    if (step === "edit") setStep("caption");
  };

  return (
    <div
      {...(page ? {} : { "data-overlay-swipe": "" })}
      className={page ? "min-h-[calc(100vh-3.5rem)] md:min-h-screen flex flex-col bg-card" : `fixed inset-x-0 top-0 ${mode === "video" || mode === "text" ? "bottom-0" : "bottom-14"} md:inset-0 z-[55] bg-black/70 flex items-center justify-center md:p-6`}
      role={page ? "region" : "dialog"}
      aria-modal={page ? undefined : true}
    >
      <div className={page ? "bg-card w-full flex-1 flex flex-col animate-in-fade" : "bg-card w-full h-full md:h-[min(660px,88vh)] md:max-w-[900px] md:rounded-2xl flex flex-col overflow-hidden animate-in-fade"}>
        {/* header */}
        <header className="flex items-center justify-between border-b border-border px-3 h-12 shrink-0">
          <button type="button" aria-label="Back" onClick={() => (step === "pick" || step === "text" ? close() : step === "caption" && mode === "video" ? setStep("preview") : setStep("pick"))} className="p-1 hover:opacity-60">
            {step === "pick" || step === "text" ? (page ? null : <X className="h-5 w-5" />) : <ChevronLeft className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-[15px]">{title}</span>
          {step === "pick" && mode === "video" ? (
            <button type="button" aria-label="Settings" onClick={() => toast("Settings coming soon")} className="md:hidden p-1 hover:opacity-60">
              <Settings className="h-6 w-6" />
            </button>
          ) : step === "caption" && mode === "video" ? (
            <span className="w-8" aria-hidden="true" />
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

        {step === "preview" && mode === "video" && draft.previews[0] && (
          <div className="fixed inset-0 z-[70] bg-black text-white flex flex-col">
            <div className="flex items-center gap-3 px-3 py-3">
              <button type="button" aria-label="Back" onClick={() => setStep("pick")} className="p-1">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => { setMusicFromMix(false); setMusicOpen(true); }} className="flex-1 min-w-0 rounded-full bg-white/15 px-4 py-2 text-left">
                {musicTrack ? (
                  <span className="flex items-center gap-2">
                    {musicTrack.artwork ? (
                      <img src={musicTrack.artwork} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                    ) : (
                      <Music2 className="h-5 w-5 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{musicTrack.title}</span>
                      <span className="block truncate text-xs text-white/70">{musicTrack.artist}</span>
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="block text-sm font-semibold">Add audio</span>
                    <span className="block text-xs text-white/70">Discover suggestions</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label="Save draft"
                onClick={() => {
                  writeDrafts([
                    { id: String(Date.now()), caption, music: musicTrack?.title ?? (music || null), filter: videoFilter, speed, savedAt: Date.now() },
                    ...readDrafts(),
                  ]);
                  toast("Draft saved");
                }}
                className="p-1"
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>
            <div
              className="relative flex-1 min-h-0"
              onClick={(e) => {
                // Tapping the video anywhere plays or pauses it (the buttons on top keep their own clicks).
                if ((e.target as HTMLElement).closest("button, input, textarea, [data-no-tap]")) return;
                const v = previewVideo.current;
                if (!v) return;
                if (reversed) {
                  toggleReverse(v);
                  setPreviewFlash(revRaf.current !== null ? "play" : "pause");
                  window.setTimeout(() => setPreviewFlash(null), 600);
                  return;
                }
                if (v.paused) {
                  v.play().catch(() => {});
                  setPreviewFlash("play");
                } else {
                  v.pause();
                  setPreviewFlash("pause");
                }
                window.setTimeout(() => setPreviewFlash(null), 600);
              }}
            >
              {greenScene && <img src={greenScene} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <video
                ref={previewVideo}
                key={draft.previews[0]}
                src={draft.previews[0]}
                className={`absolute inset-0 h-full w-full ${crop === "fill" ? "object-cover" : "object-contain"}`}
                style={{
                  filter: videoFilter === "none" ? undefined : videoFilter,
                  transform: mirror ? "scaleX(-1)" : undefined,
                }}
                loop
                playsInline
                muted={previewMuted}
                onPlay={() => {
                  const v = previewVideo.current;
                  if (v) v.playbackRate = speed;
                  voiceRef.current?.play().catch(() => {});
                  syncMusic(v, true);
                }}
                onPause={() => {
                  voiceRef.current?.pause();
                  musicRef.current?.pause();
                }}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  setPreviewProgress(v.duration > 0 && isFinite(v.duration) ? v.currentTime / v.duration : 0);
                  const a = musicRef.current;
                  if (a && musicTrack?.previewUrl && !a.paused) {
                    const tt = musicTarget(v.currentTime);
                    if (Math.abs(a.currentTime - tt) > 0.4) a.currentTime = tt;
                  }
                  skipRemoved(v);
                }}
              />
              {previewFlash && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  {previewFlash === "play" ? (
                    <Play className="h-16 w-16 text-white/90 fill-white/90" />
                  ) : (
                    <Pause className="h-16 w-16 text-white/90 fill-white/90" />
                  )}
                </div>
              )}
              {musicTrack && (
                <div className="absolute left-1/2 top-3 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold">
                  <Music2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{musicTrack.title}</span>
                  <button type="button" aria-label="Remove music" onClick={() => setMusicTrack(null)} className="shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {renderOverlays()}
              <button
                type="button"
                aria-label={previewMuted ? "Sound on" : "Sound off"}
                onClick={() => {
                  const v = previewVideo.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setPreviewMuted(v.muted);
                  setKeepOriginalSound(!v.muted);
                }}
                className="absolute right-3 bottom-3 grid place-items-center h-10 w-10 rounded-full bg-black/60"
              >
                {previewMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
            <div className="h-0.5 bg-white/20">
              <div className="h-full bg-white" style={{ width: `${Math.min(100, previewProgress * 100)}%` }} />
            </div>
            <div className="flex items-center px-2 py-4">
              <div className="min-w-0 flex-1 overflow-x-auto touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max min-w-full justify-between gap-6 px-2">
                  {[
                    { label: "Audio", icon: Music2, action: () => setMixOpen(true) },
                    { label: "Edit", icon: Scissors, action: () => setEditorOpen(true) },
                    { label: "Effects", icon: Sparkles, action: () => { setEffectPick(videoFilter); setEffectsOpen(true); } },
                    { label: "Text", icon: TypeIcon, action: () => setTextOpen(true) },
                    { label: "Stickers", icon: Smile, action: () => setToolSheet("stickers") },
                  ].map((t) => (
                    <button key={t.label} type="button" onClick={t.action} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                      <span className="grid place-items-center h-14 w-14 rounded-full bg-white/15">
                        <t.icon className="h-6 w-6" />
                      </span>
                      <span className="text-[11px] font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" aria-label="Next" onClick={() => setStep("caption")} className="ml-2 flex shrink-0 flex-col items-center gap-1.5">
                <span className="grid place-items-center h-14 w-14 rounded-full sv-gradient-bg">
                  <ArrowRight className="h-6 w-6 text-white" />
                </span>
                <span className="text-[11px] font-medium">Next</span>
              </button>
            </div>
          {musicOpen && (
            <MusicPicker
              selectedId={musicTrack?.id ?? null}
              onClose={leaveMusic}
              onSelect={(t) => {
                setMusicTrack(t);
                toast(`Music: ${t.title}`);
                leaveMusic();
              }}
            />
          )}

          {mixOpen && (
            <div className="absolute inset-0 z-[90] flex flex-col bg-black text-white">
              <div className="flex items-center justify-between px-4 py-3">
                <button type="button" onClick={() => setMixOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={() => setMixOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Done
                </button>
              </div>
              <div
                className="relative min-h-0 flex-1"
                onClick={(e) => {
                  // Tapping anywhere on the video plays or pauses it.
                  if ((e.target as HTMLElement).closest("button, input, textarea, [data-no-tap]")) return;
                  const v = mixVideo.current;
                  if (!v) return;
                  if (v.paused) v.play().catch(() => {});
                  else v.pause();
                }}
              >
                <video
                  ref={mixVideo}
                  src={draft.previews[0]}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                  style={filmStyle()}
                />
              </div>
              <div className="space-y-4 rounded-t-2xl bg-zinc-900 px-5 pb-8 pt-4">
                <p className="text-center text-base font-semibold">Mix your audio</p>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10">
                    {keepOriginalSound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </span>
                  <div className="flex-1">
                    <SvSlider value={originalVolume} min={0} max={1} step={0.05} thickness={4} ariaLabel="Original sound volume" onChange={(v) => {
                      setOriginalVolume(v);
                      if (previewVideo.current) previewVideo.current.volume = v;
                    }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const on = !keepOriginalSound;
                      setKeepOriginalSound(on);
                      if (previewVideo.current) previewVideo.current.muted = !on;
                      setPreviewMuted(!on);
                    }}
                    className="w-14 text-right text-sm font-semibold text-[#60a5fa]"
                  >
                    {keepOriginalSound ? "Mute" : "On"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10">
                    <Mic className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    {voiceUrl ? (
                      <SvSlider value={voiceVolume} min={0} max={1} step={0.05} thickness={4} ariaLabel="Voiceover volume" onChange={(v) => {
                        setVoiceVolume(v);
                        if (voiceRef.current) voiceRef.current.volume = v;
                      }} />
                    ) : (
                      <div className="h-1 rounded bg-white/20" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceUrl) {
                        voiceRef.current?.pause();
                        voiceRef.current = null;
                        setVoiceUrl(null);
                      } else {
                        setMixOpen(false);
                        setVoiceOpen(true);
                      }
                    }}
                    className="w-14 text-right text-sm font-semibold text-[#60a5fa]"
                  >
                    {voiceUrl ? "Remove" : "Add"}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMixOpen(false);
                      setMusicFromMix(true);
                      setMusicOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#1877f2] py-3 text-sm font-semibold"
                  >
                    <Music2 className="h-4 w-4" />
                    {musicTrack ? "Change music" : "Add music"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMixOpen(false);
                      setVoiceOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#1877f2] py-3 text-sm font-semibold"
                  >
                    <Mic className="h-4 w-4" />
                    Add voiceover
                  </button>
                </div>
                {musicTrack && <p className="truncate text-center text-xs text-white/70">♪ {musicTrack.title}</p>}
              </div>
            </div>
          )}

          {voiceOpen && (
            <div className="absolute inset-0 z-[95] flex flex-col bg-black text-white">
              <div className="grid min-h-0 flex-1 place-items-center px-6 pt-4">
                <video
                  src={draft.previews[0]}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="aspect-[9/16] max-h-[45vh] max-w-full rounded-xl object-contain"
                  style={filmStyle()}
                />
              </div>
              <VoiceoverRecorder
                onCancel={() => {
                  setVoiceOpen(false);
                  setMixOpen(true);
                }}
                onDone={(url) => {
                  setVoiceUrl(url);
                  const a = new Audio(url);
                  a.volume = voiceVolume;
                  voiceRef.current = a;
                  setVoiceOpen(false);
                  setMixOpen(true);
                  toast("Voiceover added");
                }}
              />
            </div>
          )}

          {textOpen && (
            <div className="absolute inset-0 z-[90] flex flex-col bg-black text-white">
              <video src={draft.previews[0]} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-40" style={filmStyle()} />
              <div className="relative flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  aria-label="Close text"
                  onClick={() => {
                    setEditingOverlayId(null);
                    setTextOpen(false);
                    setOverlayText("");
                  }}
                  className="p-1"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="absolute right-3 top-16 z-10 flex flex-col items-center gap-5">
                  <button
                    type="button"
                    aria-label="Text colour"
                    onClick={() => setOverlayColor(TEXT_COLOURS[(TEXT_COLOURS.indexOf(overlayColor) + 1) % TEXT_COLOURS.length])}
                    className="h-7 w-7 rounded-full border-2 border-white"
                    style={{ background: "conic-gradient(#f87171, #facc15, #4ade80, #38bdf8, #a78bfa, #f87171)" }}
                  />
                  <button
                    type="button"
                    aria-label="Text font"
                    onClick={() => setTextFont((f) => TEXT_FONT_KEYS[(TEXT_FONT_KEYS.indexOf(f) + 1) % TEXT_FONT_KEYS.length])}
                    className="grid h-7 w-7 place-items-center rounded border-2 border-white text-xs font-bold"
                    style={{ fontFamily: TEXT_FONTS[textFont] }}
                  >
                    Aa
                  </button>
                  <button
                    type="button"
                    aria-label="Text alignment"
                    onClick={() => setTextAlign((a) => (a === "left" ? "center" : a === "center" ? "right" : "left"))}
                    className="p-1"
                  >
                    {textAlign === "left" ? <AlignLeft className="h-5 w-5" /> : textAlign === "right" ? <AlignRight className="h-5 w-5" /> : <AlignCenter className="h-5 w-5" />}
                  </button>
                  </div>
                  <button
                    type="button"
                    disabled={!overlayText.trim()}
                    onClick={() => {
                      const value = overlayText.trim();
                      if (editingOverlayId !== null) {
                        setOverlays((list) => list.map((x) => (x.id === editingOverlayId ? { ...x, value, color: overlayColor, font: textFont, align: textAlign } : x)));
                      } else {
                        setOverlays((list) => [...list, { id: Date.now(), kind: "text", value, color: overlayColor, font: textFont, align: textAlign }]);
                      }
                      setEditingOverlayId(null);
                      setOverlayText("");
                      setTextOpen(false);
                    }}
                    className="rounded-lg bg-white/15 px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
                  >
                    Done
                  </button>
                </div>
              </div>
              <div className="relative flex flex-1 items-center justify-center px-6">
                <textarea
                  autoFocus
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  maxLength={80}
                  rows={3}
                  placeholder="Start typing"
                  className="w-full resize-none bg-transparent text-3xl font-bold outline-none placeholder:text-white/60"
                  style={{ color: overlayColor, fontFamily: TEXT_FONTS[textFont], textAlign }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-6 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TEXT_FONT_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={`Font ${TEXT_FONT_LABELS[k]}`}
                    onClick={() => setTextFont(k)}
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold ${textFont === k ? "bg-white text-black" : "bg-white/15 text-white"}`}
                    style={{ fontFamily: TEXT_FONTS[k] }}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>
          )}

          {editorOpen && (
            <div className="absolute inset-0 z-[80] flex flex-col bg-black text-white">
              <div className="flex items-center justify-between px-4 py-3">
                <button type="button" onClick={closeEditor} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={closeEditor} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Done
                </button>
              </div>
              <div
                className="relative min-h-0 flex-1"
                onClick={(e) => {
                  // Tap anywhere on the video to play or pause it.
                  if ((e.target as HTMLElement).closest("button, input, textarea, [data-no-tap]")) return;
                  toggleEditorPlay();
                }}
              >
                <div className="absolute inset-0" style={{ containerType: "size" }}>
                  <div
                    className="absolute overflow-hidden"
                    style={cropAspect === "original" ? { inset: 0 } : cropFrameStyle(cropAspect)}
                  >
                  <video
                    ref={editorRef}
                    src={draft.previews[0]}
                    muted={previewMuted}
                    playsInline
                    className={`absolute inset-0 h-full w-full ${cropAspect === "original" ? "object-contain" : "object-cover"}`}
                    style={filmStyle()}
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (isFinite(d) && d > 0) {
                        // The full-length trim set on load is the starting point, not an edit.
                        histPast.current = [];
                        histFuture.current = [];
                        histPrev.current = { trimStart, trimEnd: trimEnd || d, videoFilter, speed, overlays, cuts, removed, reversed };
                        setDuration(d);
                        setTrimEnd((t) => t || d);
                      }
                      e.currentTarget.playbackRate = speed;
                    }}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      setEditorTime(v.currentTime);
                      // Loop inside the trimmed range.
                      const end = trimEnd || duration;
                      if (end > trimStart + 0.1 && (v.currentTime >= end || v.currentTime < trimStart)) v.currentTime = trimStart;
                      skipRemoved(v);
                    }}
                    onPlay={(e) => {
                      setEditorPlaying(true);
                      syncMusic(e.currentTarget, true);
                    }}
                    onPause={() => {
                      setEditorPlaying(false);
                      musicRef.current?.pause();
                    }}
                  />
                    {renderOverlays()}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-8 pt-2">
                <button
                  type="button"
                  aria-label={editorPlaying ? "Pause" : "Play"}
                  onClick={toggleEditorPlay}
                  className="p-1"
                >
                  {editorPlaying ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
                </button>
                <span className="text-sm tabular-nums">
                  <span className="font-semibold">{editorTime.toFixed(1)}</span> / {duration.toFixed(1)}
                </span>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    aria-label="Undo trim"
                    onClick={undoEdit}
                    disabled={histPast.current.length === 0}
                    className="p-1 disabled:opacity-30"
                  >
                    <Undo2 className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    aria-label="Redo trim"
                    onClick={redoEdit}
                    disabled={histFuture.current.length === 0}
                    className="p-1 disabled:opacity-30"
                  >
                    <Redo2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="px-6 pt-4">
                <div
                  ref={trackRef}
                  className="relative h-14 touch-none select-none overflow-hidden rounded-md bg-zinc-800"
                  onPointerDown={(e) => {
                    if (!duration) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width;
                    const near = (frac: number) => Math.abs(frac - x) * r.width < 18;
                    if (near(trimStart / duration)) dragRef.current = "start";
                    else if (near((trimEnd || duration) / duration)) dragRef.current = "end";
                    else if (editorRef.current) {
                      editorRef.current.currentTime = Math.min(Math.max(trimStart, x * duration), trimEnd || duration);
                    }
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!dragRef.current || !duration) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    const t = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * duration;
                    if (dragRef.current === "start") setTrimStart(Math.max(0, Math.min(t, trimEnd - 0.5)));
                    else setTrimEnd(Math.min(duration, Math.max(t, trimStart + 0.5)));
                  }}
                  onPointerUp={() => {
                    dragRef.current = null;
                  }}
                  onPointerCancel={() => {
                    dragRef.current = null;
                  }}
                >
                  <div className="absolute inset-0 flex opacity-70">
                    {frames.map((f, i) => (
                      <img key={i} src={f} alt="" draggable={false} className="h-full flex-1 object-cover" />
                    ))}
                  </div>
                  {duration > 0 && (
                    <>
                      <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${(trimStart / duration) * 100}%` }} />
                      <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${(1 - (trimEnd || duration) / duration) * 100}%` }} />
                      <div
                        className="absolute inset-y-0 rounded-md border-y-4 border-yellow-400"
                        style={{ left: `${(trimStart / duration) * 100}%`, right: `${(1 - (trimEnd || duration) / duration) * 100}%` }}
                      >
                        <span className="absolute inset-y-0 left-0 w-3 rounded-l-md bg-yellow-400" />
                        <span className="absolute inset-y-0 right-0 w-3 rounded-r-md bg-yellow-400" />
                      </div>
                      {cuts.map((c) => (
                        <div key={c} className="absolute inset-y-0 w-0.5 bg-cyan-300" style={{ left: `${(c / duration) * 100}%` }} />
                      ))}
                      {segmentPoints(duration).slice(0, -1).map((p, i, arr) =>
                        isRemovedSeg(segmentPoints(duration), i) ? (
                          <div
                            key={`rm-${p}`}
                            className="absolute inset-y-0 bg-black/70"
                            style={{ left: `${(p / duration) * 100}%`, width: `${((arr[i + 1] ?? p) - p) / duration * 100}%` }}
                          />
                        ) : null,
                      )}
                      <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(editorTime / duration) * 100}%` }} />
                    </>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setMixOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-dashed border-white/40 px-2 py-2 text-left text-xs text-white/80">
                    {musicTrack ? (
                      <>
                        {musicTrack.artwork ? (
                          <img src={musicTrack.artwork} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                        ) : (
                          <Music2 className="h-4 w-4 shrink-0" />
                        )}
                        <span className="min-w-0 break-words leading-tight">
                          <span className="font-semibold">{musicTrack.title}</span>
                          <span className="block text-[10px] text-white/60">{musicTrack.artist}</span>
                        </span>
                      </>
                    ) : (
                      <span className="w-full text-center">+ Audio</span>
                    )}
                  </button>
                  <button type="button" onClick={() => setTextOpen(true)} className="flex min-w-0 flex-1 items-center justify-center rounded-md border border-dashed border-white/40 px-2 py-2 text-center text-xs text-white/80">
                    <span className="max-w-full whitespace-pre-line break-words leading-tight">
                      {(() => {
                        const lastText = [...overlays].reverse().find((o) => o.kind === "text");
                        return lastText ? lastText.value : "+ Text";
                      })()}
                    </span>
                  </button>
                  {cuts.length > 0 && (
                    <button type="button" onClick={togglePartRemoved} className="flex-1 rounded-md border border-dashed border-cyan-300/70 py-2 text-xs text-cyan-200">
                      {removed.includes(Math.round((segmentPoints(duration)[Math.max(0, segmentIndexAt(segmentPoints(duration), editorTime))] ?? 0) * 100)) ? "Restore part" : "Remove part"}
                    </button>
                  )}
                </div>
              </div>
              {editorPanel === "speed" && (
                <div className="mt-3 space-y-4 px-5 pb-1">
                  <p className="text-center text-3xl font-bold">{speed.toFixed(2)}x</p>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label="Slower" onClick={() => applySpeed(speed - 0.25)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="range"
                      min={0.25}
                      max={3}
                      step={0.25}
                      value={speed}
                      aria-label="Playback speed"
                      onChange={(e) => applySpeed(Number(e.target.value))}
                      className="min-w-0 flex-1 accent-white"
                    />
                    <button type="button" aria-label="Faster" onClick={() => applySpeed(speed + 0.25)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between gap-2">
                    {EDITOR_SPEEDS.map((sp) => (
                      <div key={sp} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applySpeed(sp)}
                          className={`relative rounded-full px-3 py-2 text-sm font-semibold ${speed === sp ? "bg-white text-black" : "bg-white/10"}`}
                        >
                          {Number.isInteger(sp) ? sp.toFixed(1) : String(sp)}
                          {sp === 3 && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded bg-red-600 text-[9px] font-bold">P</span>}
                        </button>
                        {sp === 1 && <span className="text-[10px] text-white/60">Normal</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {editorPanel && editorPanel !== "speed" && (
                <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
                  {editorPanel === "filter" &&
                    FILTERS.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => setVideoFilter(f.css)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${videoFilter === f.css ? "bg-white text-black" : "bg-white/10"}`}
                      >
                        {f.name}
                      </button>
                    ))}
                  {editorPanel === "crop" &&
                    ["original", "9:16", "1:1", "4:5", "16:9"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCropAspect(c)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${cropAspect === c ? "bg-white text-black" : "bg-white/10"}`}
                      >
                        {c === "original" ? "Original" : c}
                      </button>
                    ))}
                </div>
              )}
              <div className="mt-4 flex gap-6 overflow-x-auto px-5 pb-6 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { label: "Add", icon: Plus, on: false, action: () => setEditorAddOpen(true) },
                  {
                    label: "Reshoot",
                    icon: Video,
                    on: false,
                    action: () => {
                      closeEditor();
                      setCameraOpen(true);
                    },
                  },
                  { label: "Adjust", icon: SlidersHorizontal, on: editorPanel === "filter", action: () => togglePanel("filter") },
                  { label: "Speed", icon: Gauge, on: editorPanel === "speed", action: () => togglePanel("speed") },
                  { label: "Crop", icon: Crop, on: editorPanel === "crop", action: () => togglePanel("crop") },
                  { label: "Mirror", icon: FlipHorizontal2, on: mirror, action: () => setMirror((m) => !m) },
                  {
                    label: "Reverse",
                    icon: Repeat2,
                    on: reversed,
                    action: () => {
                      const next = !reversed;
                      setReversed(next);
                      const v = editorRef.current;
                      if (v) {
                        if (next) startReverse(v);
                        else {
                          stopReverse();
                          v.play().catch(() => {});
                        }
                      }
                      toast(next ? "Reverse playback" : "Normal playback");
                    },
                  },
                  { label: "Split", icon: Scissors, on: cuts.length > 0, action: splitAtPlayhead },
                  {
                    label: "Cover",
                    icon: ImagePlus,
                    on: false,
                    action: () => {
                      closeEditor();
                      setStep("edit");
                    },
                  },
                ].map((t) => (
                  <button key={t.label} type="button" onClick={t.action} className={`flex w-14 shrink-0 flex-col items-center gap-1.5 ${t.on ? "text-[#60a5fa]" : ""}`}>
                    <t.icon className="h-6 w-6" />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                ))}
              </div>
              {editorAddOpen && (
                <div className="absolute inset-0 z-[85] flex flex-col justify-end bg-black/60" onClick={() => setEditorAddOpen(false)}>
                  <div className="space-y-3 rounded-t-2xl bg-zinc-900 px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
                    <p className="text-center text-base font-semibold">Add to reel</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorAddOpen(false);
                        closeEditor();
                        editorVideoInput.current?.click();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-left"
                    >
                      <ImagePlus className="h-5 w-5 shrink-0" />
                      <span>
                        <span className="block font-semibold">Gallery</span>
                        <span className="block text-xs text-white/60">Replace the clip with a video from your phone</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorAddOpen(false);
                        closeEditor();
                        setCameraOpen(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-left"
                    >
                      <Camera className="h-5 w-5 shrink-0" />
                      <span>
                        <span className="block font-semibold">Camera</span>
                        <span className="block text-xs text-white/60">Record a new clip</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => setEditorAddOpen(false)} className="w-full rounded-lg bg-white/10 py-3 text-sm font-semibold">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {musicTrack && cardEditOpen && (
            <div className="absolute inset-0 z-[92] flex flex-col bg-black/90 text-white">
              <div className="flex items-center justify-between px-4 py-3">
                <button type="button" onClick={() => setCardEditOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  type="button"
                  aria-label="Remove card"
                  onClick={() => {
                    setMusicCard(null);
                    setCardEditOpen(false);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setCardEditOpen(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">
                  Done
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
                <div className={`w-56 overflow-hidden rounded-md shadow-xl ${cardStyle === 1 ? "bg-zinc-900 text-white" : cardStyle === 2 ? "bg-gradient-to-br from-fuchsia-600 to-indigo-700 text-white" : "bg-white text-zinc-900"}`}>
                  {musicTrack.artwork ? (
                    <img src={musicTrack.artwork} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <span className="grid aspect-square w-full place-items-center bg-gradient-to-br from-fuchsia-600 via-orange-500 to-amber-300">
                      <Music2 className="h-12 w-12 text-white/90" />
                    </span>
                  )}
                  {cardStyle !== 3 && (
                    <div className="px-3 py-3 text-center">
                      <p className="truncate text-base font-bold uppercase tracking-wide">{musicTrack.title}</p>
                      <p className="truncate text-xs opacity-70">♫ {musicTrack.artist}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {["Classic", "Dark", "Colour", "Cover"].map((name, i) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCardStyle(i)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${cardStyle === i ? "bg-white text-black" : "bg-white/10"}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="w-full max-w-xs">
                  <div className="mb-1 flex justify-between text-xs text-white/70">
                    <span>Start from</span>
                    <span>{musicStart.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={0.5}
                    value={musicStart}
                    aria-label="Song start"
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMusicStart(v);
                      const a = getMusic();
                      if (!a.paused) a.currentTime = v;
                    }}
                    className="w-full accent-[#1877f2]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-zinc-900 px-4 py-4">
                <button
                  type="button"
                  aria-label="Change song"
                  onClick={() => {
                    setCardEditOpen(false);
                    setMusicFromMix(false);
                    setMusicOpen(true);
                  }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#1877f2]"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCardEditOpen(false);
                    setMusicFromMix(false);
                    setMusicOpen(true);
                  }}
                  className="min-w-0 flex-1 text-center"
                >
                  <p className="truncate font-semibold">{musicTrack.title}</p>
                  <p className="truncate text-sm text-white/70">{musicTrack.artist} · Tap to change</p>
                </button>
                <button
                  type="button"
                  aria-label={cardPlaying ? "Pause song" : "Play song"}
                  onClick={() => {
                    const a = getMusic();
                    if (!a.paused) {
                      a.pause();
                      setCardPlaying(false);
                      return;
                    }
                    if (a.src !== musicTrack.previewUrl && musicTrack.previewUrl) a.src = musicTrack.previewUrl;
                    a.currentTime = musicStart;
                    a.loop = true;
                    a.play().then(() => setCardPlaying(true), () => toast("This song can't play right now"));
                  }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white/10"
                >
                  {cardPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {toolSheet === "stickers" && (
            <div className="absolute inset-0 z-[90] flex flex-col justify-end bg-black/40" onClick={() => setToolSheet(null)}>
              <div className="max-h-[85%] overflow-y-auto rounded-t-3xl bg-zinc-800 px-4 pb-8 pt-3 text-white" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/40" />
                <label className="mb-4 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                  <Search className="h-4 w-4 text-white/60" />
                  <input
                    value={stickerQuery}
                    onChange={(e) => setStickerQuery(e.target.value)}
                    placeholder="Search stickers"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
                  />
                </label>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {[
                    { label: "Location", icon: MapPin, color: "text-sky-500" },
                    { label: `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`, icon: Clock, color: "text-yellow-500", key: "Time" },
                    { label: "GIF", icon: Search, color: "text-green-500" },
                    { label: "Music", icon: Music2, color: "text-pink-500" },
                    { label: "Avatar", icon: Smile, color: "text-red-500" },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        if (c.key === "Time") {
                          addSticker("text", `🕒 ${c.label}`);
                        } else if (c.label === "Location") {
                          setLocDraft("");
                        } else if (c.label === "GIF") {
                          setStickerTab("gif");
                        } else if (c.label === "Music") {
                          setToolSheet(null);
                          setMusicFromMix(false);
                          setMusicOpen(true);
                        } else if (c.label === "Avatar") {
                          if (me?.avatar_url) addSticker("image", me.avatar_url);
                          else toast("Add a profile photo to use Avatar");
                        }
                      }}
                      className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-900"
                    >
                      <c.icon className={`h-5 w-5 ${c.color}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
                {locDraft !== null && (
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = locDraft.trim();
                      if (!v) return;
                      addSticker("text", `📍 ${v}`);
                      setLocDraft(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={locDraft}
                      onChange={(e) => setLocDraft(e.target.value)}
                      maxLength={40}
                      placeholder="Type a place"
                      className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-white/50"
                    />
                    <button type="submit" disabled={!locDraft.trim()} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40">
                      Add
                    </button>
                  </form>
                )}
                <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {STICKER_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setStickerTab(t.id);
                        setStickerQuery("");
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${stickerTab === t.id ? "bg-white text-zinc-900" : "bg-white/10"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid max-h-[42vh] grid-cols-4 gap-2 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {stickerItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => addSticker(item.kind, item.label)}
                      aria-label={`Add sticker ${item.label}`}
                      className={`grid aspect-square place-items-center rounded-xl ${item.kind === "text" ? "bg-white/10 px-1 text-center text-sm font-bold" : "text-4xl"}`}
                    >
                      <span className={stickerTab === "GIF" && !stickerQuery && item.kind === "sticker" ? "inline-block animate-bounce" : ""}>{item.kind === "sticker" && STICKER_EMOJI.has(item.label) ? <img src={twemojiUrl(item.label)} alt="" draggable={false} className="h-12 w-12 select-none" /> : item.label}</span>
                    </button>
                  ))}
                  {stickerItems.length === 0 && <p className="col-span-4 py-6 text-center text-sm text-white/60">No stickers match.</p>}
                  <p className="col-span-4 pt-2 text-center text-[10px] text-white/40">Artwork: Twemoji, CC-BY 4.0</p>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {effectsOpen && (
          <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
              {draft.previews[0] ? (
                <video
                  src={draft.previews[0]}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: effectPick === "none" ? undefined : effectPick, transform: mirror ? "scaleX(-1)" : undefined }}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                  <p className="text-sm text-white/70">No video yet. Choose one from your gallery or record a new one, then pick an effect.</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => videoInput.current?.click()} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold">
                      Choose video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        effectsPending.current = true;
                        setEffectsOpen(false);
                        setCameraOpen(true);
                      }}
                      className="rounded-lg bg-[#1877f2] px-4 py-2.5 text-sm font-semibold"
                    >
                      Make video
                    </button>
                  </div>
                </div>
              )}
              <div className="relative mt-auto flex flex-col gap-5 pb-6">
                <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["All", ...EFFECT_REGIONS] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEffectRegion(r)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${effectRegion === r ? "bg-white text-black" : "bg-white/10 text-white"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex gap-4 overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {effectTiles.map((f) => {
                    const ready = f.builtIn || downloadedFx.includes(f.name);
                    const selected = effectPick === f.css;
                    // Use the clip's first frame when it is loaded, otherwise a local demo photo.
                    const thumb = frames[0] ?? "/demo/feed/p10.jpg";
                    return (
                      <button
                        key={f.name}
                        type="button"
                        aria-label={f.name}
                        onClick={() => tapEffect(f)}
                        className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 p-1"
                      >
                        <span className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-full ${selected ? "ring-[3px] ring-white ring-offset-2 ring-offset-black" : ""}`}>
                          <img src={thumb} alt="" draggable={false} className="h-full w-full object-cover" style={{ filter: f.css === "none" ? undefined : f.css }} />
                          {!ready && (
                            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full bg-black/80">
                              {downloadingFx === f.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            </span>
                          )}
                        </span>
                        <span className={`w-full truncate text-center text-[10px] font-semibold ${selected ? "text-white" : "text-white/70"}`}>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between px-6">
                  <button type="button" aria-label="Cancel effect" onClick={() => setEffectsOpen(false)} className="grid h-14 w-14 place-items-center rounded-full bg-zinc-800">
                    <X className="h-7 w-7" />
                  </button>
                  <div className="text-center">
                    <p className="text-lg font-bold">{effectList.find((f) => f.css === effectPick)?.name ?? "None"}</p>
                    <p className="text-sm text-white/70">
                      {(() => {
                        const cur = effectList.find((f) => f.css === effectPick);
                        if (!cur || cur.builtIn) return "Built in";
                        return downloadedFx.includes(cur.name) ? cur.region : `Tap to download · ${cur.region}`;
                      })()}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Apply effect"
                    onClick={() => {
                      setVideoFilter(effectPick);
                      setEffectsOpen(false);
                      if (!draft.previews[0]) toast("Effect saved. It will apply to your video.");
                    }}
                    className="grid h-14 w-14 place-items-center rounded-full bg-[#1877f2]"
                  >
                    <Check className="h-7 w-7" />
                  </button>
                </div>
              </div>
            </div>
          )}

        <MoodDialog open={moodOpen} onOpenChange={setMoodOpen} onShared={() => close()} />

        {templatesOpen && (
          <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-900 text-white">
            <div className="flex items-center gap-3 px-3 py-4">
              <button type="button" aria-label="Back" onClick={() => setTemplatesOpen(false)} className="p-1">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <span className="text-base font-semibold">Templates</span>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto px-4 pb-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setTemplatesOpen(false);
                    setCameraOpen(true);
                    toast(`Template: ${t.name}`);
                  }}
                  className={`flex aspect-[9/12] flex-col justify-end rounded-2xl bg-gradient-to-br ${t.bg} p-3 text-left`}
                >
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-xs text-white/80">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {draftsOpen && (
          <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-900 text-white">
            <div className="flex items-center gap-3 px-3 py-4">
              <button type="button" aria-label="Back" onClick={() => setDraftsOpen(false)} className="p-1">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <span className="text-base font-semibold">Drafts</span>
            </div>
            {drafts.length === 0 ? (
              <p className="px-6 pt-10 text-center text-sm text-white/70">No drafts yet. Open a reel preview and tap ⋯ to save one.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto px-4 pb-6">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCaption(d.caption);
                        setMusic(d.music ?? "");
                        setDraftsOpen(false);
                        toast("Draft opened. Pick the video to continue.");
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold">{d.caption || "Untitled draft"}</p>
                      <p className="text-xs text-white/60">{new Date(d.savedAt).toLocaleString()}</p>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete draft"
                      onClick={() => {
                        const next = drafts.filter((x) => x.id !== d.id);
                        writeDrafts(next);
                        setDrafts(next);
                      }}
                      className="p-2 text-white/70"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {greenOpen && (
          <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setGreenScene(greenPrev.current);
                  setGreenOpen(false);
                }}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <SwitchCamera className="h-6 w-6" />
              <button
                type="button"
                onClick={() => {
                  setGreenOpen(false);
                  toast("Background set");
                }}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold"
              >
                Done
              </button>
            </div>
            <div className="relative mx-auto mb-4 min-h-0 w-[56%] max-w-[260px] flex-1 overflow-hidden rounded-2xl bg-zinc-800">
              {greenScene && <img src={greenScene} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              {draft.previews[0] ? (
                <video src={draft.previews[0]} muted autoPlay loop playsInline className="relative h-full w-full object-contain" />
              ) : (
                <div className="relative grid h-full place-items-center p-4 text-center text-sm text-white/70">Pick or record a video first to see it here.</div>
              )}
            </div>
            <div className="rounded-t-2xl bg-white text-zinc-900">
              <div className="flex border-b border-zinc-200 text-sm font-semibold">
                {(["scenes", "roll"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGreenTab(t)}
                    className={`flex-1 py-3 ${greenTab === t ? "border-b-2 border-[#1877f2] text-[#1877f2]" : "text-zinc-500"}`}
                  >
                    {t === "scenes" ? "Scenes" : "Camera roll"}
                  </button>
                ))}
              </div>
              {greenTab === "scenes" ? (
                <div className="grid max-h-[38vh] grid-cols-4 gap-0.5 overflow-y-auto">
                  {DEMO_GALLERY.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setGreenScene(src)}
                      className={`aspect-square overflow-hidden ${greenScene === src ? "ring-2 ring-inset ring-[#1877f2]" : ""}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid place-items-center gap-3 p-8">
                  <button
                    type="button"
                    onClick={() => greenInput.current?.click()}
                    className="rounded-lg bg-[#1877f2] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Choose from camera roll
                  </button>
                  <input
                    ref={greenInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setGreenScene(URL.createObjectURL(f));
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {musicOpen && step === "pick" && mode === "video" && (
          <div className="fixed inset-0 z-[90]">
            <MusicPicker
              selectedId={musicTrack?.id ?? null}
              onClose={() => setMusicOpen(false)}
              onSelect={(t) => {
                setMusicTrack(t);
                setMusicOpen(false);
                toast(`Music: ${t.title}`);
              }}
            />
          </div>
        )}
        {cameraOpen && mode === "video" && (
          <CameraCapture
            onClose={() => {
              setCameraOpen(false);
              if (effectsPending.current) {
                effectsPending.current = false;
                setEffectsOpen(true);
              }
            }}
            musicId={musicTrack?.id ?? null}
            onMusic={(t) => setMusicTrack(t)}
            initialFilter={effectPick}
            onCapture={(file, url, meta) => {
              setDraft({ files: [file], gallery: [], previews: [url], filter: "none", zoom: 1 });
              setCover(null);
              setSpeed(meta.speed);
              setVideoFilter(meta.filter);
              setCameraOpen(false);
              setStep("preview");
              if (effectsPending.current) {
                // The chosen effect goes with the new clip on the effects screen.
                effectsPending.current = false;
                setEffectsOpen(true);
              }
            }}
          />
        )}

        <input ref={editorVideoInput} type="file" accept="video/*" hidden onChange={(e) => { replaceClipFromEditor(e.target.files); e.target.value = ""; }} />

        {/* body */}
        {step === "pick" && mode === "video" && (
          <div className="md:hidden flex-1 flex flex-col min-h-0 bg-background">
            <div className="overflow-x-auto touch-pan-x overscroll-x-contain pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max min-w-full justify-between gap-6 px-4">
              {[
                { label: "Camera", icon: Camera, action: () => setCameraOpen(true) },
                { label: "Music", icon: Music2, action: () => setMusicOpen(true) },
                { label: "Templates", icon: LayoutTemplate, action: () => setTemplatesOpen(true) },
                {
                  label: "Drafts",
                  icon: FileText,
                  action: () => {
                    setDrafts(readDrafts());
                    setDraftsOpen(true);
                  },
                },
                {
                  label: "Green screen",
                  icon: ScanFace,
                  action: () => {
                    greenPrev.current = greenScene;
                    setGreenTab("scenes");
                    setGreenOpen(true);
                  },
                },
                {
                  label: "Effects",
                  icon: Sparkles,
                  action: () => {
                    // No random clip: with no video the effects screen shows a black frame and offers Choose / Make video.
                    setEffectPick(videoFilter);
                    if (draft.previews.length) setStep("preview");
                    setEffectsOpen(true);
                  },
                },
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
                  <button key={o.label} type="button" onClick={() => (o.label === "Mood" ? setMoodOpen(true) : toast(`${o.label} is coming soon`))} className="bg-card p-8 flex flex-col items-center gap-3 hover:bg-muted">
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
            <div
              className="relative shrink-0 md:flex-1 grid place-items-center bg-black/90 md:p-4 md:min-h-[300px] h-[calc(100dvh-3.5rem)] md:h-auto"
              onClick={(e) => {
                // Tap anywhere on the video to play or pause it.
                if ((e.target as HTMLElement).closest("button, input, textarea, [data-no-tap]")) return;
                const v = editVideo.current;
                if (!v) return;
                if (v.paused) v.play().catch(() => {});
                else v.pause();
              }}
            >
              <video
                ref={editVideo}
                src={draft.previews[0]}
                style={{ filter: videoFilter === "none" ? undefined : videoFilter }}
                className="absolute inset-0 h-full w-full md:static md:h-auto md:max-h-[70vh] md:w-auto md:max-w-full md:aspect-[9/16] object-contain md:rounded-lg"
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
              <div data-no-tap className="absolute inset-x-0 bottom-0 z-10 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-12 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="self-center pr-1 text-[11px] font-semibold text-white">Cover</span>
                {frames.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setCover(f); setCoverIdx(i); }}
                    aria-label={`Cover frame ${i + 1} (mobile)`}
                    className={`h-16 w-10 shrink-0 overflow-hidden rounded border-2 ${coverIdx === i ? "border-white" : "border-transparent"}`}
                  >
                    <img src={f} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
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

        {step === "caption" && mode === "video" && (
          <ClipScroll className="flex-1 min-h-0 bg-background">
            <div className="flex gap-4 border-b border-border p-4">
              <div className="h-44 w-[100px] shrink-0 overflow-hidden rounded-lg bg-black">
                {cover ? (
                  <img src={cover} alt="Reel cover" className="h-full w-full object-cover" />
                ) : (
                  <video src={draft.previews[0]} className="h-full w-full object-cover" muted playsInline />
                )}
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe your reel. You can also add hashtags here."
                rows={6}
                className="flex-1 min-w-0 bg-transparent text-base outline-none resize-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="divide-y divide-border">
              <label className="flex items-center gap-4 px-4 py-4">
                <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                  <Globe className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium">Who can see this?</span>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as "everyone" | "followers")}
                    className="bg-transparent text-sm text-muted-foreground outline-none"
                  >
                    <option value="everyone">Public</option>
                    <option value="followers">Followers only</option>
                  </select>
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </label>
              <label className="flex items-center gap-4 px-4 py-4">
                <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                  <PlusCircle className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium">Share to your story</span>
                  <span className="block text-sm text-muted-foreground">{alsoStory ? "On" : "Off"}</span>
                </span>
                <input type="checkbox" checked={alsoStory} onChange={(e) => setAlsoStory(e.target.checked)} className="accent-[#0095F6] h-5 w-5" />
              </label>
              <div className="flex items-center gap-4 px-4 py-4">
                <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                  <Tag className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium">Tag people</span>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. @rohan, @priya"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 px-4 py-4">
                <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                  <MapPin className="h-5 w-5" />
                </span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="flex-1 min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                />
              </div>
              {[
                { label: "Instagram", icon: Share2, sub: "" },
                { label: "Add AI label", icon: PlusCircle, sub: "Label realistic content made with AI" },
                { label: "Add topics", icon: Hash, sub: "" },
                { label: "A/B tests", icon: FlaskConical, sub: "" },
              ].map((r) => (
                <button key={r.label} type="button" onClick={() => toast(`${r.label} coming soon`)} className="flex w-full items-center gap-4 px-4 py-4 text-left">
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium">{r.label}</span>
                    {r.sub && <span className="block text-xs text-muted-foreground">{r.sub}</span>}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
              {!showMoreOptions ? (
                <button type="button" onClick={() => setShowMoreOptions(true)} aria-expanded={false} className="flex w-full items-center gap-4 px-4 py-4 text-left">
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                    <MoreHorizontal className="h-5 w-5" />
                  </span>
                  <span className="flex-1 min-w-0 text-[15px] font-medium">See more options</span>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </button>
              ) : (
                <button type="button" onClick={() => toast("Earn rewards coming soon")} className="flex w-full items-center gap-4 px-4 py-4 text-left">
                  <span className="grid place-items-center h-11 w-11 rounded-full bg-muted shrink-0">
                    <Coins className="h-5 w-5" />
                  </span>
                  <span className="flex-1 min-w-0 text-[15px] font-medium">Earn rewards</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background p-4">
              <button type="button" aria-label="Save draft" onClick={() => toast("Draft saved")} className="grid place-items-center h-12 w-12 rounded-lg bg-muted shrink-0">
                <Save className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={!canNext || busy}
                onClick={() => share()}
                className="flex-1 rounded-lg sv-gradient-bg py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Sharing…" : "Share now"}
              </button>
            </div>
          </ClipScroll>
        )}

        {step === "caption" && (mode as string) !== "video" && (
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
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 space-y-4 p-4 md:p-6">
              <textarea
                value={textPost}
                onChange={(e) => setTextPost(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                autoFocus
                className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {twitPhotos.length > 0 && (
                <p className="text-xs text-muted-foreground">{twitPhotos.length} photo{twitPhotos.length > 1 ? "s" : ""} selected</p>
              )}
              <button
                type="button"
                onClick={share}
                disabled={busy || !canShareTwit}
                className="w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm py-2.5 hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Sharing…" : "Share"}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-border p-1">
              <div className="grid grid-cols-3 gap-1">
                {DEMO_GALLERY.map((url, i) => {
                  const pos = twitPhotos.indexOf(url);
                  const selected = pos >= 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={selected ? "Remove photo" : "Add photo"}
                      aria-pressed={selected}
                      onClick={() =>
                        setTwitPhotos((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))
                      }
                      className={`relative aspect-square overflow-hidden bg-muted ${selected ? "ring-2 ring-inset ring-primary" : ""}`}
                    >
                      <MediaImg src={url} alt="" className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1 top-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                          {pos + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
