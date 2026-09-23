// Shared app-wide types used by both the live Supabase layer and the demo layer.

export interface UProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  subscription_tier?: string | null;
  bio?: string | null;
  close_friends?: string[] | null;
  muted_users?: string[] | null;
}

export interface UPost {
  id: string;
  user_id: string;
  media_urls: string[];
  caption: string | null;
  location?: string | null;
  created_at: string;
  profiles: UProfile;
  likes: number;
  likedByMe: boolean;
  savedByMe: boolean;
  commentsCount: number;
}

export interface UStory {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
}

export interface StoryGroup {
  user: UProfile;
  items: UStory[];
  allViewed: boolean;
}

export interface UReel {
  id: string;
  user_id: string;
  video_url: string;
  poster?: string | null;
  caption: string | null;
  music: string | null;
  created_at: string;
  profiles: UProfile;
  likes: number;
  likedByMe: boolean;
  commentsCount: number;
}

export interface UComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: UProfile | null;
}

export interface UNotif {
  id: string;
  type: "like" | "follow" | "comment" | "mention";
  actor: UProfile;
  post_id?: string | null;
  postThumb?: string | null;
  text?: string | null;
  created_at: string;
}

export interface UMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  created_at: string;
}
