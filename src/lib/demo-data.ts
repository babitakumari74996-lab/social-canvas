import type { UPost, UProfile, UReel, UStory, UNotif } from "@/lib/types";

// ---------------------------------------------------------------------------
// Demo world for Socialverse. Avatars/post images are local files in /public/demo.
// Reel sample videos are public Google-hosted mp4s.
// ---------------------------------------------------------------------------

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

// Post imagery: locally generated where available; stable public CDNs otherwise.
export const IMG = {
  p1: "/demo/p1.jpg",           // Taj Mahal (local)
  p2: "/demo/p2.jpg",           // street food (local)
  p3: "https://picsum.photos/id/0/900/900",                       // desk/laptop
  p4: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&h=900&fit=crop", // gym
  p5: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=900&h=900&fit=crop", // city night
  p6: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&h=900&fit=crop", // art
  p7: "https://picsum.photos/id/1018/900/900",                    // mountains
  p8: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&h=900&fit=crop", // car
  p9: "https://picsum.photos/id/237/900/900",                     // dog
  p10: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=900&h=900&fit=crop", // chai
};

export const DEMO_ME_ID = "me";

export const DEMO_USERS: UProfile[] = [
  {
    id: DEMO_ME_ID,
    username: "aarav_sharma",
    display_name: "Aarav Sharma",
    bio: "Product designer ✨ | Patna → Bengaluru\nChai ☕ + cameras 📷",
    avatar_url: "/demo/av1.jpg",
    is_verified: false,
    subscription_tier: "plus",
  },
  {
    id: "u2",
    username: "priyaverma",
    display_name: "Priya Verma",
    bio: "Chasing sunsets 🌅 | 23 countries | Travel tips ↓",
    avatar_url: "/demo/av2.jpg",
    is_verified: true,
    subscription_tier: "free",
  },
  {
    id: "u3",
    username: "rohan.eats",
    display_name: "Rohan Khanna",
    bio: "Food blogger 🍜 | Delhi • Mumbai | New reel every Friday 🎥",
    avatar_url: "/demo/av3.jpg",
    is_verified: false,
    subscription_tier: "free",
  },
  {
    id: "u4",
    username: "ananya.codes",
    display_name: "Ananya Iyer",
    bio: "SWE @ fintech | React • Go | Tea over coffee 🍵",
    avatar_url: "/demo/av4.jpg",
    is_verified: true,
    subscription_tier: "free",
  },
  {
    id: "u5",
    username: "vivek.fit",
    display_name: "Vivek Singh",
    bio: "Fitness coach 💪 | Online coaching ↓ | Transformation stories",
    avatar_url: "/demo/av5.jpg",
    is_verified: false,
    subscription_tier: "free",
  },
  {
    id: "u6",
    username: "mehra.streets",
    display_name: "Kabir Mehra",
    bio: "Street photography 📷 | Bombay nights",
    avatar_url: "/demo/av6.jpg",
    is_verified: false,
    subscription_tier: "free",
  },
  {
    id: "u7",
    username: "ishita.art",
    display_name: "Ishita Das",
    bio: "Artist 🎨 | Watercolour & murals | Commissions open 📩",
    avatar_url: "/demo/av7.jpg",
    is_verified: false,
    subscription_tier: "free",
  },
  {
    id: "u8",
    username: "neha.travels",
    display_name: "Neha Kapoor",
    bio: "Slow travel 🚞 | Himalayas diaries",
    avatar_url: "/demo/av8.jpg",
    is_verified: false,
    subscription_tier: "free",
  },
];

export interface DemoPostSeed {
  id: string;
  user_id: string;
  media_urls: string[];
  caption: string | null;
  location?: string | null;
  mins: number;
  likes: number;
  comments: { user_id: string; content: string; mins: number }[];
}

