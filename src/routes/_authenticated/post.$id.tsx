import { useLayoutEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { usePostState } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/post/$id")({
  component: PostDetail,
});

function PostDetail() {
  const { id } = Route.useParams();
  const { post, loading } = usePostState(id);
  // Start at the top before the first paint: otherwise the page keeps the feed's scroll position for one frame
  // (the post sits off-screen) and then jumps.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div className="max-w-[470px] mx-auto px-0 md:px-4 py-0 md:py-6">
      <Link to="/feed" className="hidden md:inline-flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>
      {post ? (
        <PostCard post={post} withComments />
      ) : loading ? (
        <div className="min-h-[60vh]" aria-hidden />
      ) : (
        <div className="p-10 text-center text-sm text-muted-foreground">Post not found.</div>
      )}
    </div>
  );
}
