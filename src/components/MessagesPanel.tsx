import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatDistanceToNowStrict } from "date-fns";

export function MessagesPanel() {
  const { userId } = useSession();

  const { data: threads } = useQuery({
    queryKey: ["dm-threads", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, is_read")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      type Msg = NonNullable<typeof data>[number];
      const byPeer = new Map<string, Msg>();
      for (const m of data ?? []) {
        const peer = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (!byPeer.has(peer)) byPeer.set(peer, m);
      }
      const peerIds = Array.from(byPeer.keys());
      if (peerIds.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", peerIds);
      return peerIds.map((id) => ({
        peer: profs?.find((p) => p.id === id),
        last: byPeer.get(id)!,
      }));
    },
    enabled: !!userId,
  });

  return (
    <div className="h-full flex flex-col">
      {threads?.length === 0 && (
        <div className="p-6 text-sm text-muted-foreground text-center">
          No conversations. Visit a profile and tap "Message".
        </div>
      )}
      {threads?.map((t) => (
        <div
          key={t.peer?.id}
          className="flex items-center gap-3 p-3 hover:bg-muted transition-colors cursor-pointer rounded-lg"
        >
          <div className="h-11 w-11 rounded-full bg-muted overflow-hidden shrink-0">
            {t.peer?.avatar_url && (
              <img src={t.peer.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">@{t.peer?.username}</div>
            <div className="text-xs text-muted-foreground truncate">
              {t.last.content ?? "media"} · {formatDistanceToNowStrict(new Date(t.last.created_at))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
