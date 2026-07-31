import { useRef, useState, createElement } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Image, Video, Radio, X, Globe, Lock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { useMyProfile } from "@/lib/auth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function TodayModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState<"public" | "friends" | "private">("public");
  const [showAudience, setShowAudience] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
  };

  const reset = () => {
    setText("");
    removeFile();
  };

  const submit = async () => {
    if (!me) return;
    if (!text.trim() && !file) {
      toast.error("Add text or media");
      return;
    }
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
      toast.success("Posted!");
      qc.invalidateQueries({ queryKey: ["feed"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const isVideo = file?.type.startsWith("video/");
  const left = 2200 - text.length;
  const audienceIcon = audience === "public" ? Globe : audience === "friends" ? Users : Lock;
  const audienceLabel =
    audience === "public" ? "Public" : audience === "friends" ? "Friends" : "Only me";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-2xl border-0 sm:border border-border/30 overflow-visible max-sm:h-full max-sm:max-w-none max-sm:rounded-none max-sm:!top-0 max-sm:!translate-y-0 [&>button:last-child]:hidden bg-card dark:dark-card-glow">
        <DialogTitle className="sr-only">Create post</DialogTitle>

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-card/90 dark:bg-card/95 backdrop-blur-sm shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <span className="font-semibold text-sm text-foreground">New post</span>
          <button
            onClick={submit}
            disabled={busy || (!text.trim() && !file)}
            className="text-sm font-semibold text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-opacity hover:scale-105 active:scale-95"
          >
            {busy ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Posting
              </span>
            ) : (
              "Share"
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-sm:min-h-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0 shadow-sm">
              {me?.username?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  @{me?.username ?? "user"}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setShowAudience(!showAudience)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/30 text-[11px] text-muted-foreground hover:bg-muted dark:hover:bg-muted/40 cursor-pointer transition-colors border border-border/20 dark:border-border/10"
                  >
                    {createElement(audienceIcon, { className: "h-3 w-3" })}
                    {audienceLabel}
                  </button>
                  {showAudience && (
                    <div className="absolute top-full left-0 mt-1 w-36 bg-card/95 dark:bg-card/95 backdrop-blur-xl border border-border/30 dark:border-border/20 rounded-lg shadow-lg z-10 py-1 dark:dark-card-glow">
                      {(["public", "friends", "private"] as const).map((a) => {
                        const Icon = a === "public" ? Globe : a === "friends" ? Users : Lock;
                        return (
                          <button
                            key={a}
                            onClick={() => {
                              setAudience(a);
                              setShowAudience(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer transition-colors ${audience === a ? "text-primary font-medium bg-primary/5 dark:bg-primary/10" : "text-foreground hover:bg-muted/50 dark:hover:bg-muted/30"}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {a === "public" ? "Public" : a === "friends" ? "Friends" : "Only me"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's happening?"
            className="w-full min-h-[120px] border-0 bg-transparent text-base outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
            maxLength={2200}
            autoFocus
          />

          {filePreview && (
            <div className="relative rounded-xl overflow-hidden bg-muted/30 dark:bg-muted/20 border border-border/40 dark:border-border/30 group">
              {isVideo ? (
                <video src={filePreview} className="w-full max-h-72 object-contain" controls />
              ) : (
                <img src={filePreview} alt="" className="w-full max-h-80 object-contain" />
              )}
              <button
                onClick={removeFile}
                className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-black/60 dark:bg-black/70 text-white hover:bg-black/80 cursor-pointer transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-muted/20 dark:bg-muted/10">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => photoRef.current?.click()}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 text-emerald-500 dark:text-emerald-400 cursor-pointer transition-colors"
                title="Photo"
              >
                <Image className="h-5 w-5" />
              </button>
              <button
                onClick={() => videoRef.current?.click()}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 text-blue-500 dark:text-blue-400 cursor-pointer transition-colors"
                title="Video"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                onClick={() => toast.info("Live Stream coming soon")}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 text-blue-500 dark:text-blue-400 cursor-pointer transition-colors"
                title="Live"
              >
                <Radio className="h-5 w-5" />
              </button>
            </div>
            <span
              className={`text-[11px] font-medium ${left < 100 ? "text-amber-500" : left < 20 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {left}
            </span>
          </div>
        </div>

        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
