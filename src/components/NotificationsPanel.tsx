import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useNotifications } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";
import { timeAgo } from "@/lib/time";
import type { UNotif } from "@/lib/types";

function bucket(iso: string): "New" | "Today" | "This week" | "Earlier" {
  const h = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (h < 24) return "Today";
  if (h < 24 * 7) return "This week";
  return "Earlier";
}

function NotifRow({ n }: { n: UNotif }) {
  const actions = useActions();
  const navigate = useNavigate();
  const [following, setFollowing] = useState(n.type === "follow" ? false : false);
  void following;

  const text =
    n.type === "like" ? "liked your post" :
    n.type === "comment" ? <>commented: “{n.text}”</> :
    n.type === "follow" ? "started following you" : "mentioned you";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60">
      <button type="button" onClick={() => { ui.closeAll(); navigate({ to: "/profile/$username", params: { username: n.actor.username } }); }}>
        <Avatar path={n.actor.avatar_url} alt={n.actor.username} size={44} />
      </button>
      <p className="flex-1 text-sm leading-snug min-w-0">
        <span className="font-semibold">{n.actor.username}</span>{" "}
        <span className="text-foreground/90">{text}</span>{" "}
        <span className="text-muted-foreground text-xs">{timeAgo(n.created_at)}</span>
      </p>
      {n.type === "follow" ? (
        <FollowBtn userId={n.actor.id} />
      ) : n.postThumb ? (
        <MediaImg src={n.postThumb} className="h-11 w-11 rounded object-cover" />
      ) : null}
    </div>
  );
}

function FollowBtn({ userId }: { userId: string }) {
  const actions = useActions();
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { setOn((v) => !v); actions.follow(userId, !on); }}
      className={`text-sm font-semibold rounded-lg px-4 py-1.5 ${on ? "bg-muted text-foreground hover:bg-accent" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
    >
      {on ? "Following" : "Follow"}
    </button>
  );
}

export function NotificationsPanel({ force = false }: { force?: boolean }) {
  const { overlay } = useUI();
  const notifs = useNotifications();
  const open = overlay === "notifications" || force;
  if (!open) return null;

  const order: UNotif["type"][] = ["follow", "comment", "like"];
  const sorted = [...notifs].sort((a, b) => {
    const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (Math.abs(d) < 1000) return order.indexOf(a.type) - order.indexOf(b.type);
    return d;
  });

  let lastBucket = "";

  return (
    <div className="fixed inset-0 z-50 md:inset-y-0 md:left-[76px] xl:left-[245px] md:w-[400px] md:border-r md:border-border bg-card flex flex-col animate-in-fade" role="dialog" aria-modal>
      <div className="px-4 pt-5 pb-3 md:pt-6">
        <h2 className="font-semibold">Notifications</h2>
      </div>
      <div className="border-t border-border flex-1 overflow-y-auto pb-6">
        {sorted.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>}
        {sorted.map((n) => {
          const b = bucket(n.created_at);
          const showBucket = b !== lastBucket;
          lastBucket = b;
          return (
            <div key={n.id}>
              {showBucket && <div className="px-4 pt-4 pb-1 text-sm font-semibold">{b}</div>}
              <NotifRow n={n} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
