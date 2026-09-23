import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";
import { useActions, useMe } from "@/lib/data";
import { ui } from "@/lib/demo-store";
import { resetDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const me = useMe();
  const actions = useActions();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (me) {
      setDisplayName(me.display_name ?? "");
      setBio(me.bio ?? "");
    }
  }, [me]);

  const save = () => {
    actions.updateProfile({ display_name: displayName, bio });
    toast.success("Saved");
  };

  return (
    <div className="max-w-xl mx-auto px-3 md:px-6 py-4 space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="card-flat p-4 space-y-3">
        <h2 className="font-medium">Profile</h2>
        <div>
          <Label>Username</Label>
          <Input value={me?.username ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} />
        </div>
        <Button onClick={save}>Save</Button>
      </section>

      <section className="card-flat p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Socialverse Plus</h2>
        </div>
        <p className="text-sm text-muted-foreground">You're on Plus in the demo world — 48h stories, 6 pinned posts, hide-from-feed posts, super hearts.</p>
      </section>

      <section className="card-flat p-4 space-y-3">
        <h2 className="font-medium">Demo data</h2>
        <p className="text-sm text-muted-foreground">
          This site runs without accounts. Everything you create is stored in your browser only.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("Reset demo data? Your demo posts, likes and edits will be cleared.")) {
              resetDemo();
              toast("Demo data reset");
            }
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Reset demo data
        </Button>
      </section>

      <button type="button" onClick={ui.closeAll} className="hidden" />
    </div>
  );
}
