import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { useMyProfile } from "@/lib/auth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function TodayModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reset = () => { setText(""); setFile(null); };

  const submit = async () => {
    if (!me) return;
    if (!text.trim() && !file) { toast.error("Add text or media"); return; }
    setBusy(true);
    try {
      const media_urls: string[] = [];
      if (file) media_urls.push(await uploadMedia(me.id, file));
      const { error } = await supabase.from("posts").insert({
        user_id: me.id,
        media_urls,
        caption: text.trim() || null,
      });
      if (error) throw error;
      toast.success("Posted to your Today");
      qc.invalidateQueries({ queryKey: ["feed"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Today's life post</DialogTitle></DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's your day gone Today? Post your Today life by text"
          className="w-full min-h-28 rounded-md border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
        {file && (
          <div className="text-xs text-muted-foreground truncate">Attached: {file.name}</div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-1" /> Add Photo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current?.click()}>
            <Video className="h-4 w-4 mr-1" /> Add Video
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toast.info("Live Stream coming soon")}>
            <Radio className="h-4 w-4 mr-1" /> Live Stream
          </Button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy}>{busy ? "Posting…" : "Post"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}