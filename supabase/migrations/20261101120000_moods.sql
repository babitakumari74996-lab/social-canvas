-- Moods: a mood, an optional note and optional photos/videos. Saved posts must survive a page refresh.
CREATE TABLE IF NOT EXISTS public.moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood text NOT NULL,
  note text NOT NULL DEFAULT '',
  -- [{ "url": "<storage path in the media bucket>", "kind": "image" | "video" }]
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moods viewable by everyone" ON public.moods FOR SELECT USING (true);
CREATE POLICY "Users create own moods" ON public.moods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own moods" ON public.moods FOR DELETE USING (auth.uid() = user_id);
