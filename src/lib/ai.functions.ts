import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const suggestCaption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hint?: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const hint = (data.hint ?? "").slice(0, 200);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write short, witty, minimal Instagram-style captions. 1 line, under 90 chars, no hashtags unless asked, no quotes.",
          },
          {
            role: "user",
            content: hint
              ? `Write a caption for a post about: ${hint}`
              : "Write a fresh, catchy caption for a photo post.",
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { caption: json.choices?.[0]?.message?.content?.trim() ?? "" };
  });
