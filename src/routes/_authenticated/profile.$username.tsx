import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  BadgeCheck, Bookmark, Boxes, ChevronLeft, Grid3x3, Heart, Menu,
  MessageCircle, MessageSquareMore, Play, Settings, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, StoryRing } from "@/components/Avatar";
import { MediaImg } from "@/components/PostCard";
import { useActions, useMe, useProfilePage, useSavedPosts } from "@/lib/data";
import { ui } from "@/lib/demo-store";
import { DEMO_GALLERY } from "@/lib/demo-data";
import { formatCount } from "@/lib/time";
import type { UPost, UReel } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/profile/$username")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({ tab: typeof s.tab === "string" ? s.tab : undefined }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { page, loading } = useProfilePage(username);
  const me = useMe();
  const actions = useActions();
  const [following, setFollowing] = useState(page?.isFollowing ?? false);

  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">Loading profile…</div>;
  if (!page?.profile) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg font-semibold">Sorry, this page isn't available.</p>
        <p className="text-sm text-muted-foreground mt-1">The link may be broken or the profile was removed.</p>
        <Link to="/feed" className="inline-block mt-4 text-sm font-semibold text-primary">Go back to Socialverse</Link>
      </div>
    );
  }

  const { profile, posts, reels, followers, following: followingCount, isMe } = page;
  const active = tab === "reels" ? "reels" : tab === "saved" && isMe ? "saved" : tab === "tagged" ? "tagged" : "posts";

  return (
    <div className="max-w-[935px] mx-auto pb-12">
      {/* mobile top bar */}
      <div className="md:hidden sticky top-12 z-20 bg-background/95 backdrop-blur flex items-center gap-4 px-4 h-12 border-b border-border">
        <Link to="/feed"><ChevronLeft className="h-6 w-6" /></Link>
        <span className="font-semibold flex items-center gap-1">
          {profile.username} {profile.is_verified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
        </span>
      </div>

      {/* header */}
      <header className="flex gap-6 md:gap-16 px-4 md:px-8 pt-5 md:pt-9">
        <StoryRing viewed size={94} className="shrink-0">
          <Avatar path={profile.avatar_url} alt={profile.username} size={82} />
        </StoryRing>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg md:text-xl font-normal flex items-center gap-1.5">
              {profile.username}
              {profile.is_verified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
            </h1>
            {isMe ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={ui.openEditProfile}
                  className="text-sm font-semibold rounded-lg bg-muted hover:bg-accent px-4 py-1.5"
                >
                  Edit profile
                </button>
                <button type="button" aria-label="Settings" onClick={() => navigate({ to: "/settings" })} className="p-1.5 hover:opacity-60">
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setFollowing((v) => !v); actions.follow(profile.id, !following); }}
                  className={`text-sm font-semibold rounded-lg px-5 py-1.5 ${following ? "bg-muted hover:bg-accent" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <Link
                  to="/dm/$userId"
                  params={{ userId: profile.id }}
                  className="text-sm font-semibold rounded-lg bg-muted hover:bg-accent px-4 py-1.5 flex items-center gap-1.5"
                >
                  <MessageSquareMore className="h-4 w-4" /> Message
                </Link>
                <button type="button" aria-label="More" onClick={() => toast("Profile options coming soon")} className="p-1.5 hover:opacity-60">
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* stats desktop */}
          <div className="hidden md:flex gap-8 mt-5 text-[15px]">
            <span><b>{posts.length + reels.length}</b> posts</span>
            <span><b>{formatCount(followers)}</b> followers</span>
            <span><b>{formatCount(followingCount)}</b> following</span>
          </div>

          <div className="hidden md:block mt-4 text-sm whitespace-pre-wrap leading-snug">
            <p className="font-semibold">{profile.display_name}</p>
            {profile.bio && <p className="text-foreground/90">{profile.bio}</p>}
          </div>
        </div>
      </header>

      {/* stats mobile + bio */}
      <div className="md:hidden px-4 mt-3">
        <div className="flex justify-around border-y border-border py-2.5 text-sm text-center">
          <span><b className="block">{posts.length + reels.length}</b> posts</span>
          <span><b className="block">{formatCount(followers)}</b> followers</span>
          <span><b className="block">{formatCount(followingCount)}</b> following</span>
        </div>
        <div className="mt-3 text-sm whitespace-pre-wrap">
          <p className="font-semibold">{profile.display_name}</p>
          {profile.bio && <p className="text-foreground/90">{profile.bio}</p>}
        </div>
      </div>

      {/* highlights */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 md:px-8 py-5">
        {["Travel ✈️", "Food 🍜", "Work 💼", "Pets 🐶"].map((h, i) => (
          <div key={h} className="flex flex-col items-center gap-1.5 shrink-0">
            <StoryRing viewed size={72} onClick={() => toast(`${h} highlights coming soon`)}>
              <MediaImg src={DEMO_GALLERY[(i * 2) % DEMO_GALLERY.length]} className="h-[62px] w-[62px] rounded-full object-cover" />
            </StoryRing>
            <span className="text-xs">{h}</span>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="border-t border-border flex justify-around md:justify-center md:gap-12">
        <TabBtn active={active === "posts"} onClick={() => navigate({ to: "/profile/$username", params: { username } })} icon={Grid3x3} label="Posts" />
        <TabBtn active={active === "reels"} onClick={() => navigate({ to: "/profile/$username", params: { username }, search: { tab: "reels" } })} icon={Play} label="Reels" />
        {isMe ? (
          <TabBtn active={active === "saved"} onClick={() => navigate({ to: "/profile/$username", params: { username }, search: { tab: "saved" } })} icon={Bookmark} label="Saved" />
        ) : (
          <TabBtn active={active === "tagged"} onClick={() => navigate({ to: "/profile/$username", params: { username }, search: { tab: "tagged" } })} icon={Tag} label="Tagged" />
        )}
      </div>

      {/* grids */}
      {active === "posts" && (
        <PostGrid posts={posts} emptyText={isMe ? "Share your first photo" : "No posts yet"} />
      )}
      {active === "reels" && (
        <ReelGrid reels={reels} emptyText={isMe ? "Create your first reel 🎬" : "No reels yet"} />
      )}
      {active === "saved" && isMe && <SavedGrid />}
      {active === "tagged" && (
        <div className="py-16 text-center">
          <Boxes className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="font-semibold mt-3">No photos</p>
          <p className="text-sm text-muted-foreground">When people tag you in photos, they'll appear here.</p>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 py-3 px-6 text-xs font-semibold uppercase tracking-wide border-t ${active ? "border-foreground -mt-px" : "border-transparent text-muted-foreground"}`}
    >
      <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PostGrid({ posts, emptyText }: { posts: UPost[]; emptyText: string }) {
  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-foreground grid place-items-center"><Heart className="h-6 w-6" /></div>
        <p className="font-semibold mt-3">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 mt-0.5">
      {posts.map((p) => (
        <Link key={p.id} to="/post/$id" params={{ id: p.id }} className="relative group aspect-square overflow-hidden bg-muted">
          {p.media_urls.length === 0 ? (
            <span className="absolute inset-0 p-2 flex items-center justify-center text-center text-white text-[11px] font-semibold line-clamp-5" style={{ background: "linear-gradient(135deg,#4F5BD5,#962FBF,#D62976)" }}>
              {p.caption}
            </span>
          ) : (
            <MediaImg src={p.media_urls[0]} alt={p.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" />
          )}
          {p.media_urls.length > 1 && <span className="absolute top-2 right-2 h-3.5 w-3.5 rounded-sm border-2 border-white" />}
          <span className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-4 bg-black/40 text-white text-xs font-semibold">
            <span className="flex items-center gap-1"><Heart className="h-4 w-4 fill-white" /> {formatCount(p.likes)}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 fill-white -scale-x-100" /> {formatCount(p.commentsCount)}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ReelGrid({ reels, emptyText }: { reels: UReel[]; emptyText: string }) {
  if (reels.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-foreground grid place-items-center"><Play className="h-6 w-6" /></div>
        <p className="font-semibold mt-3">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 mt-0.5">
      {reels.map((r) => (
        <Link key={r.id} to="/reels" className="relative group aspect-square overflow-hidden bg-zinc-900">
          {r.poster ? (
            <MediaImg src={r.poster} alt={r.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <video src={r.video_url} className="absolute inset-0 h-full w-full object-cover" muted playsInline preload="metadata" />
          )}
          <span className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow">
            <Play className="h-3.5 w-3.5 fill-white" /> {(r.likes / 7 | 0).toLocaleString("en-IN")}
          </span>
          <span className="absolute inset-0 hidden group-hover:bg-black/25" />
        </Link>
      ))}
    </div>
  );
}

function SavedGrid() {
  void useMe;
  const { useSavedPosts } = require("@/lib/data") as typeof import("@/lib/data");
  const saved = useSavedPosts();
  if (saved.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-foreground grid place-items-center"><Bookmark className="h-6 w-6" /></div>
        <p className="font-semibold mt-3">Save posts you like</p>
        <p className="text-sm text-muted-foreground">Tap the bookmark icon on any post to save it here.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 mt-0.5">
      {saved.map((p) => (
        <Link key={p.id} to="/post/$id" params={{ id: p.id }} className="relative aspect-square overflow-hidden bg-muted">
          <MediaImg src={p.media_urls[0]} alt={p.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" />
        </Link>
      ))}
    </div>
  );
}
