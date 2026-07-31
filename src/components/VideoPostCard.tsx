import { useState, useRef, useCallback, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Play,
  Globe,
  Bookmark,
  Flag,
  Link,
  EyeOff,
  Music,
  Video,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar } from "./PostCard";

export type VideoPost = {
  id: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  videoUrl: string;
  posterUrl?: string;
  caption?: string | null;
  createdAt: string;
  likes: number;
  comments: number;
  shares?: number;
  isLiked?: boolean;
};

interface VideoPostCardProps {
  post: VideoPost;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function VideoPostCard({ post, onLike, onComment, onShare }: VideoPostCardProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const caption = post.caption ?? "";
  const captionTruncated = caption.length > 150;
  const displayCaption = captionExpanded || !captionTruncated
    ? caption
    : caption.slice(0, 150) + "...";
  const timestamp = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <div className="card-social overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <Avatar
            path={post.author.avatar_url}
            alt={post.author.display_name ?? post.author.username}
            size={40}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                {post.author.display_name ?? post.author.username}
              </span>
              {post.author.is_verified && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 fill-primary"
                  aria-label="Verified"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{timestamp}</span>
              <span>·</span>
              <Globe className="h-3 w-3" />
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border bg-card shadow-lg py-1 animate-in fade-in duration-150">
              {[
                { icon: Bookmark, label: "Save post" },
                { icon: Link, label: "Copy link" },
                { icon: EyeOff, label: "Hide post" },
                { icon: Flag, label: "Report post" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Section */}
      <div
        className="relative bg-black cursor-pointer group"
        onClick={togglePlay}
      >
        {videoError ? (
          <div className="aspect-[9/16] max-h-[600px] flex items-center justify-center bg-muted/20">
            <div className="text-center px-6">
              <Video className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">This video could not be loaded.</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              src={post.videoUrl}
              poster={post.posterUrl}
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              className="w-full aspect-[9/16] max-h-[600px] object-cover"
              onEnded={handleVideoEnd}
              onError={() => setVideoError(true)}
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105">
                  <Play className="h-7 w-7 text-foreground ml-0.5" fill="currentColor" strokeWidth={1.8} />
                </div>
              </div>
            )}
            <button
              onClick={toggleMute}
              className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" strokeWidth={1.8} />
              ) : (
                <Volume2 className="h-4 w-4" strokeWidth={1.8} />
              )}
            </button>
          </>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pt-2.5 pb-1">
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold hover:underline cursor-pointer mr-1.5">
              {post.author.display_name ?? post.author.username}
            </span>
            {displayCaption}
          </p>
          {captionTruncated && (
            <button
              onClick={() => setCaptionExpanded(!captionExpanded)}
              className="text-sm text-muted-foreground/70 hover:text-muted-foreground mt-0.5 transition-colors"
            >
              {captionExpanded ? "See less" : "See more"}
            </button>
          )}
        </div>
      )}

      {/* Translation + Original Audio */}
      <div className="flex items-center gap-3 px-4 py-1.5">
        <button className="text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground transition-colors">
          Hide translation
        </button>
        <span className="text-xs text-muted-foreground/40">·</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
          <Music className="h-3 w-3" strokeWidth={1.8} />
          Original audio
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Heart className="h-3 w-3 text-white" fill="white" strokeWidth={2.5} />
          </div>
          <span className="text-xs text-muted-foreground">{post.likes}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button className="hover:underline">{post.comments} comments</button>
          <button className="hover:underline">{post.shares ?? 0} shares</button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center px-1.5 py-0.5">
        <ActionButton
          icon={Heart}
          label="Like"
          active={post.isLiked}
          activeColor="text-primary"
          onClick={() => onLike?.(post.id)}
        />
        <ActionButton
          icon={MessageCircle}
          label="Comment"
          onClick={() => onComment?.(post.id)}
        />
        <ActionButton
          icon={Share2}
          label="Share"
          onClick={() => onShare?.(post.id)}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  activeColor,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 flex-1 h-9 rounded-md text-sm font-medium transition-all duration-200",
        active
          ? (activeColor ?? "text-primary hover:bg-primary/5")
          : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground"
      )}
    >
      <Icon
        className={cn("h-5 w-5", active && "fill-current")}
        strokeWidth={active ? 2.5 : 1.8}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
