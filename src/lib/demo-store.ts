import { useSyncExternalStore } from "react";
import {
  DEMO_FOLLOWING, DEMO_ME_ID, DEMO_USERS, buildDemoPosts, buildDemoReels,
  buildDemoStories, buildDemoMoods, buildDemoMoodComments, DEMO_MOOD_SEEDS, demoBaseLikes, demoCommentsOf,
} from "@/lib/demo-data";
import type {
  UComment, UMessage, UMood, UMoodComment, UNotif, UPost, UProfile, UReel, UStory,
} from "@/lib/types";
import { loadMedia, saveMedia } from "@/lib/media-store";

// ---------------------------------------------------------------------------
// Demo store — the whole demo world (users, posts, stories, reels, messages)
// lives here when the visitor isn't signed in. Likes/follows/posts created in
// demo mode persist to localStorage.
// ---------------------------------------------------------------------------

interface DemoState {
  users: UProfile[];
  posts: UPost[];
  stories: UStory[];
  reels: UReel[];
  comments: UComment[];
  messages: UMessage[];
  notifs: UNotif[];
  liked: Record<string, boolean>;
  saved: Record<string, boolean>;
  following: Record<string, boolean>;
  requestsHandled: Record<string, boolean>; // friend requests already accepted or deleted
  viewedStories: Record<string, boolean>; // by story user_id
  edits: Partial<UProfile>;
  followingUsers: Record<string, boolean>; // follows of other demo users? not needed
  moods: UMood[];
  moodComments: UMoodComment[];
}

type Persisted = Pick<
  DemoState, "liked" | "saved" | "following" | "requestsHandled" | "viewedStories" | "edits"
> & {
  myPosts: UPost[]; myStories: UStory[]; myReels: UReel[];
  myComments: UComment[]; myMessages: UMessage[];
  myMoods: UMood[]; myMoodComments: UMoodComment[];
};

const LS_KEY = "socialverse-demo-v1";

