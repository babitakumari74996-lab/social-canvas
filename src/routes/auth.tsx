import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MediaImg } from "@/components/PostCard";
import { Wordmark } from "@/components/AppShell";
import { DEMO_GALLERY } from "@/lib/demo-data";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Socialverse" },
      { name: "description", content: "Sign in or create an account on Socialverse." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/feed", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're in!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/feed", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed");
    else if (!result.redirected) navigate({ to: "/feed", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center gap-12 px-4 py-10 bg-background">
      {/* phone collage (desktop) */}
      <div className="hidden lg:block relative w-[380px] h-[580px] shrink-0">
        <div className="absolute left-0 top-10 w-[220px] rotate-[-6deg] rounded-2xl overflow-hidden border-[10px] border-card shadow-2xl">
          <MediaImg src={DEMO_GALLERY[0]} className="w-full h-[380px] object-cover" />
        </div>
        <div className="absolute right-0 top-0 w-[210px] rotate-[5deg] rounded-2xl overflow-hidden border-[10px] border-card shadow-2xl">
          <MediaImg src={DEMO_GALLERY[6]} className="w-full h-[350px] object-cover" />
        </div>
        <div className="absolute right-10 bottom-0 w-[200px] rotate-[2deg] rounded-2xl overflow-hidden border-[10px] border-card shadow-2xl">
          <MediaImg src={DEMO_GALLERY[4]} className="w-full h-[330px] object-cover" />
        </div>
        <div className="absolute left-6 bottom-6 bg-card/95 backdrop-blur rounded-xl shadow-xl px-4 py-3 flex items-center gap-2 rotate-[-2deg]">
          <span className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] p-[2px]">
            <span className="block h-full w-full rounded-full bg-card p-[2px]">
              <MediaImg src="/demo/av2.jpg" className="h-full w-full rounded-full object-cover" />
            </span>
          </span>
          <span className="text-xs"><b>priyaverma</b> started following you</span>
        </div>
      </div>

      {/* form column */}
      <div className="w-full max-w-[350px] space-y-3 animate-in-fade">
        <div className="border border-border rounded-xl bg-card px-8 py-9 text-center">
          <Link to="/feed" className="inline-block mb-6"><Wordmark /></Link>
          <p className="text-sm text-muted-foreground font-semibold mb-5">
            Sign up to see photos, stories and reels from your friends.
          </p>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === "signup" && (
              <Input
                required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+"
                placeholder="Username"
                value={username} onChange={(e) => setUsername(e.target.value)}
              />
            )}
            <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Log in" : "Sign up"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 border-t border-border" />
            <span className="uppercase">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button variant="outline" className="w-full font-semibold" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => navigate({ to: "/feed" })}
            className="mt-4 w-full text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            ✨ Just exploring? Enter the demo world
          </button>
        </div>

        <div className="border border-border rounded-xl bg-card px-8 py-5 text-center text-sm">
          {mode === "signin" ? "Don't have an account? " : "Have an account? "}
          <button className="text-primary font-semibold hover:opacity-70" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Sign up" : "Log in"}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          The demo world runs on sample accounts — posts, likes and reels reset with your browser storage.
        </p>
      </div>
    </div>
  );
}
