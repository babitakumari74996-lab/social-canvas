import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search, Bookmark, Music2, Mic, Square, Play, Pause, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Songs come from Apple's public iTunes Search API. Each result carries a 30-second preview
// stream. The app never downloads a song: the user listens to the preview, then taps the row
// to put that song on the reel.
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  plays?: number;
  previewUrl?: string;
  artwork?: string;
}

// Regions shown as chips. Each one searches the iTunes catalogue for that country's store.
const MUSIC_REGIONS: { id: string; label: string; country: string; term: string }[] = [
  { id: "world", label: "World", country: "US", term: "top hits" },
  { id: "in", label: "India", country: "IN", term: "bollywood hits" },
  { id: "us", label: "US", country: "US", term: "pop hits" },
  { id: "uk", label: "UK", country: "GB", term: "uk top hits" },
  { id: "kr", label: "Korea", country: "KR", term: "k-pop" },
  { id: "jp", label: "Japan", country: "JP", term: "j-pop" },
  { id: "latam", label: "Latin", country: "MX", term: "reggaeton" },
  { id: "br", label: "Brazil", country: "BR", term: "funk brasil" },
  { id: "afro", label: "Africa", country: "NG", term: "afrobeats" },
  { id: "es", label: "Spain", country: "ES", term: "spanish pop" },
  { id: "fr", label: "France", country: "FR", term: "french pop" },
  { id: "de", label: "Germany", country: "DE", term: "german pop" },
  { id: "tr", label: "Turkey", country: "TR", term: "turkish pop" },
  { id: "ru", label: "Russia", country: "RU", term: "russian pop" },
  { id: "arab", label: "Arabic", country: "AE", term: "arabic pop" },
];

async function searchSongs(term: string, country: string, signal: AbortSignal): Promise<MusicTrack[]> {
  const url = `https://itunes.apple.com/search?media=music&entity=song&limit=40&country=${country}&term=${encodeURIComponent(term)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("search failed");
  const json = (await res.json()) as { results: { trackId: number; trackName: string; artistName: string; previewUrl?: string; artworkUrl100?: string }[] };
  return json.results
    .filter((r) => r.previewUrl)
    .map((r) => ({
      id: String(r.trackId),
      title: r.trackName,
      artist: r.artistName,
      previewUrl: r.previewUrl,
      artwork: r.artworkUrl100?.replace("100x100", "300x300"),
    }));
}

// Full-screen music list: region chips, search, and rows. The round button previews a song;
// tapping the row uses it.
export function MusicPicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId?: string | null;
  onSelect: (t: MusicTrack) => void;
  onClose: () => void;
}) {
  const [region, setRegion] = useState(MUSIC_REGIONS[0].id);
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load songs for the chosen region, or the typed search (debounced).
  useEffect(() => {
    const r = MUSIC_REGIONS.find((x) => x.id === region) ?? MUSIC_REGIONS[0];
    const term = query.trim() || r.term;
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    const timer = window.setTimeout(() => {
      searchSongs(term, r.country, ctrl.signal)
        .then((list) => setTracks(list))
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          setTracks([]);
          setFailed(true);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, query.trim() ? 350 : 0);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [region, query]);

  // Stop any preview when the list closes.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePreview = (t: MusicTrack) => {
    if (!t.previewUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (playingId === t.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    a.src = t.previewUrl;
    a.onended = () => setPlayingId(null);
    a.play().then(
      () => setPlayingId(t.id),
      () => toast("This preview can't play right now"),
    );
  };

  return (
    <div className="absolute inset-0 z-[95] flex flex-col bg-zinc-900 text-white">
      <div className="flex items-center gap-3 px-3 pt-4 pb-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => {
            audioRef.current?.pause();
            onClose();
          }}
          className="p-1"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <label className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5">
          <Search className="h-4 w-4 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any song or artist"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
          />
        </label>
        <button type="button" aria-label="Saved music" onClick={() => toast("Saved music will show here")} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MUSIC_REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setQuery("");
              setRegion(r.id);
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${region === r.id && !query.trim() ? "bg-[#1877f2]/25 text-[#60a5fa]" : "bg-white/5 text-white/80"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && (
          <li className="flex items-center justify-center gap-2 p-6 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading songs…
          </li>
        )}
        {!loading && failed && <li className="p-6 text-center text-sm text-white/60">Couldn’t load songs. Check your internet connection and try again.</li>}
        {!loading && !failed && tracks.length === 0 && <li className="p-6 text-center text-sm text-white/60">No songs found{query.trim() ? ` for “${query}”` : ""}.</li>}
        {tracks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2">
            {t.artwork ? (
              <img src={t.artwork} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gradient-to-br from-fuchsia-600 via-orange-500 to-amber-300">
                <Music2 className="h-6 w-6 text-white/90" />
              </span>
            )}
            <button type="button" onClick={() => onSelect(t)} className="min-w-0 flex-1 text-left">
              <p className={`truncate text-[15px] font-semibold ${selectedId === t.id ? "text-emerald-300" : ""}`}>{t.title}</p>
              <p className="truncate text-xs text-white/60">{t.artist}</p>
            </button>
            {selectedId === t.id && <Check className="h-5 w-5 shrink-0 text-emerald-300" aria-label="Selected" />}
            <button
              type="button"
              aria-label={playingId === t.id ? `Pause preview of ${t.title}` : `Preview ${t.title}`}
              onClick={() => togglePreview(t)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/25"
            >
              {playingId === t.id ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Hold-style voiceover recorder: tap to start, tap to stop. The clip is played back with the reel preview.
export function VoiceoverRecorder({ onDone, onCancel }: { onDone: (url: string) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 28 }, () => 0.15));
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const meter = window.setInterval(() => {
      setLevels((l) => [...l.slice(1), 0.2 + Math.random() * 0.8]);
    }, 120);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(meter);
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) onDone(URL.createObjectURL(blob));
        else toast("Nothing was recorded");
      };
      rec.start();
      recRef.current = rec;
      setSeconds(0);
      setRecording(true);
    } catch {
      toast("Microphone access is needed for voiceover");
    }
  };

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
    setLevels(Array.from({ length: 28 }, () => 0.15));
  };

  return (
    <div className="bg-zinc-900 px-5 pb-8 pt-4 text-white">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Back to mix"
          onClick={() => {
            if (recording) stop();
            onCancel();
          }}
          className="p-1"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <span className="flex-1 text-center text-base font-semibold">Voiceover</span>
        <span className="w-8" />
      </div>
      <div className="flex h-20 items-center justify-center gap-[3px] rounded-md bg-zinc-700/60 px-3">
        {levels.map((v, i) => (
          <span key={i} className="w-[3px] rounded-full bg-white/80" style={{ height: `${Math.round((recording ? v : 0.15) * 100)}%` }} />
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-sm tabular-nums text-white/70">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <p className="mt-3 text-center text-sm text-white/70">Tap or hold to record audio over the video.</p>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          aria-label={recording ? "Stop voiceover" : "Start voiceover"}
          onClick={recording ? stop : start}
          className={`grid h-20 w-20 place-items-center rounded-full ${recording ? "bg-red-600" : "bg-zinc-600"}`}
        >
          {recording ? <Square className="h-7 w-7 fill-white text-white" /> : <Mic className="h-8 w-8 text-white" />}
        </button>
      </div>
    </div>
  );
}
