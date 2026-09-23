import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyProfile } from "@/lib/auth";
import { uploadMedia } from "@/lib/media";
import { DEMO_ME_ID, DEMO_SUGGESTION_REASONS } from "@/lib/demo-data";
import { demoActions, demoCommentsFor, demoMe, useDemo } from "@/lib/demo-store";
import type { StoryGroup, UComment, UNotif, UPost, UProfile, UReel, UStory } from "@/lib/types";

// ---------------------------------------------------------------------------
// Unified data layer: when the visitor has a real Supabase session we read
// Supabase; otherwise the app runs in demo mode backed by the demo store.
// ---------------------------------------------------------------------------

export function useIsDemo() {
  const { userId, loading } = useSession();
  return { demo: !loading && !userId, loading };
}

const PROFILES_COLS = "username, avatar_url, display_name, is_verified, subscription_tier";

function supabaseProfile(p: Record<string, unknown>, id: string): UProfile {
  return {
    id, username: p.username as string, display_name: (p.display_name as string) ?? null,
    avatar_url: (p.avatar_url as string) ?? null, is_verified: (p.is_verified as boolean) ?? false,
    subscription_tier: (p.subscription_tier as string) ?? "free",
  };
}

// ---- me --------------------------------------------------------------------

export function useMe(): UProfile | null {
  const { userId } = useSession();
  const demo = useDemo();
  const real = useMyProfile();
  if (userId) {
    return real.data
      ? supabaseProfile(real.data as unknown as Record<string, unknown>, userId)
      : null;
  }
  return demoMe();
}

export function useMyUserId(): string | null {
  const { userId } = useSession();
  return userId ?? DEMO_ME_ID;
}

// ---- feed / explore ---------------------------------------------------------

function useSupabasePosts(): UPost[] | undefined {
  const { userId } = useSession();
  const { data } = useQuery({
    queryKey: ["all-posts", userId],
    queryFn: async (): Promise<UPost[]> => {
      if (!userId) return [];
      const { data: rows } = await supabase
        .from("posts")
        .select(`id, user_id, media_urls, caption, location, created_at, profiles!inner(${PROFILES_COLS})`)
        .order("created_at", { ascending: false })
        .limit(100);
      const posts = (rows ?? []) as unknown as { id: string; user_id: string; media_urls: string[] | null; caption: string | null; location: string | null; created_at: string; profiles: Record<string, unknown> }[];
      if (posts.length === 0) return [];
      const ids = posts.map((p) => p.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        supabase.from("likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("comments").select("post_id").in("post_id", ids),
      ]);
      return posts.map((p) => ({
        id: p.id, user_id: p.user_id, media_urls: p.media_urls ?? [], caption: p.caption,
        location: p.location, created_at: p.created_at, profiles: supabaseProfile(p.profiles, p.user_id),
        likes: likes?.filter((l) => l.post_id === p.id).length ?? 0,
        likedByMe: !!likes?.some((l) => l.post_id === p.id && l.user_id === userId),
        savedByMe: false,
        commentsCount: comments?.filter((c) => c.post_id === p.id).length ?? 0,
      }));
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
  });
  return data;
}

export function useFeed(): { posts: UPost[]; loading: boolean } {
  const demoState = useDemo();
  const { userId } = useSession();
  const real = useSupabasePosts();
  if (userId) {
    return { posts: real ?? [], loading: !real };
  }
  return { posts: [...demoState.posts], loading: false };
}

export function useExplorePosts(): UPost[] {
  const { posts } = useFeed();
  return [...posts].sort(() => 0.5 - Math.random() * 0.001).sort((a, b) => (b.likes + b.commentsCount) - (a.likes + a.commentsCount));
}

export function useSavedPosts(): UPost[] {
  const demoState = useDemo();
  const { userId } = useSession();
  const real = useSupabasePosts();
  if (userId) return [];
  return demoState.posts.filter((p) => p.savedByMe);
}

export function usePost(id: string): UPost | undefined {
  const demoState = useDemo();
  const { userId } = useSession();
  const real = useSupabasePosts();
  if (userId) return real?.find((p) => p.id === id);
  return demoState.posts.find((p) => p.id === id);
}

// ---- comments ----------------------------------------------------------------

export function useComments(postId: string): { comments: UComment[]; loading: boolean } {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async (): Promise<UComment[]> => {
      const { data: rows } = await supabase
        .from("comments")
        .select(`id, post_id, user_id, content, created_at, profiles(${PROFILES_COLS})`)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(200);
      return ((rows ?? []) as unknown as { id: string; post_id: string; user_id: string; content: string; created_at: string; profiles: Record<string, unknown> | null }[]).map((c) => ({
        id: c.id, post_id: c.post_id, user_id: c.user_id, content: c.content, created_at: c.created_at,
        profiles: c.profiles ? supabaseProfile(c.profiles, c.user_id) : null,
      }));
    },
    enabled: !!userId && !!postId,
  });
  if (userId) return { comments: data ?? [], loading: isLoading };
  return { comments: demoCommentsFor(postId), loading: false };
}

