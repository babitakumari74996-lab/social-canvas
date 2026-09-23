import { useState } from "react";
import { Link2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useSuggestions } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";

export function ShareSheet() {
  const { overlay, sharePost, shareKind } = useUI();
  const actions = useActions();
  const suggestions = useSuggestions();
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
  const open = overlay === "share" && !!sharePost;
  if (!open || !sharePost) return null;

  const link = `${location.origin}/post/${sharePost.id}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast("Link: " + link);
    }
  };

  const recipients = [
    ...suggestions.map((s) => s.user),
  ].slice(0, 8);

  return (
    <div className="fixed inset-0 z-[58] bg-black/60 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal onClick={ui.closeAll}>
      <div
        className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 pb-8 animate-in-fade"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="w-8" />
          <span className="font-semibold">Share</span>
          <button type="button" aria-label="Close" onClick={ui.closeAll}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {recipients.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex flex-col items-center gap-1 w-16 shrink-0"
              onClick={() => {
                setSentTo((s) => ({ ...s, [u.id]: true }));
                actions.sendMessage(u.id, `Check out this ${shareKind}! ${link}`);
                toast(`Sent to ${u.username}`);
              }}
            >
              <div className={`rounded-full p-[2px] ${sentTo[u.id] ? "bg-muted" : "bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5]"}`}>
                <span className="block rounded-full bg-card p-[2px]">
                  <Avatar path={u.avatar_url} alt={u.username} size={48} />
                </span>
              </div>
              <span className="text-[11px] truncate w-full text-center">{u.username}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={copy}
          className="mt-3 w-full flex items-center gap-3 rounded-xl bg-muted hover:bg-accent px-4 py-3 text-sm font-semibold"
        >
          <Link2 className="h-5 w-5" /> Copy link
        </button>

        <div className="mt-4 flex items-center gap-3">
          {sharePost.media_urls[0] ? (
            <MediaImg src={sharePost.media_urls[0]} className="h-10 w-10 rounded object-cover" />
          ) : (
            <span className="h-10 w-10 rounded bg-gradient-to-br from-[#4F5BD5] to-[#D62976]" />
          )}
          <p className="text-xs text-muted-foreground line-clamp-1">{sharePost.caption ?? "Post"}</p>
        </div>
      </div>
    </div>
  );
}
