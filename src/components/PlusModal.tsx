import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

type Ctx = { requirePlus: (feature: string) => void };
const PlusCtx = createContext<Ctx>({ requirePlus: () => {} });

export function PlusProvider({ children, tier, userId }: { children: ReactNode; tier: string | undefined; userId: string | null }) {
  const [feature, setFeature] = useState<string | null>(null);
  const qc = useQueryClient();

  const upgrade = async () => {
    if (!userId) return;
    // Demo: flip tier locally. Real Stripe integration can replace this.
    const { error } = await supabase.from("profiles").update({ subscription_tier: "plus" }).eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Welcome to Socialverse Plus");
      qc.invalidateQueries();
      setFeature(null);
    }
  };

  return (
    <PlusCtx.Provider value={{ requirePlus: (f) => (tier === "plus" ? null : setFeature(f)) }}>
      {children}
      <Dialog open={!!feature} onOpenChange={(o) => !o && setFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>Socialverse Plus</DialogTitle>
            </div>
            <DialogDescription>
              <span className="font-medium text-foreground">{feature}</span> is a Plus feature. Upgrade to unlock story extend to 48h, 6 pinned posts, super hearts, hide-from-feed posts, and more.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeature(null)}>Not now</Button>
            <Button onClick={upgrade}>Upgrade for free (demo)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlusCtx.Provider>
  );
}

export const usePlus = () => useContext(PlusCtx);