// ---- stories -------------------------------------------------------------------

export function useStoryGroups(): StoryGroup[] {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data } = useQuery({
    queryKey: ["stories", userId],
    queryFn: async (): Promise<StoryGroup[]> => {
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from("stories")
        .select(`id, user_id, media_url, created_at, profiles!inner(${PROFILES_COLS})`)
        .gt("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(100);
      const stories = (rows ?? []) as unknown as { id: string; user_id: string; media_url: string; created_at: string; profiles: Record<string, unknown> }[];
      const byUser = new Map<string, StoryGroup>();
      for (const s of stories) {
        if (!byUser.has(s.user_id)) {
          byUser.set(s.user_id, {
            user: supabaseProfile(s.profiles, s.user_id),
            items: [], allViewed: false,
          });
        }
        byUser.get(s.user_id)!.items.push({ id: s.id, user_id: s.user_id, media_url: s.media_url, created_at: s.created_at });
      }
      return Array.from(byUser.values());
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });
  if (userId) return data ?? [];

  const groups = new Map<string, StoryGroup>();
  for (const s of demoState.stories) {
    if (!groups.has(s.user_id)) {
      groups.set(s.user_id, { user: demoState.users.find((u) => u.id === s.user_id)!, items: [], allViewed: false });
    }
    groups.get(s.user_id)!.items.push(s);
  }
  const arr = Array.from(groups.values());
  for (const g of arr) g.allViewed = !!demoState.viewedStories[g.user.id];
  // my story first, then unviewed, then viewed
  arr.sort((a, b) => {
    if (a.user.id === DEMO_ME_ID) return -1;
    if (b.user.id === DEMO_ME_ID) return 1;
    if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1;
    return 0;
  });
  return arr;
}

// ---- reels -----------------------------------------------------------------------

export function useReels(): { reels: UReel[]; loading: boolean } {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["reels", userId],
    queryFn: async (): Promise<UReel[]> => {
      const { data: rows } = await supabase
        .from("reels")
        .select(`id, user_id, video_url, caption, created_at, profiles!inner(${PROFILES_COLS})`)
        .order("created_at", { ascending: false })
        .limit(50);
      const reels = (rows ?? []) as unknown as { id: string; user_id: string; video_url: string; caption: string | null; created_at: string; profiles: Record<string, unknown> }[];
      if (reels.length === 0) return [];
      const ids = reels.map((r) => r.id);
      void ids;
      return reels.map((r) => ({
        id: r.id, user_id: r.user_id, video_url: r.video_url, poster: null,
        caption: r.caption, music: null, created_at: r.created_at,
        profiles: supabaseProfile(r.profiles, r.user_id),
        likes: 0, likedByMe: false, commentsCount: 0,
      }));
    },
    enabled: !!userId,
  });
  if (userId) return { reels: data ?? [], loading: isLoading };
  return { reels: [...demoState.reels], loading: false };
}

// ---- profile -----------------------------------------------------------------------

export interface ProfilePage {
  profile: UProfile | null;
  posts: UPost[];
  reels: UReel[];
  followers: number;
  following: number;
  isFollowing: boolean;
  isMe: boolean;
}

