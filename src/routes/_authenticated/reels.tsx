import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/lib/media";
import { useMyProfile } from "@/lib/auth";
import { useRef } from "react";
import { uploadMedia } from "@/lib/media";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reels")({
  component: ReelsPage,
});

function ReelItem({ path, caption, username }: { path: string; caption: string | null; username: string }) {
  const { data } = useSignedUrl(path);
  return (
    <div className="snap-start h-[calc(100vh-8rem)] md:h-[80vh] w-full flex items-center justify-center bg-black rounded-md relative overflow-hidden animate-in-fade">
      {data && (
        <video src={data} className="max-h-full max-w-full" controls playsInline loop />
      )}
      <div className="absolute bottom-4 left-4 right-4 text-white text-sm">
        <div className="font-semibold">@{username}</div>
        {caption && <div className="opacity-90">{caption}</div>}
      </div>
    </div>
  );
}

function ReelsPage() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="max-w-md mx-auto px-3 md:px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold tracking-tight">Reels</h1>
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
      <div className="snap-y snap-mandatory overflow-y-auto max-h-[calc(100vh-10rem)] space-y-3 no-scrollbar">
        {reels?.map((r) => (
          <ReelItem key={r.id} path={r.video_url} caption={r.caption} username={r.profiles?.username ?? ""} />
        ))}
        {reels?.length === 0 && (
          <div className="card-flat p-8 text-center text-sm text-muted-foreground">No reels yet — post the first one.</div>
        )}
      </div>
    </div>
  );
}