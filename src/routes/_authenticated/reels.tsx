import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { useMyProfile } from "@/lib/auth";
import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Heart, MessageCircle, Share2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reels")({
  component: ReelsPage,
});

function ReelCard({ path, caption, username }: { path: string; caption: string | null; username: string }) {
  const { data } = useSignedUrl(path);
  return (
    <div className="card-flat overflow-hidden animate-in-fade">
      <div className="relative aspect-[9/16] bg-gradient-to-br from-primary/40 to-primary/10">
        {data ? (
          <video src={data} className="w-full h-full object-cover" controls playsInline loop />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
          <div className="font-semibold">@{username}</div>
          {caption && <div className="opacity-90 line-clamp-2">{caption}</div>}
        </div>
      </div>
      <div className="flex items-center gap-4 px-3 py-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> 0</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> 0</span>
        <span className="flex items-center gap-1"><Share2 className="h-4 w-4" /> 0</span>
      </div>
    </div>
  );
}

const TABS = ["Recommended", "Followed", "Search Reels"] as const;
type Tab = (typeof TABS)[number];

function ReelsPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("Recommended");
  const [search, setSearch] = useState("");

  const { data: reels } = useQuery({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reels")
        .select("id, video_url, caption, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const onUpload = async (file: File) => {
    if (!me) return;
    try {
      const path = await uploadMedia(me.id, file);
      const caption = window.prompt("Caption?") ?? "";
      const { error } = await supabase.from("reels").insert({
        user_id: me.id,
        video_url: path,
        caption: caption || null,
      });
      if (error) throw error;
      toast.success("Reel posted");
      qc.invalidateQueries({ queryKey: ["reels"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const filtered = (() => {
    const list = reels ?? [];
    if (tab === "Search Reels") {
      const q = search.trim().toLowerCase();
      if (!q) return list;
      return list.filter((r) => (r.caption ?? "").toLowerCase().includes(q) || (r.profiles?.username ?? "").toLowerCase().includes(q));
    }
    if (tab === "Followed") return list.slice(0, Math.floor(list.length / 2));
    return list;
  })();

  return (
    <div className="max-w-5xl mx-auto px-3 md:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Reels</h1>
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "Search Reels" && (
        <div className="mb-4 flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reels" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((r) => (
          <ReelCard key={r.id} path={r.video_url} caption={r.caption} username={r.profiles?.username ?? ""} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="card-flat p-8 text-center text-sm text-muted-foreground">No reels to show.</div>
      )}
    </div>
  );
}