export function useProfilePage(username: string): { page: ProfilePage | null; loading: boolean } {
  const demoState = useDemo();
  const { userId } = useSession();

  const real = useQuery({
    queryKey: ["profile-page", username, userId],
    queryFn: async (): Promise<ProfilePage> => {
      const { data: prof } = await supabase.from("profiles").select(`id, ${PROFILES_COLS}, bio`).eq("username", username).maybeSingle();
      if (!prof) return { profile: null, posts: [], reels: [], followers: 0, following: 0, isFollowing: false, isMe: false };
      const pid = prof.id;
      const [{ data: prows }, { data: rrows }, fc1, fc2, f3rows] = await Promise.all([
        supabase.from("posts").select(`id, user_id, media_urls, caption, location, created_at, profiles!inner(${PROFILES_COLS})`).eq("user_id", pid).order("created_at", { ascending: false }).limit(60),
        supabase.from("reels").select(`id, user_id, video_url, caption, created_at, profiles!inner(${PROFILES_COLS})`).eq("user_id", pid).order("created_at", { ascending: false }).limit(60),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", pid),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", pid),
        supabase.from("follows").select("follower_id").eq("following_id", pid).eq("follower_id", userId!),
      ]);
      const posts = ((prows ?? []) as unknown as { id: string; user_id: string; media_urls: string[] | null; caption: string | null; location: string | null; created_at: string; profiles: Record<string, unknown> }[]).map((p) => ({
        id: p.id, user_id: p.user_id, media_urls: p.media_urls ?? [], caption: p.caption, location: p.location,
        created_at: p.created_at, profiles: supabaseProfile(p.profiles, p.user_id), likes: 0, likedByMe: false, savedByMe: false, commentsCount: 0,
      }));
      const postIds = posts.map((p) => p.id);
      const { data: plikes } = postIds.length
        ? await supabase.from("likes").select("post_id, user_id").in("post_id", postIds)
        : { data: [] as { post_id: string; user_id: string }[] };
      for (const p of posts) {
        p.likes = plikes?.filter((l) => l.post_id === p.id).length ?? 0;
        p.likedByMe = !!plikes?.some((l) => l.post_id === p.id && l.user_id === userId);
      }
      const reels = ((rrows ?? []) as unknown as { id: string; user_id: string; video_url: string; caption: string | null; created_at: string; profiles: Record<string, unknown> }[]).map((r) => ({
        id: r.id, user_id: r.user_id, video_url: r.video_url, poster: null, caption: r.caption, music: null,
        created_at: r.created_at, profiles: supabaseProfile(r.profiles, r.user_id), likes: 0, likedByMe: false, commentsCount: 0,
      }));
      return {
        profile: supabaseProfile(prof as unknown as Record<string, unknown>, pid),
        posts,
        reels,
        followers: fc1?.count ?? 0,
        following: fc2?.count ?? 0,
        isFollowing: (f3rows?.data ?? []).length > 0,
        isMe: pid === userId,
      };
    },
    enabled: !!userId && !!username,
  });

  if (userId) return { page: real.data ?? null, loading: real.isLoading };

  const profile = demoState.users.find((u) => u.username === username) ?? null;
  if (!profile) return { page: null, loading: false };
  const posts = demoState.posts.filter((p) => p.user_id === profile.id);
  const reels = demoState.reels.filter((r) => r.user_id === profile.id);
  const followers = Object.values(demoState.following).filter(Boolean).length + 128 + (profile.id === "u2" ? 8000 : profile.id === DEMO_ME_ID ? 0 : 300);
  const followingCount = profile.id === DEMO_ME_ID ? Object.values(demoState.following).filter(Boolean).length : 245;
  return {
    page: {
      profile, posts, reels,
      followers, following: followingCount,
      isFollowing: !!demoState.following[profile.id],
      isMe: profile.id === DEMO_ME_ID,
    },
    loading: false,
  };
}

// ---- notifications -----------------------------------------------------------------

