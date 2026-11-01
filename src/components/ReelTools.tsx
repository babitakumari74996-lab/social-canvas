import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search, Bookmark, MoreHorizontal, Music2, Mic, Square } from "lucide-react";
import { toast } from "sonner";

// Track list for the reel music picker. These are catalogue entries only: the app ships no
// audio files, so picking a track puts its name on the reel (playback of the song is not included).
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  plays: number;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "t1", title: "Meri Zindagi Hai Tu", artist: "Jubin Nautiyal, Neeti Mohan", plays: 2100000 },
  { id: "t2", title: "Chalray Chalray Waal", artist: "Ravzz Musica", plays: 1300000 },
  { id: "t3", title: "सफलता को रफ़्तार", artist: "Media For The Masses", plays: 105000 },
  { id: "t4", title: "Happy Birthday Ki Dua", artist: "Vicky D Parekh", plays: 671000 },
  { id: "t5", title: "Happy Birthday To You Aaj", artist: "Ajit Shree", plays: 87000 },
  { id: "t6", title: "Happy Birthday Song Che", artist: "Ajit Shree", plays: 53000 },
  { id: "t7", title: "I love u baby", artist: "Mahaveer Desai", plays: 191000 },
  { id: "t8", title: "भटक गए हम राहो मे", artist: "Rangeela Rajasthan", plays: 113000 },
  { id: "t9", title: "Nature Love", artist: "Prince K Singh", plays: 1100000 },
  { id: "t10", title: "KGF 3 Theme", artist: "Tajmeel Sherif", plays: 800000 },
  { id: "t11", title: "काम क्या करते हो कौन हम", artist: "Bharat Kumar", plays: 201000 },
];

const fmtPlays = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);

// Full-screen music list: search, For you / Trending tabs, rows with a play (use) button.
export function MusicPicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId?: string | null;
  onSelect: (t: MusicTrack) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"forYou" | "trending">("forYou");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  let list = MUSIC_TRACKS.filter((t) => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  if (tab === "trending") list = [...list].sort((a, b) => b.plays - a.plays);

  return (
    <div className="absolute inset-0 z-[95] flex flex-col bg-zinc-900 text-white">
      <div className="flex items-center gap-3 px-3 pt-4 pb-3">
        <button type="button" aria-label="Back" onClick={onClose} className="p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <label className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5">
          <Search className="h-4 w-4 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search music"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
          />
        </label>
        <button type="button" aria-label="Saved music" onClick={() => toast("Saved music will show here")} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
          <Bookmark className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2 px-4 pb-3">
        {(["forYou", "trending"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-[#1877f2]/25 text-[#60a5fa]" : "text-white/80"}`}
          >
            {k === "forYou" ? "For you" : "Trending"}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-y-auto px-3 pb-4">
        {list.length === 0 && <li className="p-6 text-center text-sm text-white/60">No songs match “{query}”.</li>}
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-gradient-to-br from-fuchsia-600 via-orange-500 to-amber-300">
              <Music2 className="h-6 w-6 text-white/90" />
            </span>
            <button type="button" onClick={() => onSelect(t)} className="min-w-0 flex-1 text-left">
              <p className={`truncate text-[15px] font-semibold ${selectedId === t.id ? "text-emerald-300" : ""}`}>{t.title}</p>
              <p className="truncate text-xs text-white/60">
                {t.artist} · {fmtPlays(t.plays)}
              </p>
            </button>
            <div className="flex items-center gap-1">
              {menuId === t.id && (
                <button type="button" onClick={() => onSelect(t)} className="rounded-full bg-[#1877f2] px-3 py-1 text-xs font-semibold">
                  Use
                </button>
              )}
              <button type="button" aria-label={`More options for ${t.title}`} onClick={() => setMenuId(menuId === t.id ? null : t.id)} className="p-2 text-white/80">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              aria-label={`Use ${t.title}`}
              onClick={() => onSelect(t)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/25"
            >
              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-white" />
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
