import { useSyncExternalStore } from "react";
import {
  DEMO_FOLLOWING, DEMO_ME_ID, DEMO_USERS, buildDemoPosts, buildDemoReels,
  buildDemoStories, demoBaseLikes, demoCommentsOf,
} from "@/lib/demo-data";
import type { UComment, UMessage, UNotif, UPost, UProfile, UReel, UStory } from "@/lib/types";

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
  viewedStories: Record<string, boolean>; // by story user_id
  edits: Partial<UProfile>;
  followingUsers: Record<string, boolean>; // follows of other demo users? not needed
}

type Persisted = Pick<
  DemoState, "liked" | "saved" | "following" | "viewedStories" | "edits"
> & {
  myPosts: UPost[]; myStories: UStory[]; myReels: UReel[];
  myComments: UComment[]; myMessages: UMessage[];
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

function buildInitial(): DemoState {
  const saved = loadPersisted();
  const users = DEMO_USERS.map((u) => (u.id === DEMO_ME_ID ? { ...u, ...saved.edits } : u));
  const myPosts = saved.myPosts ?? [];
  const posts = [...myPosts, ...buildDemoPosts()].map((p) => ({
    ...p,
    likedByMe: !!saved.liked?.[p.id],
    savedByMe: !!saved.saved?.[p.id],
    likes: p.likes + (saved.liked?.[p.id] ? 1 : 0),
    commentsCount: p.commentsCount + (saved.myComments?.filter((c) => c.post_id === p.id).length ?? 0),
  }));
  const myStories = saved.myStories ?? [];
  const myReels = saved.myReels ?? [];
  const reels = [...myReels, ...buildDemoReels()].map((r) => ({
    ...r,
    likedByMe: !!saved.liked?.[r.id],
    likes: r.likes + (saved.liked?.[r.id] ? 1 : 0),
    commentsCount: r.commentsCount + (saved.myComments?.filter((c) => c.post_id === r.id).length ?? 0),
  }));
  const following: Record<string, boolean> = {};
  for (const id of DEMO_FOLLOWING) following[id] = true;
  Object.assign(following, saved.following ?? {});

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
    viewedStories: saved.viewedStories ?? {},
    edits: saved.edits ?? {},
    followingUsers: {},
  };
}

let state: DemoState = buildInitial();
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
      viewedStories: state.viewedStories,
      edits: state.edits,
      myPosts: small(state.posts.filter((p) => p.user_id === DEMO_ME_ID)),
      myStories: small(state.stories.filter((s) => s.user_id === DEMO_ME_ID)),
      myReels: small(state.reels.filter((r) => r.user_id === DEMO_ME_ID)),
      myComments: state.comments.filter((c) => c.user_id === DEMO_ME_ID),
      myMessages: state.messages.slice(-100),
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
    () => state,
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
