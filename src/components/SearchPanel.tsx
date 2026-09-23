import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, Clock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useUserSearch } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";

const RECENT_KEY = "sv-recent-searches";

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function SearchPanel() {
  const { overlay } = useUI();
  const open = overlay === "search";
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const results = useUserSearch(q);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setRecent(loadRecent());
    }
  }, [open]);

  if (!open) return null;

  const go = (username: string) => {
    const next = [username, ...recent.filter((r) => r !== username)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    ui.closeAll();
    navigate({ to: "/profile/$username", params: { username } });
  };

  return (
    <div className="fixed inset-0 z-50 md:inset-y-0 md:left-[76px] xl:left-[245px] md:w-[395px] md:border-r md:border-border bg-card flex flex-col animate-in-fade" role="dialog" aria-modal>
      <div className="p-4 md:pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            autoFocus
            className="w-full rounded-lg bg-muted pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {q && (
            <button type="button" aria-label="Clear" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-border flex-1 overflow-y-auto">
        {!q && (
          <>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-sm">Recent</span>
              {recent.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                >
                  Clear all
                </button>
              )}
            </div>
            {recent.length === 0 && (
              <p className="px-4 pb-6 text-sm text-muted-foreground">No recent searches. Try “priya”, “rohan” or “neha”.</p>
            )}
            {recent.map((r) => (
              <RecentRow key={r} username={r} onPick={go} />
            ))}
          </>
        )}
        {q && results.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => go(u.username)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left"
          >
            <Avatar path={u.avatar_url} alt={u.username} size={44} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate">{u.username}</span>
              <span className="block text-sm text-muted-foreground truncate">{u.display_name}</span>
            </span>
          </button>
        ))}
        {q && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">No results for “{q}”.</p>
        )}
      </div>
    </div>
  );
}

function RecentRow({ username, onPick }: { username: string; onPick: (u: string) => void }) {
  const results = useUserSearch(username);
  const u = results[0];
  return (
    <button type="button" onClick={() => onPick(username)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left">
      {u ? <Avatar path={u.avatar_url} alt={username} size={44} /> : <span className="h-11 w-11 rounded-full bg-muted grid place-items-center"><Clock className="h-5 w-5 text-muted-foreground" /></span>}
      <span className="min-w-0">
        <span className="block text-sm font-semibold truncate">{username}</span>
        {u && <span className="block text-sm text-muted-foreground truncate">{u.display_name}</span>}
      </span>
    </button>
  );
}