export function useNotifications(): UNotif[] {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<UNotif[]> => {
      if (!userId) return [];
      const [{ data: myPosts }, { data: myReels }] = await Promise.all([
        supabase.from("posts").select("id, media_urls").eq("user_id", userId),
        supabase.from("reels").select("id").eq("user_id", userId),
      ]);
      const postIds = (myPosts ?? []).map((p: { id: string }) => p.id);
      const reelIds = (myReels ?? []).map((r: { id: string }) => r.id);
      const notifs: UNotif[] = [];
      const mediaOf = new Map<string, string>();
      for (const p of (myPosts ?? []) as unknown as { id: string; media_urls: string[] | null }[]) mediaOf.set(p.id, p.media_urls?.[0] ?? "");
      if (postIds.length) {
        const [{ data: likes }, { data: comments }] = await Promise.all([
          supabase.from("likes").select(`post_id, user_id, profiles(${PROFILES_COLS})`).in("post_id", postIds).neq("user_id", userId).order("post_id").limit(30),
          supabase.from("comments").select(`post_id, user_id, content, created_at, profiles(${PROFILES_COLS})`).in("post_id", postIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        ]);
        for (const l of (likes ?? []) as unknown as { post_id: string; user_id: string; profiles: Record<string, unknown> }[]) {
          notifs.push({ id: `l-${l.user_id}-${l.post_id}`, type: "like", actor: supabaseProfile(l.profiles, l.user_id), post_id: l.post_id, postThumb: mediaOf.get(l.post_id) ?? null, created_at: new Date().toISOString() });
        }
        for (const c of (comments ?? []) as unknown as { id: string; post_id: string; user_id: string; content: string; created_at: string; profiles: Record<string, unknown> }[]) {
          notifs.push({ id: `c-${c.id}`, type: "comment", actor: supabaseProfile(c.profiles, c.user_id), post_id: c.post_id, postThumb: mediaOf.get(c.post_id) ?? null, text: c.content, created_at: c.created_at });
        }
      }
      const { data: follows } = await supabase.from("follows").select(`follower_id, created_at, profiles!follows_follower_id_fkey(${PROFILES_COLS})`).eq("following_id", userId).order("created_at", { ascending: false }).limit(30);
      for (const f of (follows ?? []) as unknown as { follower_id: string; created_at: string; profiles: Record<string, unknown> }[]) {
        notifs.push({ id: `f-${f.follower_id}`, type: "follow", actor: supabaseProfile(f.profiles, f.follower_id), created_at: f.created_at });
      }
      void reelIds;
      return notifs.slice(0, 50);
    },
    enabled: !!userId,
  });
  if (userId) return data ?? [];

  const postById = new Map(demoState.posts.map((p) => [p.id, p]));
  const base: { id: string; user_id: string; type: UNotif["type"]; post_id?: string | null; postThumb?: string | null; text?: string | null; mins: number }[] = [
    { id: "n1", user_id: "u2", type: "like", post_id: "p-me-1", postThumb: "/demo/p9.jpg", mins: 25 },
    { id: "n2", user_id: "u5", type: "follow", mins: 45 },
    { id: "n3", user_id: "u4", type: "comment", post_id: "p-me-text-1", text: "chai ☕🙌", mins: 120 },
    { id: "n4", user_id: "u3", type: "like", post_id: "r-me-1", postThumb: "/demo/p8.jpg", mins: 300 },
    { id: "n5", user_id: "u7", type: "follow", mins: 1500 },
    { id: "n6", user_id: "u6", type: "like", post_id: "p-me-text-1", mins: 1600 },
    { id: "n7", user_id: "u2", type: "follow", mins: 2900 },
    { id: "n8", user_id: "u5", type: "comment", post_id: "r-me-1", postThumb: "/demo/p8.jpg", text: "Form goals 🔥", mins: 3000 },
  ];
  return base.map((n) => ({
    id: n.id,
    type: n.type,
    actor: demoState.users.find((u) => u.id === n.user_id)!,
    post_id: n.post_id ?? null,
    postThumb: n.postThumb ?? null,
    text: n.text ?? null,
    created_at: new Date(Date.now() - n.mins * 60_000).toISOString(),
  })).filter((n) => !n.post_id || postById.has(n.post_id) || n.post_id.startsWith("r-"));
}

export function useSuggestions(): { user: UProfile; reason: string }[] {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data } = useQuery({
    queryKey: ["suggestions", userId],
    queryFn: async (): Promise<{ user: UProfile; reason: string }[]> => {
      const { data: profiles } = await supabase.from("profiles").select(`id, ${PROFILES_COLS}`).neq("id", userId!).limit(6);
      return ((profiles ?? []) as unknown as Record<string, unknown>[]).map((p) => ({
        user: supabaseProfile(p, p.id as string), reason: "Suggested for you",
      }));
    },
    enabled: !!userId,
  });
  if (userId) return data ?? [];
  return Object.entries(DEMO_SUGGESTION_REASONS)
    .filter(([id]) => !demoState.following[id])
    .map(([id, reason]) => ({ user: demoState.users.find((u) => u.id === id)!, reason }))
    .filter((s) => s.user);
}

// ---- search ---------------------------------------------------------------------------

