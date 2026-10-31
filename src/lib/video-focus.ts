// Shared playback for feed videos.
//  - Only one video plays at a time: the one nearest to the middle of the screen (and at least half visible).
//    The others pause. When a video becomes the active one again it starts from the beginning if it had ended.
//  - One sound setting (on/off + volume) applies to every feed video and is remembered on this device.

type Listener = () => void;

export interface VideoAudio {
  muted: boolean;
  volume: number;
}

const STORAGE_KEY = "sv-video-audio";
const ratios = new Map<HTMLVideoElement, number>();
let active: HTMLVideoElement | null = null;
let frame = 0;

function loadAudio(): VideoAudio {
  const fallback: VideoAudio = { muted: false, volume: 1 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<VideoAudio>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : 1,
    };
  } catch {
    return fallback;
  }
}

let audio: VideoAudio = loadAudio();
const audioListeners = new Set<Listener>();

export function getVideoAudio(): VideoAudio {
  return audio;
}

export function subscribeVideoAudio(cb: Listener): () => void {
  audioListeners.add(cb);
  return () => audioListeners.delete(cb);
}

export function setVideoAudio(patch: Partial<VideoAudio>) {
  audio = { ...audio, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(audio));
  } catch {
    /* storage blocked: the setting still applies for this visit */
  }
  for (const el of ratios.keys()) applyAudio(el);
  audioListeners.forEach((l) => l());
}

function applyAudio(el: HTMLVideoElement) {
  el.muted = audio.muted;
  el.volume = audio.volume;
}

function play(el: HTMLVideoElement) {
  applyAudio(el);
  const p = el.play();
  if (p && typeof p.catch === "function") {
    p.catch((err: unknown) => {
      // A play request cancelled by a pause (AbortError) is normal when the visitor scrolls away;
      // it must not change the shared sound setting.
      if ((err as { name?: string } | null)?.name !== "NotAllowedError") return;
      // The browser blocked sound before the visitor interacted with the page: start muted,
      // and the visitor can turn the sound on with the speaker button.
      if (!el.muted) {
        setVideoAudio({ muted: true });
        el.muted = true;
        el.play().catch(() => {});
      }
    });
  }
}

function setPreload(el: HTMLVideoElement, value: "auto" | "metadata") {
  // Swipe-preview copies (embed mode) never download video.
  if (document.documentElement.hasAttribute("data-embed")) return;
  if (el.preload !== value) el.preload = value;
}

function reconcile() {
  const mid = window.innerHeight / 2;
  let best: HTMLVideoElement | null = null;
  let bestDist = Infinity;
  for (const [el, ratio] of ratios) {
    if (ratio < 0.5 || !el.isConnected) continue;
    const r = el.getBoundingClientRect();
    const dist = Math.abs((r.top + r.bottom) / 2 - mid);
    if (dist < bestDist) {
      best = el;
      bestDist = dist;
    }
  }
  if (best === active) {
    if (best && best.paused && !best.ended) play(best);
    return;
  }
  if (active) {
    active.pause();
    setPreload(active, "metadata");
  }
  active = best;
  if (best) {
    // Only the video that plays downloads in full. Others keep to metadata, so the playing one
    // is not slowed down by several downloads sharing the connection.
    setPreload(best, "auto");
    if (best.ended) best.currentTime = 0;
    play(best);
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    reconcile();
  });
}

export function isActiveVideo(el: HTMLVideoElement): boolean {
  return active === el;
}

export function registerVideo(el: HTMLVideoElement, ratio: number) {
  ratios.set(el, ratio);
  applyAudio(el);
  schedule();
}

export function updateVideoRatio(el: HTMLVideoElement, ratio: number) {
  ratios.set(el, ratio);
  schedule();
}

export function unregisterVideo(el: HTMLVideoElement) {
  ratios.delete(el);
  if (active === el) active = null;
  schedule();
}

if (typeof document !== "undefined") {
  // Any scroll (window or inner list) can change which video is nearest the middle.
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
}
