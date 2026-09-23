import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Search as SearchIcon, BadgeCheck } from "lucide-react";
import { MediaImg } from "@/components/PostCard";
import { ui } from "@/lib/demo-store";
import { useExplorePosts } from "@/lib/data";
import { formatCount } from "@/lib/time";
import type { UPost } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const posts = useExplorePosts();

  return (
    <div className="max-w-[975px] mx-auto pb-10">
      {/* mobile search bar */}
      <button
        type="button"
        onClick={ui.openSearch}
        className="md:hidden flex w-full items-center gap-2 mx-0 bg-muted rounded-lg mx-4 mt-3 px-3 py-2.5 text-sm text-muted-foreground"
        style={{ width: "calc(100% - 1.5rem)", margin: "0.75rem auto 0" }}
      >
        <SearchIcon className="h-4 w-4" /> Search
      </button>

      <div className="grid grid-cols-3 gap-1 mt-1 md:mt-3 px-0.5">
        {posts.map((p, i) => (
          <GridItem key={p.id} post={p} tall={i % 10 === 0 && posts.length > 6} />
        ))}
      </div>
      {posts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-16">Nothing to explore yet.</p>
      )}
    </div>
  );
}

function GridItem({ post, tall }: { post: UPost; tall: boolean }) {
  const isText = post.media_urls.length === 0;
  return (
    <Link
      to="/post/$id"
      params={{ id: post.id }}
      className={`relative group overflow-hidden bg-muted ${tall ? "row-span-2 aspect-[1/2.04]" : "aspect-square"}`}
    >
      {isText ? (
        <span
          className="absolute inset-0 p-3 flex items-center justify-center text-center text-white text-xs font-semibold line-clamp-6"
          style={{ background: "linear-gradient(135deg,#4F5BD5,#962FBF,#D62976)" }}
        >
          {post.caption}
        </span>
      ) : (
        <MediaImg src={post.media_urls[0]} alt={post.caption ?? ""} className="absolute inset-0 w-full h-full object-cover" />
      )}
      {post.media_urls.length > 1 && (
        <span className="absolute top-2 right-2 h-4 w-4 rounded-sm border-2 border-white bg-white/20" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,.3)" }} />
      )}
      <span className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-5 bg-black/40 text-white text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          <Heart className="h-5 w-5 fill-white" /> {formatCount(post.likes)}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-5 w-5 fill-white -scale-x-100" /> {formatCount(post.commentsCount)}
        </span>
      </span>
      {post.profiles.is_verified && <BadgeCheck className="absolute bottom-2 right-2 h-4 w-4 text-white fill-black/50" />}
    </Link>
  );
}
