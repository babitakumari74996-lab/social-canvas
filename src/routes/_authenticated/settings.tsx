import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMyProfile } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePlus } from "@/components/PlusModal";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: me } = useMyProfile();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { requirePlus } = usePlus();

  useEffect(() => {
    if (me) {
      setDisplayName(me.display_name ?? "");
      setBio(me.bio ?? "");
    }
  }, [me]);

  const save = async () => {
    if (!me) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("id", me.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries();
    }
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const downgrade = async () => {
    if (!me) return;
    await supabase.from("profiles").update({ subscription_tier: "free" }).eq("id", me.id);
    qc.invalidateQueries();
    toast.success("Cancelled Plus");
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
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
          />
        </div>
        <Button onClick={save}>Save</Button>
      </section>

      <section className="card-flat p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-medium">Socialverse Plus</h2>
        </div>
        {me?.subscription_tier === "plus" ? (
          <>
            <p className="text-sm text-muted-foreground">
              You're on Plus. 48h stories, 6 pinned posts, hide-from-feed posts, super hearts.
            </p>
            <Button variant="outline" onClick={downgrade}>
              Cancel Plus
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Extend stories to 48h, pin up to 6 posts, super hearts, hide-from-feed posts, and
              more.
            </p>
            <Button onClick={() => requirePlus("Socialverse Plus")}>Upgrade</Button>
          </>
        )}
      </section>

      <section className="card-flat p-4 space-y-3">
        <h2 className="font-medium">Account</h2>
        <Button variant="destructive" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
