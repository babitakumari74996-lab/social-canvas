import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useMe } from "@/lib/data";
import { ui, useUI } from "@/lib/demo-store";
import { DEMO_GALLERY } from "@/lib/demo-data";

export function EditProfileModal() {
  const { overlay } = useUI();
  const me = useMe();
  const actions = useActions();
  const open = overlay === "edit-profile";
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (open && me) {
      setName(me.display_name ?? "");
      setBio(me.bio ?? "");
      setAvatar(me.avatar_url ?? null);
    }
  }, [open, me]);

  if (!open || !me) return null;

  const save = async () => {
    await actions.updateProfile({ display_name: name, bio, avatar_url: avatar ?? undefined });
    toast("Profile updated ✅");
    ui.closeAll();
  };

  return (
    <div className="fixed inset-0 z-[58] bg-black/60 flex items-end sm:items-center sm:justify-center" role="dialog" aria-modal onClick={ui.closeAll}>
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 pb-8 animate-in-fade space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Edit profile</span>
          <button type="button" aria-label="Close" onClick={ui.closeAll}><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar path={avatar} alt={me.username} size={64} />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Pick a new profile photo</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {DEMO_GALLERY.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setAvatar(g)}
                className={`rounded-full border-2 shrink-0 ${avatar === g ? "border-primary" : "border-transparent"}`}
              >
                <MediaImg src={g} className="h-12 w-12 rounded-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          className="w-full rounded-lg bg-primary text-primary-foreground font-semibold text-sm py-2.5 hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}
