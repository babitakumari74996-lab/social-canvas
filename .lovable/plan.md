## SocialVerse – Facebook-style Layout Overhaul

Big restructuring of navigation, layout, and several sections. Below is what I'll build, in one implementation pass.

### 1. New AppShell (`src/components/AppShell.tsx`)
Full rewrite to a 3-zone Facebook-like chrome:

- **Top bar** (sticky): logo "SocialVerse" · centered global search input · right cluster [Friends (badge), Messages (badge, desktop only), Menu (mobile hamburger)]. On mobile only, Messages is swapped for a "Today's life post" plus-circle button that opens the Today modal.
- **Left sidebar** (desktop persistent, mobile slide-out via hamburger): items in order — Home, Friends, Memories, Feeds, Groups, Ads Manager, Messenger, Pages, Events, History. Active-route highlight. Bottom promo/memory card ("On this day…").
- **Desktop bottom nav** (≥1024px, fixed bottom): Explore · Reels · **Post** (prominent center) · Messages (badge) · Profile. Post opens the Today modal; Profile opens the profile edit modal.
- Search state lives in a React context (`SearchProvider`) so `feed.tsx` can filter posts in realtime.

### 2. Today's Life Post modal (`src/components/TodayModal.tsx`)
Shared modal used by: mobile top-bar button, "Your Today" story card, and desktop bottom-nav Post button.

- Textarea placeholder: *"What's your day gone Today? Post your Today life by text"*
- Buttons: Add Photo, Add Video, Live Stream (photo/video wired to existing `uploadMedia`; Live Stream shows "coming soon" toast).
- Post button → inserts into `posts` (text-only allowed since `media_urls` currently required — see Technical below).

### 3. Profile edit modal (`src/components/ProfileEditModal.tsx`)
Opened from bottom-nav Profile. Fields: Display Name, Bio. Save updates `profiles.display_name` and `profiles.bio`; feed re-fetches so posts show new name.

### 4. Story tray tweak
Change "Your story" → "Your Today", and clicking it opens the Today modal instead of the file picker directly (upload option lives inside the modal).

### 5. Reels page rework (`src/routes/_authenticated/reels.tsx`)
Add three tabs: **Recommended · Followed · Search Reels**. Grid layout of reel cards with thumbnail gradient placeholder, title overlay, and Like/Comment/Share counts. Keep upload button.

### 6. Friends page (new: `src/routes/_authenticated/friends.tsx`)
Four tabs:
- **Friend Requests** — inbound follows where I haven't followed back → Confirm button (creates reciprocal follow).
- **Suggestions** — profiles I don't follow → Add button.
- **All Friends** — mutuals with checkmark.
- **Custom Lists** — shows "Close Friends" (from `profiles.close_friends`) and a placeholder "Work" list.

### 7. Groups page (new: `src/routes/_authenticated/groups.tsx`)
Client-only mock (no schema change): top summary card "Your Groups — 6 active groups" + grid of 6 group cards with icon, name, member count.

### 8. Feed adjustments (`src/routes/_authenticated/feed.tsx`)
- Consume global search from context → filter posts by caption/username.
- PostCard already has Like/Comment/Share; add a settings (three-dots) menu with Hide / Report placeholder.
- New-post flow migrates into the Today modal.

### 9. Styling
Facebook-ish palette layered on existing tokens: primary blue `#1877f2`, light gray surfaces `#f0f2f5`, white cards. Update `src/styles.css` tokens (keep dark-mode support). Icons stay lucide-react (equivalent to Font Awesome semantics).

### 10. Sample/mock data
Groups cards and the two "extra option" boxes are hardcoded mock arrays. Real posts/stories/reels continue to come from the DB (already seeded via user activity). No new migrations required.

---

### Technical notes

- No DB migration needed. Text-only posts: `posts.media_urls` is currently `NOT NULL`; I'll store `[]` (empty array) for text posts and update `PostCard` to render caption-only when no media.
- Friends "Confirm" = insert reciprocal row into `follows`; "Add" = insert one-way follow. No new tables.
- Groups is UI-only mock this pass (real groups feature would need a schema — out of scope here; flag if you want it wired to DB).
- Live Stream is a stub (toast only).
- Bottom nav on desktop replaces current mobile-only tab bar; mobile keeps a compact version.
- Search context lives in `AppShell` and is consumed by `feed.tsx` via a `useSearch()` hook.

### Files created
- `src/components/TodayModal.tsx`
- `src/components/ProfileEditModal.tsx`
- `src/components/SearchContext.tsx`
- `src/routes/_authenticated/friends.tsx`
- `src/routes/_authenticated/groups.tsx`

### Files edited
- `src/components/AppShell.tsx` (major)
- `src/components/StoryTray.tsx` ("Your Today" + open modal)
- `src/components/PostCard.tsx` (three-dots menu, no-media rendering)
- `src/routes/_authenticated/feed.tsx` (search filter, Today modal)
- `src/routes/_authenticated/reels.tsx` (tabs + grid)
- `src/styles.css` (FB-like palette tweaks)

Shall I proceed?