export const DEMO_POSTS: DemoPostSeed[] = [
  {
    id: "p-u2-1", user_id: "u2", media_urls: ["/demo/p1.jpg"],
    caption: "Taj in the first light ✨ no filter needed. #incredibleindia #tajmahal #sunrise",
    location: "Agra, Uttar Pradesh", mins: 180, likes: 1284,
    comments: [
      { user_id: "u4", content: "This framing 😍", mins: 150 },
      { user_id: "u8", content: "Golden hour magic ✨", mins: 120 },
    ],
  },
  {
    id: "p-me-text-1", user_id: DEMO_ME_ID, media_urls: [],
    caption: "Hot take: chai > coffee on rainy days ☕🌧️ Fight me in the comments.",
    mins: 65, likes: 96,
    comments: [
      { user_id: "u3", content: "coffee gang assemble ☕", mins: 50 },
      { user_id: "u7", content: "finally you said it 🙌", mins: 40 },
    ],
  },
  {
    id: "p-u3-1", user_id: "u3", media_urls: ["/demo/p2.jpg"],
    caption: "Chaat so good I forgot to take photos first 😅 #streetfood #delhifoodie",
    location: "Chandni Chowk, Delhi", mins: 300, likes: 892,
    comments: [
      { user_id: "u2", content: "Recipe post when?? 👀", mins: 260 },
      { user_id: "u5", content: "my gym trainer is crying rn 😭", mins: 200 },
    ],
  },
  {
    id: "p-u4-1", user_id: "u4", media_urls: [IMG.p3],
    caption: "Shipped the new feature at 2am. Worth it 🚀 #buildinpublic #reactjs",
    mins: 420, likes: 341,
    comments: [
      { user_id: DEMO_ME_ID, content: "Congrats!! 🎉", mins: 380 },
      { user_id: "u3", content: "Inspiring 🔥", mins: 350 },
    ],
  },
  {
    id: "p-me-1", user_id: DEMO_ME_ID, media_urls: [IMG.p9],
    caption: "Sunday with this guy 🐶 no thoughts, only treats.",
    mins: 1800, likes: 88,
    comments: [
      { user_id: "u2", content: "Awww 🥺", mins: 1700 },
      { user_id: "u4", content: "Name reveal please?", mins: 1600 },
    ],
  },
  {
    id: "p-u5-1", user_id: "u5", media_urls: [IMG.p4],
    caption: "Monday reset ✅ 100kg x 5. Who's training today? #fitness #gym #discipline",
    location: "Iron Temple Gym", mins: 540, likes: 2103,
    comments: [
      { user_id: DEMO_ME_ID, content: "Beast 🔥", mins: 500 },
      { user_id: "u6", content: "form check please 🙏", mins: 450 },
    ],
  },
  {
    id: "p-u3-text-1", user_id: "u3", media_urls: [],
    caption: "Open thread: best biryani in India. Wrong answers only 👇",
    mins: 130, likes: 214,
    comments: [
      { user_id: "u8", content: "Hyderabad. Next question.", mins: 100 },
      { user_id: "u5", content: "mom's kitchen 😌", mins: 80 },
    ],
  },
  {
    id: "p-u6-1", user_id: "u6", media_urls: [IMG.p5],
    caption: "Bombay after rain hits different 🌧️ #streetphotography #mumbai",
    location: "Marine Drive, Mumbai", mins: 720, likes: 1567,
    comments: [
      { user_id: "u7", content: "The reflections!! 😍", mins: 700 },
      { user_id: "u2", content: "This city 🫶", mins: 690 },
    ],
  },
  {
    id: "p-u7-1", user_id: "u7", media_urls: [IMG.p6],
    caption: "New mural study — 6 hours in. Title ideas? 🎨 #watercolor #artistsoninstagram",
    mins: 960, likes: 743,
    comments: [
      { user_id: "u8", content: "Flowing river 🌊", mins: 900 },
      { user_id: "u4", content: "\"GANGES\"", mins: 850 },
    ],
  },
  {
    id: "p-u6-2", user_id: "u6", media_urls: [IMG.p8],
    caption: "Midnight run 🏎️ #carphotography #nightdrive",
    mins: 1200, likes: 655,
    comments: [
      { user_id: "u5", content: "That body kit 🔥", mins: 1100 },
    ],
  },
  {
    id: "p-u8-1", user_id: "u8",
    media_urls: [IMG.p7, "https://picsum.photos/id/1018/900/900", "https://picsum.photos/id/1039/900/900"],
    caption: "3 days, 2 passes, endless mountains 🏔️ swipe → #himalayas #trekking",
    location: "Kedarnath, Uttarakhand", mins: 1560, likes: 987,
    comments: [
      { user_id: "u2", content: "That second shot 🤯", mins: 1400 },
    ],
  },
  {
    id: "p-u4-text-1", user_id: "u4", media_urls: [],
    caption: "TypeScript tip: `satisfies` > `as`. That's it. That's the post. #typescript",
    mins: 3000, likes: 178,
    comments: [
      { user_id: DEMO_ME_ID, content: "learned this the hard way 😅", mins: 2800 },
    ],
  },
  {
    id: "p-u5-2", user_id: "u5",
    media_urls: ["https://picsum.photos/id/1011/900/900"],
    caption: "Trail run mornings > everything ⛰️ #running #trailrun",
    mins: 2040, likes: 432,
    comments: [],
  },
  {
    id: "p-u3-2", user_id: "u3", media_urls: [IMG.p10],
    caption: "Cutting chai o'clock ☕ #chaitime",
    mins: 2400, likes: 501,
    comments: [
      { user_id: "u4", content: "the进步 of this chai >>>", mins: 2300 },
    ],
  },
];