export function useUserSearch(q: string): UProfile[] {
  const demoState = useDemo();
  const { userId } = useSession();
  const { data } = useQuery({
    queryKey: ["user-search", q, userId],
    queryFn: async (): Promise<UProfile[]> => {
      if (!q.trim()) return [];
      const { data: rows } = await supabase
        .from("profiles")
        .select(`id, ${PROFILES_COLS}`)
        .or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`)
        .limit(12);
      return ((rows ?? []) as unknown as Record<string, unknown>[]).map((p) => supabaseProfile(p, p.id as string));
    },
    enabled: !!userId && !!q.trim(),
  });
  if (userId) return data ?? [];
  const needle = q.trim().toLowerCase();
  if (!needle) return demoState.users;
  return demoState.users.filter((u) =>
    u.username.toLowerCase().includes(needle) || (u.display_name ?? "").toLowerCase().includes(needle));
}

// ---- actions ---------------------------------------------------------------------------

export function useActions() {
  const { userId } = useSession();
  const qc = useQueryClient();

  const real = {
    async like(postId: string, on: boolean) {
      if (!userId) return;
      if (on) await supabase.from("likes").insert({ post_id: postId, user_id: userId });
      else await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
      qc.invalidateQueries({ queryKey: ["all-posts", userId] });
    },
    async comment(postId: string, content: string) {
      if (!userId) return;
      await supabase.from("comments").insert({ post_id: postId, user_id: userId, content });
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["all-posts", userId] });
    },
    async follow(targetId: string, on: boolean) {
      if (!userId) return;
      if (on) await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
      else await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
      qc.invalidateQueries({ queryKey: ["profile-page"] });
    },
    async createPost(input: { files: File[]; galleryUrls?: string[]; caption: string; location?: string | null; filter?: string }) {
      if (!userId) return;
      const urls: string[] = [];
      for (const f of input.files) urls.push(await uploadMedia(userId, f));
      for (const g of input.galleryUrls ?? []) urls.push(g);
      await supabase.from("posts").insert({
        user_id: userId, media_urls: urls, caption: input.caption || null,
        location: input.location || null, hide_from_feed: false,
      });
      qc.invalidateQueries({ queryKey: ["all-posts", userId] });
    },
    async createStory(file: File) {
      if (!userId) return;
      const path = await uploadMedia(userId, file);
      await supabase.from("stories").insert({
        user_id: userId, media_url: path, close_friend_only: false,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      qc.invalidateQueries({ queryKey: ["stories", userId] });
    },
    async createReel(input: { file?: File; galleryUrl?: string; caption: string }) {
      if (!userId) return;
      const url = input.file ? await uploadMedia(userId, input.file) : input.galleryUrl!;
      await supabase.from("reels").insert({ user_id: userId, video_url: url, caption: input.caption || null });
      qc.invalidateQueries({ queryKey: ["reels", userId] });
    },
    async sendMessage(receiverId: string, content: string) {
      if (!userId) return;
      await supabase.from("messages").insert({ sender_id: userId, receiver_id: receiverId, content });
    },
    async updateProfile(patch: { display_name?: string; bio?: string }) {
      if (!userId) return;
      await supabase.from("profiles").update(patch).eq("id", userId);
      qc.invalidateQueries({ queryKey: ["profile", "me", userId] });
    },
  };

  return {
    isDemo: !userId,
    like: (postId: string, on: boolean) => (userId ? real.like(postId, on) : demoActions.toggleLike(postId)),
    comment: (postId: string, content: string) => (userId ? real.comment(postId, content) : demoActions.addComment(postId, content)),
    follow: (targetId: string, on: boolean) => (userId ? real.follow(targetId, on) : demoActions.toggleFollow(targetId)),
    createPost: async (input: { files?: File[]; galleryUrls?: string[]; caption: string; location?: string | null }) => {
      if (userId) return real.createPost({ ...input, files: input.files ?? [] });
      const urls = [...(input.files ?? []).map((f) => fileToDataUrl(f)), ...(input.galleryUrls ?? [])];
      demoActions.addPost({ media_urls: urls, caption: input.caption, location: input.location });
    },
    createStory: async (input: { file?: File; galleryUrl?: string }) => {
      if (userId && input.file) return real.createStory(input.file);
      const url = input.file ? fileToDataUrl(input.file) : input.galleryUrl!;
      demoActions.addStory(url);
    },
    createReel: async (input: { file?: File; galleryUrl?: string; caption: string; music?: string | null }) => {
      if (userId) return real.createReel({ file: input.file, galleryUrl: input.galleryUrl, caption: input.caption });
      const url = input.file ? objectUrl(input.file) : input.galleryUrl!;
      demoActions.addReel({ videoUrl: url, caption: input.caption, music: input.music });
    },
    sendMessage: (receiverId: string, content: string) => (userId ? real.sendMessage(receiverId, content) : demoActions.sendMessage(receiverId, content)),
    updateProfile: (patch: { display_name?: string; bio?: string; avatar_url?: string }) => (userId ? real.updateProfile(patch) : demoActions.updateProfile(patch)),
  };
}

function fileToDataUrl(file: File): string {
  // NOTE: for demo mode; small files only (localStorage-capped by persist())
  const url = URL.createObjectURL(file);
  return url;
}

function objectUrl(file: File): string {
  return URL.createObjectURL(file);
}