function loadPersisted(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Built-in demo posts and reels that belong to the current user. They come from the seed data, so they
// are never saved as "mine" (saving them again would duplicate them on every reload).
function seedIds(): Set<string> {
  return new Set([...buildDemoPosts(), ...buildDemoReels(), ...DEMO_MOOD_SEEDS].map((x) => x.id));
}

function buildInitial(saved: Partial<Persisted> = {}): DemoState {
  const users = DEMO_USERS.map((u) => (u.id === DEMO_ME_ID ? { ...u, ...saved.edits } : u));
  const seeds = seedIds();
  const myPosts = (saved.myPosts ?? []).filter((p) => !seeds.has(p.id));
  const posts = [...myPosts, ...buildDemoPosts()].map((p) => ({
    ...p,
    likedByMe: !!saved.liked?.[p.id],
    savedByMe: !!saved.saved?.[p.id],
    likes: p.likes + (saved.liked?.[p.id] ? 1 : 0),
    commentsCount: p.commentsCount + (saved.myComments?.filter((c) => c.post_id === p.id).length ?? 0),
  }));
  const myStories = saved.myStories ?? [];
  const myReels = (saved.myReels ?? []).filter((r) => !seeds.has(r.id));
  const reels = [...myReels, ...buildDemoReels()].map((r) => ({
    ...r,
    likedByMe: !!saved.liked?.[r.id],
    likes: r.likes + (saved.liked?.[r.id] ? 1 : 0),
    commentsCount: r.commentsCount + (saved.myComments?.filter((c) => c.post_id === r.id).length ?? 0),
  }));
  const following: Record<string, boolean> = {};
  for (const id of DEMO_FOLLOWING) following[id] = true;
  Object.assign(following, saved.following ?? {});

  const myMoods = (saved.myMoods ?? []).filter((m) => !seeds.has(m.id));
  const moods = [...myMoods, ...buildDemoMoods()].map((m) => ({
    ...m,
    likes: m.likes + (saved.liked?.[m.id] ? 1 : 0),
    commentsCount: m.commentsCount + (saved.myMoodComments?.filter((c) => c.mood_id === m.id).length ?? 0),
  }));
  const moodComments: UMoodComment[] = [...(saved.myMoodComments ?? []), ...buildDemoMoodComments()];

  const comments: UComment[] = [
    ...(saved.myComments ?? []),
    ...[...myPosts.map((p) => p.id), ...buildDemoPosts().map((p) => p.id), ...myReels.map((r) => r.id), ...buildDemoReels().map((r) => r.id)].flatMap((pid) =>
      demoCommentsOf(pid).map((c, i) => ({
        id: `${pid}-c${i}`, post_id: pid, user_id: c.user_id,
        content: c.content, created_at: new Date(Date.now() - c.mins * 60_000).toISOString(),
        profiles: DEMO_USERS.find((u) => u.id === c.user_id),
      })),
    ),
  ];

  return {
    users,
    posts,
    stories: [...myStories, ...buildDemoStories()],
    reels,
    comments,
    messages: saved.myMessages ?? [],
    notifs: [],
    liked: saved.liked ?? {},
    saved: saved.saved ?? {},
    following,
    requestsHandled: saved.requestsHandled ?? {},
    viewedStories: saved.viewedStories ?? {},
    edits: saved.edits ?? {},
    followingUsers: {},
    moods,
    moodComments,
  };
}

// The first render (server and browser) uses the built-in demo data only, so the HTML matches and
// hydration does not fail. Saved changes are applied after hydration by hydrateDemo().
let state: DemoState = buildInitial();
// Used while hydrating (matches the server HTML), so saved changes never cause a hydration mismatch.
const serverState: DemoState = state;

export function hydrateDemo() {
  state = buildInitial(loadPersisted());
  listeners.forEach((l) => l());
  void ensureMedia();
}

// Playable URLs for uploaded videos. Stored reels keep "idb:<key>"; this maps the key to a blob URL
// created from IndexedDB in this page.
const blobUrls = new Map<string, string>();

export function resolveVideoUrl(url: string): string {
  return url.startsWith("idb:") ? blobUrls.get(url.slice(4)) ?? "" : url;
}

/**
 * Saves a mood's photos/videos on this device (IndexedDB) and adds the mood to the demo feed.
 * Media is stored as "idb:<key>", the same way uploaded reels are, so it survives a reload.
 */
export async function addMoodWithFiles(input: { mood: string; note: string; files: File[] }): Promise<string> {
  const media: UMood["media"] = [];
  for (const file of input.files) {
    const kind = file.type.startsWith("video") ? "video" : "image";
    const key = `mood-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await saveMedia(key, file);
      media.push({ url: `idb:${key}`, kind });
    } catch {
      media.push({ url: URL.createObjectURL(file), kind }); // session only, if storage is full
    }
  }
  const id = demoActions.addMood({ mood: input.mood, note: input.note, media });
  void ensureMedia();
  return id;
}

export async function ensureMedia() {
  const missing = new Set(
    [...state.reels.map((r) => r.video_url), ...state.moods.flatMap((m) => m.media.map((x) => x.url))]
      .filter((u) => u.startsWith("idb:") && !blobUrls.has(u.slice(4)))
      .map((u) => u.slice(4)),
  );
  if (missing.size === 0) return;
  await Promise.all(
    [...missing].map(async (key) => {
      try {
        const blob = await loadMedia(key);
        if (blob) blobUrls.set(key, URL.createObjectURL(blob));
      } catch {
        /* missing media: the reel shows its poster */
      }
    }),
  );
  // A new state object, so subscribers (useSyncExternalStore) see the change and re-render.
  state = { ...state };
  listeners.forEach((l) => l());
}

/** Lets a component re-render when the demo data (or a loaded video) changes. */
export function subscribeDemo(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const listeners = new Set<() => void>();

function persist() {
  try {
    const small = <T extends { media_urls?: string[]; media_url?: string; video_url?: string }>(arr: T[]): T[] =>
      // don't persist huge dataURL blobs
      arr.filter((x) => {
        const s = x.media_urls?.[0] ?? x.media_url ?? x.video_url ?? "";
        return !s.startsWith("data:") || s.length < 1_500_000;
      });
    const data: Persisted = {
      liked: state.liked,
      saved: state.saved,
      following: state.following,
      requestsHandled: state.requestsHandled,
      viewedStories: state.viewedStories,
      edits: state.edits,
      myPosts: small(state.posts.filter((p) => p.user_id === DEMO_ME_ID && !seedIds().has(p.id))),
      myStories: small(state.stories.filter((s) => s.user_id === DEMO_ME_ID)),
      myReels: small(state.reels.filter((r) => r.user_id === DEMO_ME_ID && !seedIds().has(r.id))),
      myComments: state.comments.filter((c) => c.user_id === DEMO_ME_ID),
      myMessages: state.messages.slice(-100),
      myMoods: state.moods.filter((m) => m.user_id === DEMO_ME_ID && !seedIds().has(m.id)),
      myMoodComments: state.moodComments.filter((c) => c.user_id === DEMO_ME_ID),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* quota — ignore */
  }
}

function set(patch: (s: DemoState) => DemoState) {
  state = patch(state);
  persist();
  listeners.forEach((l) => l());
}

export function useDemo(): DemoState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => serverState,
  );
}

export function getDemo(): DemoState {
  return state;
}

// ---- derived helpers -------------------------------------------------------

export function demoMe(): UProfile {
  return state.users.find((u) => u.id === DEMO_ME_ID)!;
}

export function demoCommentsFor(postId: string): UComment[] {
  return state.comments.filter((c) => c.post_id === postId);
}

// ---- demo actions ----------------------------------------------------------

let idc = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${idc++}`;

export const demoActions = {
  toggleLike(id: string) {
    set((s) => {
      const isOn = !!s.liked[id];
      const liked = { ...s.liked, [id]: !isOn };
      if (!isOn) delete liked[id];
      return {
        ...s,
        liked,
        posts: s.posts.map((p) => (p.id === id ? { ...p, likedByMe: !isOn, likes: p.likes + (isOn ? -1 : 1) } : p)),
        reels: s.reels.map((r) => (r.id === id ? { ...r, likedByMe: !isOn, likes: r.likes + (isOn ? -1 : 1) } : r)),
      };
    });
  },
  toggleSave(id: string) {
    set((s) => {
      const saved = { ...s.saved, [id]: !s.saved[id] };
      if (s.saved[id]) delete saved[id];
      return { ...s, saved, posts: s.posts.map((p) => (p.id === id ? { ...p, savedByMe: !p.savedByMe } : p)) };
    });
  },
  toggleFollow(userId: string) {
    set((s) => {
      const following = { ...s.following, [userId]: !s.following[userId] };
      if (s.following[userId]) delete following[userId];
      return { ...s, following };
    });
  },
  handleRequest(userId: string, accept: boolean) {
    set((s) => {
      const following = { ...s.following };
      if (accept) following[userId] = true;
      return { ...s, following, requestsHandled: { ...s.requestsHandled, [userId]: true } };
    });
  },
  addComment(postId: string, content: string) {
    const c: UComment = {
      id: nid("c"), post_id: postId, user_id: DEMO_ME_ID, content,
      created_at: new Date().toISOString(), profiles: demoMe(),
    };
    set((s) => ({
      ...s,
      comments: [...s.comments, c],
      posts: s.posts.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)),
      reels: s.reels.map((r) => (r.id === postId ? { ...r, commentsCount: r.commentsCount + 1 } : r)),
    }));
  },
  toggleMoodLike(id: string) {
    set((s) => {
      const isOn = !!s.liked[id];
      const liked = { ...s.liked, [id]: !isOn };
      if (isOn) delete liked[id];
      const moods = s.moods.map((m) => (m.id === id ? { ...m, likes: Math.max(0, m.likes + (isOn ? -1 : 1)) } : m));
      return { ...s, liked, moods };
    });
  },
  addMoodComment(moodId: string, content: string) {
    const c: UMoodComment = {
      id: nid("mc"), mood_id: moodId, user_id: DEMO_ME_ID, content,
      created_at: new Date().toISOString(), profiles: demoMe(),
    };
    set((s) => ({
      ...s,
      moodComments: [...s.moodComments, c],
      moods: s.moods.map((m) => (m.id === moodId ? { ...m, commentsCount: m.commentsCount + 1 } : m)),
    }));
  },
  addMood(input: { mood: string; note: string; media: UMood["media"] }) {
    const m: UMood = {
      id: nid("mo"), user_id: DEMO_ME_ID, mood: input.mood, note: input.note, media: input.media,
      created_at: new Date().toISOString(), likes: 0, commentsCount: 0, profiles: demoMe(),
    };
    set((s) => ({ ...s, moods: [m, ...s.moods] }));
    return m.id;
  },
  markStorySeen(userId: string) {
    set((s) => ({ ...s, viewedStories: { ...s.viewedStories, [userId]: true } }));
  },
  addPost(input: { media_urls: string[]; caption: string; location?: string | null }) {
    const p: UPost = {
      id: nid("p"), user_id: DEMO_ME_ID, media_urls: input.media_urls,
      caption: input.caption, location: input.location ?? null,
      created_at: new Date().toISOString(), profiles: demoMe(),
      likes: 0, likedByMe: false, savedByMe: false, commentsCount: 0,
    };
    set((s) => ({ ...s, posts: [p, ...s.posts] }));
    return p.id;
  },
  addStory(mediaUrl: string) {
    const st: UStory = { id: nid("s"), user_id: DEMO_ME_ID, media_url: mediaUrl, created_at: new Date().toISOString() };
    set((s) => ({ ...s, stories: [...s.stories, st] }));
  },
  addReel(input: { videoUrl: string; caption: string; music?: string | null; poster?: string | null }) {
    const r: UReel = {
      id: nid("r"), user_id: DEMO_ME_ID, video_url: input.videoUrl, poster: input.poster ?? null,
      caption: input.caption, music: input.music ?? "Original audio · aarav_sharma",
      created_at: new Date().toISOString(), profiles: demoMe(),
      likes: 0, likedByMe: false, commentsCount: 0,
    };
    set((s) => ({ ...s, reels: [r, ...s.reels] }));
    return r.id;
  },
  sendMessage(receiverId: string, content: string) {
    const m: UMessage = {
      id: nid("m"), sender_id: DEMO_ME_ID, receiver_id: receiverId,
      content, created_at: new Date().toISOString(),
    };
    set((s) => ({ ...s, messages: [...s.messages, m] }));
    // simulated reply after a beat (makes DMs feel alive)
    const replies = ["Haha nice 😄", "Bilkul!", "Bata deta hoon thodi der me", "🔥🔥", "Ok done!", "Chai pe milte hain ☕"];
    setTimeout(() => {
      const reply: UMessage = {
        id: nid("m"), sender_id: receiverId, receiver_id: DEMO_ME_ID,
        content: replies[Math.floor(Math.random() * replies.length)],
        created_at: new Date().toISOString(),
      };
      set((s) => ({ ...s, messages: [...s.messages, reply] }));
    }, 2500);
  },
  updateProfile(patch: Partial<UProfile>) {
    set((s) => ({
      ...s,
      edits: { ...s.edits, ...patch },
      users: s.users.map((u) => (u.id === DEMO_ME_ID ? { ...u, ...patch } : u)),
      posts: s.posts.map((p) => (p.user_id === DEMO_ME_ID ? { ...p, profiles: { ...p.profiles, ...patch } } : p)),
      reels: s.reels.map((r) => (r.user_id === DEMO_ME_ID ? { ...r, profiles: { ...r.profiles, ...patch } } : r)),
    }));
  },
  baseLikes: demoBaseLikes,
};

export function resetDemo() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  state = buildInitial();
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// UI overlay store (create modal, search, notifications, story viewer)
// ---------------------------------------------------------------------------

export type OverlayKind = null | "create" | "search" | "notifications" | "share" | "post-menu" | "edit-profile";

export interface UIState {
  overlay: OverlayKind;
  createMode: "photo" | "video" | "text" | null;
  storyUser: string | null; // username
  sharePost: UPost | null;
  shareKind: "post" | "reel";
  shareId: string | null;
}

let uiState: UIState = {
  overlay: null, createMode: null, storyUser: null,
  sharePost: null, shareKind: "post", shareId: null,
};
const uiListeners = new Set<() => void>();

function setUI(p: Partial<UIState>) {
  uiState = { ...uiState, ...p };
  uiListeners.forEach((l) => l());
}

export const ui = {
  openCreate: (mode: UIState["createMode"] = null) => setUI({ overlay: "create", createMode: mode }),
  openSearch: () => setUI({ overlay: "search" }),
  openNotifications: () => setUI({ overlay: "notifications" }),
  openShare: (post: UPost, kind: "post" | "reel" = "post") => setUI({ overlay: "share", sharePost: post, shareKind: kind }),
  openEditProfile: () => setUI({ overlay: "edit-profile" }),
  openStories: (username: string) => setUI({ storyUser: username }),
  closeAll: () => setUI({ overlay: null, createMode: null, storyUser: null, sharePost: null }),
  closeStories: () => setUI({ storyUser: null }),
};

export function useUI(): UIState {
  return useSyncExternalStore(
    (cb) => {
      uiListeners.add(cb);
      return () => uiListeners.delete(cb);
    },
    () => uiState,
    () => uiState,
  );
}

/**
 * Swipe-preview pages take over the full state of the page that opened them. Reels with large media
 * are not saved to localStorage, so a separate page cannot rebuild them from storage.
 */
export function applyDemoSnapshot(snap: DemoState) {
  state = snap;
  listeners.forEach((l) => l());
  void ensureMedia();
}
