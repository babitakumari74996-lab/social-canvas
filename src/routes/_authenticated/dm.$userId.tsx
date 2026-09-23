import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { useActions } from "@/lib/data";
import { DEMO_ME_ID } from "@/lib/demo-data";
import { useDemo, demoMe } from "@/lib/demo-store";
import { ArrowLeft, Send, Sparkles, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dm/$userId")({
  component: Thread,
});

function Thread() {
  const { userId: peerId } = Route.useParams();
  const { userId: myId } = useSession();
  const qc = useQueryClient();
  const demoState = useDemo();
  const actions = useActions();
  const [text, setText] = useState("");
  const [disappearing, setDisappearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: peer } = useQuery({
    queryKey: ["profile", peerId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", peerId).maybeSingle();
      return data;
    },
    enabled: !!myId,
  });

  const demoPeer = !myId ? demoState.users.find((u) => u.id === peerId) : null;
  const peerProfile = myId ? peer : demoPeer;

  const { data: realMessages } = useQuery({
    queryKey: ["messages", myId, peerId],
    queryFn: async () => {
      if (!myId) return [];
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${myId})`)
        .order("created_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
    enabled: !!myId,
  });

  const messages = myId
    ? (realMessages ?? [])
    : demoState.messages.filter(
        (m) =>
          (m.sender_id === DEMO && m.receiver_id === peerId) ||
          (m.sender_id === peerId && m.receiver_id === DEMO),
      );
  const DEMO = "me";
  void DEMO;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel(`dm-${myId}-${peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { sender_id: string; receiver_id: string };
          if ((m.sender_id === myId && m.receiver_id === peerId) || (m.sender_id === peerId && m.receiver_id === myId)) {
            qc.invalidateQueries({ queryKey: ["messages", myId, peerId] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, peerId, qc]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    if (myId) {
      await supabase.from("messages").insert({
        sender_id: myId,
        receiver_id: peerId,
        content,
        is_disappearing: disappearing,
        expires_at: disappearing ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null,
      });
      qc.invalidateQueries({ queryKey: ["messages", myId, peerId] });
    } else {
      actions.sendMessage(peerId, content);
    }
  };

  const myAvatar = myId ? null : demoMe().avatar_url;

  return (
    <div className="flex flex-col w-full h-full">
      <header className="flex items-center gap-3 p-3 border-b border-border">
        <Link to="/dm" className="md:hidden"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar path={peerProfile?.avatar_url} alt="" size={36} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">@{peerProfile?.username}</div>
          {peerProfile?.subscription_tier === "plus" && <Sparkles className="inline h-3 w-3 text-primary" />}
        </div>
        <button
          type="button"
          onClick={() => setDisappearing((v) => !v)}
          className={`text-xs flex items-center gap-1 rounded-full px-2 py-1 border ${disappearing ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          title="Disappearing messages (1h)"
        >
          <Timer className="h-3 w-3" /> {disappearing ? "1h" : "Off"}
        </button>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-center">
            <div>
              <Avatar path={peerProfile?.avatar_url} alt="" size={72} className="mx-auto" />
              <p className="font-semibold mt-3 text-sm">@{peerProfile?.username}</p>
              <p className="text-xs text-muted-foreground">Say hi 👋 — replies are instant in demo mode.</p>
            </div>
          </div>
        )}
        {messages.map((m: { id: string; sender_id: string; content: string | null; is_disappearing?: boolean | null }) => {
          const mine = m.sender_id === (myId ?? "me");
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} animate-in-fade`}>
              {!mine && <Avatar path={peerProfile?.avatar_url} alt="" size={26} />}
              {mine && <Avatar path={myAvatar} alt="" size={26} />}
              <div className={`max-w-[72%] rounded-3xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
                {m.is_disappearing && (
                  <span className={`ml-2 inline-flex items-center gap-0.5 text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    <Timer className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={disappearing ? "Disappearing message…" : "Message…"}
          className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="submit" disabled={!text.trim()} className="font-semibold text-primary text-sm disabled:opacity-30 px-2">
          Send
        </button>
        <button type="submit" aria-label="Send" className="text-primary disabled:opacity-30">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