export interface DemoStorySeed { user_id: string; media_url: string; mins: number; }

export const DEMO_STORIES: DemoStorySeed[] = [
  { user_id: "u2", media_url: "https://picsum.photos/id/1016/720/1280", mins: 40 },
  { user_id: "u2", media_url: "/demo/p1.jpg", mins: 90 },
  { user_id: "u3", media_url: "/demo/p2.jpg", mins: 60 },
  { user_id: "u4", media_url: IMG.p3, mins: 120 },
  { user_id: "u5", media_url: "https://picsum.photos/id/1015/720/1280", mins: 30 },
  { user_id: "u6", media_url: IMG.p5, mins: 200 },
  { user_id: "u6", media_url: "https://picsum.photos/id/1060/720/1280", mins: 100 },
  { user_id: "u7", media_url: IMG.p6, mins: 150 },
  { user_id: "u8", media_url: "https://picsum.photos/id/1039/720/1280", mins: 55 },
];

export interface DemoReelSeed {
  id: string; user_id: string; video_url: string; poster: string;
  caption: string; music: string; mins: number; likes: number;
  comments: { user_id: string; content: string; mins: number }[];
}

const V = (name: string) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

export const DEMO_REELS: DemoReelSeed[] = [
  {
    id: "r-u3-1", user_id: "u3", video_url: V("ForBiggerFun"), poster: "/demo/p2.jpg",
    caption: "Street chaat in 60 seconds 🔥 #foodreels #indianfood #chaat",
    music: "Original audio · rohan.eats", mins: 200, likes: 3241,
    comments: [
      { user_id: "u2", content: "mouth watering rn 🤤", mins: 150 },
      { user_id: DEMO_ME_ID, content: "location?? 👀", mins: 100 },
    ],
  },
  {
    id: "r-u5-1", user_id: "u5", video_url: V("ForBiggerBlazes"), poster: IMG.p4,
    caption: "5 moves for stronger legs 🦵 SAVE this for gym day! #fitness #legday",
    music: "Motivation Mode · DJ Aryan", mins: 500, likes: 8712,
    comments: [
      { user_id: "u6", content: "day 3 of following this 🔥", mins: 300 },
    ],
  },
  {
    id: "r-u2-1", user_id: "u2", video_url: V("ForBiggerEscapes"), poster: IMG.p7,
    caption: "Sunrise trek vlog ⛰️ Part 1 — the climb #travelreels #himalayas",
    music: "Wanderlust · Ritika", mins: 900, likes: 15600,
    comments: [
      { user_id: "u8", content: "take me next time 🙋‍♀️", mins: 700 },
      { user_id: "u4", content: "cinematic 🎬", mins: 500 },
    ],
  },
  {
    id: "r-u6-1", user_id: "u6", video_url: V("ForBiggerJoyrides"), poster: IMG.p5,
    caption: "Night drive through Marine Drive 🌊 #mumbai #nightdrive",
    music: "Lo-fi Bombay · SLOWED", mins: 1500, likes: 9821,
    comments: [
      { user_id: "u2", content: "queen's necklace 💎", mins: 1200 },
    ],
  },
  {
    id: "r-me-1", user_id: DEMO_ME_ID, video_url: V("SubaruOutbackOnStreetAndDirt"), poster: IMG.p8,
    caption: "Weekend drive dump 🚗💨 #roadtrip",
    music: "Highway Beats · Anon", mins: 2600, likes: 642,
    comments: [
      { user_id: "u5", content: "Form goals 🔥", mins: 2400 },
    ],
  },
];

