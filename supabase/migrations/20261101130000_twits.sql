-- Twits: text posts (optional photos) that show on the Moods > Twits tab, not on the home feed.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_twit boolean NOT NULL DEFAULT false;
