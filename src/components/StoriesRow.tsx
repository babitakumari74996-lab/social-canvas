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
    <div className="relative mx-1 mt-2 mb-3 md:-mx-6 md:mt-4 md:mb-4 bg-card rounded-3xl border border-border overflow-hidden">
      <div ref={scroller} className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-2">
        {/* Your story */}
        <button
          type="button"
          className="flex flex-col items-center gap-1 w-[100px] shrink-0"
          onClick={() => (hasMyStory ? ui.openStories(me!.username) : ui.openCreate("photo"))}
        >
          <div className="relative">
            <StoryRing viewed={hasMyStory} size={96} className="-translate-x-4">


              <Avatar path={me?.avatar_url} alt="Your story" size={86} />
            </StoryRing>
            {!hasMyStory && (
              <PlusCircle className="absolute -bottom-0.5 -right-0.5 h-6 w-6 text-primary fill-background rounded-full" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate w-full text-center">Your story</span>
        </button>

        {groups.filter((g) => g.user.id !== me?.id).map((g) => (
          <button
            key={g.user.id}
            type="button"
            className="flex flex-col items-center gap-1 w-[100px] shrink-0"
            onClick={() => ui.openStories(g.user.username)}
          >
            <StoryRing viewed={g.allViewed} size={96}>
              <Avatar path={g.user.avatar_url} alt={g.user.username} size={86} />
            </StoryRing>
            <span className="text-xs truncate w-full text-center">{g.user.username}</span>
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
