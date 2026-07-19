import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Avatar } from "@/components/PostCard";
import { Send, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dm/$userId")({
  component: Thread,
});

function Thread() {
  const { userId: peerId } = Route.useParams();
  const { userId: myId } = useSession();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: peer } = useQuery({
    queryKey: ["profile", peerId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", peerId).maybeSingle();
      return data;
    },
  });

  const { data: messages } = useQuery({
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
    if (!text.trim() || !myId) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: peerId,
      content,
    });
    qc.invalidateQueries({ queryKey: ["messages", myId, peerId] });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <header className="flex items-center gap-3 p-3 border-b border-border">
        <Link to="/dm" className="md:hidden"><ArrowLeft className="h-5 w-5" /></Link>
        <Avatar path={peer?.avatar_url} alt="" size={36} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">@{peer?.username}</div>
          {peer?.subscription_tier === "plus" && <Sparkles className="inline h-3 w-3 text-primary" />}
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages?.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-in-fade`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="submit" disabled={!text.trim()} className="text-primary disabled:opacity-30">
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}