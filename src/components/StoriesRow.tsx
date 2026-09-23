import { useRef } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { Avatar, StoryRing } from "@/components/Avatar";
import { useMe, useStoryGroups } from "@/lib/data";
import { ui } from "@/lib/demo-store";

export function StoriesRow() {
  const groups = useStoryGroups();
  const me = useMe();
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  const myGroup = groups.find((g) => g.user.id === me?.id);
  const hasMyStory = !!myGroup && myGroup.items.length > 0;

  return (
    <div className="relative border-b border-border md:mb-4 bg-card md:rounded-xl md:mt-4">
      <div ref={scroller} className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-3">
        {/* Your story */}
        <button
          type="button"
          className="flex flex-col items-center gap-1 w-[66px] shrink-0"
          onClick={() => (hasMyStory ? ui.openStories(me!.username) : ui.openCreate("photo"))}
        >
          <div className="relative">
            <StoryRing viewed={hasMyStory} size={62}>
              <Avatar path={me?.avatar_url} alt="Your story" size={52} />
            </StoryRing>
            {!hasMyStory && (
              <PlusCircle className="absolute -bottom-0.5 -right-0.5 h-5 w-5 text-primary fill-background rounded-full" />
            )}
          </div>
          <span className="text-[11px] text-muted-foreground truncate w-full text-center">Your story</span>
        </button>

        {groups.filter((g) => g.user.id !== me?.id).map((g) => (
          <button
            key={g.user.id}
            type="button"
            className="flex flex-col items-center gap-1 w-[66px] shrink-0"
            onClick={() => ui.openStories(g.user.username)}
          >
            <StoryRing viewed={g.allViewed} size={62}>
              <Avatar path={g.user.avatar_url} alt={g.user.username} size={52} />
            </StoryRing>
            <span className="text-[11px] truncate w-full text-center">{g.user.username}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-300)}
        className="hidden md:grid absolute left-1 top-1/2 -translate-y-1/2 place-items-center h-7 w-7 rounded-full bg-card shadow-md border border-border hover:scale-105 transition-transform"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(300)}
        className="hidden md:grid absolute right-1 top-1/2 -translate-y-1/2 place-items-center h-7 w-7 rounded-full bg-card shadow-md border border-border hover:scale-105 transition-transform"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
