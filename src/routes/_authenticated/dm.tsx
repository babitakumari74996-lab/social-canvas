import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { DEMO_ME_ID } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatDistanceToNowStrict } from "date-fns";
import type { UMessage } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dm")({
  component: DMLayout,
});

function DMLayout() {
  const { userId } = useSession();
  const demoState = useDemo();
  const matchRoute = useMatchRoute();
  const inThread = matchRoute({ to: "/dm/$userId" });

  // demo threads from the demo store
  const demoThreads = useMemo(() => {
    const byPeer = new Map<string, UMessage>();
    for (const m of demoState.messages) {
      const peer = m.sender_id === DEMO_ME_ID ? m.receiver_id : m.sender_id;
      const cur = byPeer.get(peer);
      if (!cur || new Date(m.created_at) > new Date(cur.created_at)) byPeer.set(peer, m);
    }
    return Array.from(byPeer.entries())
      .map(([id, last]) => ({ peer: demoState.users.find((u) => u.id === id), last }))
      .filter((t) => t.peer);
  }, [demoState.messages, demoState.users]);

  const { data: realThreads } = useQuery({
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
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", peerIds);
      return peerIds.map((id) => ({
        peer: profs?.find((p) => p.id === id),
        last: byPeer.get(id)!,
      }));
    },
    enabled: !!userId,
  });

  const threads = userId ? (realThreads ?? []) : demoThreads;
  void userId;

  return (
    <div className="max-w-4xl mx-auto flex h-[calc(100dvh-6.5rem)] md:h-screen">
      <aside className={`${inThread ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-border`}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold">{userId ? "Messages" : "Demo messages"}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No conversations yet. Visit a profile and tap “Message”, or share a post.
            </div>
          )}
          {threads.map((t) => (
            <Link
              key={t.peer?.id}
              to="/dm/$userId"
              params={{ userId: t.peer?.id ?? "" }}
              className="flex items-center gap-3 p-3 hover:bg-muted transition-opacity"
            >
              <Avatar path={t.peer?.avatar_url} alt="" size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{t.peer?.username}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.last.content ?? "media"} · {formatDistanceToNowStrict(new Date(t.last.created_at))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </aside>
      <section className={`${inThread ? "flex" : "hidden md:flex"} flex-1`}>
        <Outlet />
      </section>
    </div>
  );
}
