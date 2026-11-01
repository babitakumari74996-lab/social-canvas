import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Search, Play, Mic, Square, X, Music2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { SvSlider } from "@/components/SvSlider";

// Track list shown in the reel music picker. These are catalogue entries only:
// no audio files ship with the app, so picking a track places its name on the reel.
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
  { id: "t6", title: "I love u baby", artist: "Mahaveer Desai", plays: 191000 },
  { id: "t7", title: "भटक गए हम राहो मे", artist: "Rangeela Rajasthan", plays: 113000 },
  { id: "t8", title: "Nature Love", artist: "Prince K Singh", plays: 1100000 },
  { id: "t9", title: "KGF 3 Theme", artist: "Tajmeel Sherif", plays: 800000 },
  { id: "t10", title: "काम क्या करते हो", artist: "Bharat Kumar", plays: 201000 },
];

export function MusicPicker({
  selectedId,
  onSelect,
  onClose,
  onMix,
}: {
  selectedId?: string | null;
  onSelect: (t: MusicTrack) => void;
  onClose: () => void;
  onMix?: () => void;
}) {
  const [tab, setTab] = useState<"forYou" | "trending">("forYou");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  let list = MUSIC_TRACKS.filter((t) => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q));
  if (tab === "trending") list = [...list].sort((a, b) => b.plays - a.plays);

  return (
    <div className="absolute inset-0 z-[95] flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center gap-3 px-3 py-3">
        <button type="button" aria-label="Back" onClick={onClose} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-3 py-2">
          <Search className="h-4 w-4 text-white/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
          />
        </div>
      </div>
      <div className="flex gap-6 px-4 text-sm font-semibold">
        {(["forYou", "trending"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`pb-2 border-b-2 ${tab === k ? "border-white text-white" : "border-transparent text-white/50"}`}
          >
            {k === "forYou" ? "For you" : "Trending"}
          </button>
        ))}
      </div>
      <ul className="flex-1 overflow-y-auto px-2 py-2">
        {list.length === 0 && <li className="p-6 text-center text-sm text-white/60">No songs match “{query}”.</li>}
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-orange-400">
              <Music2 className="h-5 w-5 text-white" />
            </span>
            <button type="button" onClick={() => onSelect(t)} className="min-w-0 flex-1 text-left">
              <p className={`truncate text-sm font-medium ${selectedId === t.id ? "text-emerald-300" : ""}`}>{t.title}</p>
              <p className="truncate text-xs text-white/60">{t.artist}</p>
            </button>
            <button
              type="button"
              aria-label={`Use ${t.title}`}
              onClick={() => onSelect(t)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15"
            >
              <Play className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {onMix && (
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={onMix} className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold">
            Mix audio
          </button>
        </div>
      )}
    </div>
  );
}

// Mix sheet: original sound level with mute toggle, optional voiceover, and entry points for music/voiceover.
export function MixAudioSheet({
  keepOriginal,
  onToggleOriginal,
  originalVolume,
  onOriginalVolume,
  musicTitle,
  voiceUrl,
  voiceVolume,
  onVoiceVolume,
  onRemoveVoice,
  onAddMusic,
  onAddVoice,
  onClose,
}: {
  keepOriginal: boolean;
  onToggleOriginal: () => void;
  originalVolume: number;
  onOriginalVolume: (v: number) => void;
  musicTitle: string | null;
  voiceUrl: string | null;
  voiceVolume: number;
  onVoiceVolume: (v: number) => void;
  onRemoveVoice: () => void;
  onAddMusic: () => void;
  onAddVoice: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Mix your audio</span>
        <button type="button" aria-label="Close" onClick={onClose} className="p-1">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="rounded-xl bg-white/10 p-3">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            {keepOriginal ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Original sound
          </span>
          <button type="button" onClick={onToggleOriginal} className="text-xs font-semibold text-white/80 underline">
            {keepOriginal ? "Mute" : "Turn on"}
          </button>
        </div>
        <SvSlider
          value={originalVolume}
          min={0}
          max={1}
          step={0.05} thickness={4}
          ariaLabel="Original sound volume"
          onChange={onOriginalVolume}
        />
      </div>
      {voiceUrl && (
        <div className="rounded-xl bg-white/10 p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Voiceover</span>
            <button type="button" onClick={onRemoveVoice} className="text-xs font-semibold text-white/80 underline">
              Remove
            </button>
          </div>
          <SvSlider value={voiceVolume} min={0} max={1} step={0.05} thickness={4} ariaLabel="Voiceover volume" onChange={onVoiceVolume} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onAddMusic} className="rounded-xl bg-white/10 py-3 text-sm font-semibold">
          {musicTitle ? "Change music" : "Add music"}
        </button>
        <button type="button" onClick={onAddVoice} className="rounded-xl bg-white/10 py-3 text-sm font-semibold">
          {voiceUrl ? "Re-record voiceover" : "Add voiceover"}
        </button>
      </div>
    </div>
  );
}

// Hold-style voiceover recorder: tap to start, tap to stop. The clip plays with the reel preview.
export function VoiceoverRecorder({ onDone, onCancel }: { onDone: (url: string) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
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
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-white">
      <div className="flex w-full items-center justify-between">
        <button type="button" aria-label="Cancel voiceover" onClick={() => { if (recording) stop(); onCancel(); }} className="p-1">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-base font-semibold">Voiceover</span>
        <span className="w-8" />
      </div>
      <p className="font-mono text-3xl tabular-nums">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
      </p>
      <button
        type="button"
        aria-label={recording ? "Stop voiceover" : "Start voiceover"}
        onClick={recording ? stop : start}
        className="grid h-20 w-20 place-items-center rounded-full border-4 border-white/70"
      >
        {recording ? <Square className="h-8 w-8 fill-red-500 text-red-500" /> : <Mic className="h-8 w-8 text-red-500" />}
      </button>
      <p className="text-xs text-white/60">{recording ? "Tap to stop" : "Tap to record"}</p>
    </div>
  );
}
