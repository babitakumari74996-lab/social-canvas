-- Reel editor fields: cover frame, trim range, video filter, audience and tagged people.
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS trim_start numeric,
  ADD COLUMN IF NOT EXISTS trim_end numeric,
  ADD COLUMN IF NOT EXISTS video_filter text,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'everyone' CHECK (audience IN ('everyone', 'followers')),
  ADD COLUMN IF NOT EXISTS tagged text[] NOT NULL DEFAULT '{}';