export interface DemoNotifSeed {
  id: string; user_id: string; type: UNotif["type"];
  post_id?: string | null; postThumb?: string | null; text?: string | null; mins: number;
}

export const DEMO_NOTIF_SEEDS: DemoNotifSeed[] = [
  { id: "n1", user_id: "u2", type: "like", post_id: "p-me-1", postThumb: IMG.p9, mins: 25 },
  { id: "n2", user_id: "u5", type: "follow", mins: 45 },
  { id: "n3", user_id: "u4", type: "comment", post_id: "p-me-text-1", text: "chai ☕🙌", mins: 120 },
  { id: "n4", user_id: "u3", type: "like", post_id: "r-me-1", postThumb: IMG.p8, mins: 300 },
  { id: "n5", user_id: "u7", type: "follow", mins: 1500 },
  { id: "n6", user_id: "u6", type: "like", post_id: "p-me-text-1", mins: 1600 },
  { id: "n7", user_id: "u2", type: "follow", mins: 2900 },
  { id: "n8", user_id: "u5", type: "comment", post_id: "r-me-1", postThumb: IMG.p8, text: "Form goals 🔥", mins: 3000 },
];

// Users I already follow in the demo world (rest are suggestions).
export const DEMO_FOLLOWING = ["u3", "u4", "u6", "u8"];

export const DEMO_SUGGESTION_REASONS: Record<string, string> = {
  u2: "Followed by rohan.eats + 2 more",
  u5: "Followed by mehra.streets",
  u7: "New on Socialverse",
};

// Sample clips offered inside the Create flow (so demo works without uploads).
export const DEMO_GALLERY = Object.values(IMG);

export const DEMO_VIDEO_GALLERY = DEMO_REELS.map((r) => ({ url: r.video_url, poster: r.poster }));

// Materialise seeded rows with timestamps.
export function buildDemoPosts(): UPost[] {
  return DEMO_POSTS.map((p) => {
    const profiles = DEMO_USERS.find((u) => u.id === p.user_id)!;
    return {
      id: p.id, user_id: p.user_id, media_urls: p.media_urls, caption: p.caption,
      location: p.location ?? null, created_at: ago(p.mins), profiles,
      likes: p.likes, likedByMe: false, savedByMe: false, commentsCount: p.comments.length,
    } satisfies UPost;
  });
}

export function buildDemoStories(): UStory[] {
  return DEMO_STORIES.map((s, i) => ({
    id: `s-${i}`, user_id: s.user_id, media_url: s.media_url, created_at: ago(s.mins),
  }));
}

export function buildDemoReels(): UReel[] {
  return DEMO_REELS.map((r) => {
    const profiles = DEMO_USERS.find((u) => u.id === r.user_id)!;
    return {
      id: r.id, user_id: r.user_id, video_url: r.video_url, poster: r.poster,
      caption: r.caption, music: r.music, created_at: ago(r.mins), profiles,
      likes: r.likes, likedByMe: false, commentsCount: r.comments.length,
    } satisfies UReel;
  });
}

export function demoCommentsOf(postId: string): { user_id: string; content: string; mins: number }[] {
  if (postId.startsWith("r-")) return DEMO_REELS.find((r) => r.id === postId)?.comments ?? [];
  return DEMO_POSTS.find((p) => p.id === postId)?.comments ?? [];
}

export function demoBaseLikes(postId: string): number {
  if (postId.startsWith("r-")) return DEMO_REELS.find((r) => r.id === postId)?.likes ?? 0;
  return DEMO_POSTS.find((p) => p.id === postId)?.likes ?? 0;
}
