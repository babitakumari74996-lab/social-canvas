import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { Avatar, StoryRing } from "@/components/Avatar";
import { useMe, useStoryGroups } from "@/lib/data";
import { ui } from "@/lib/demo-store";
import { MoodBox } from "@/components/MoodBox";

export function StoriesRow() {
  const groups = useStoryGroups();
  const me = useMe();
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Desktop: drag the row with the mouse to swipe through stories. A drag never counts as a click.
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !scroller.current) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: scroller.current.scrollLeft };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || !scroller.current) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      d.moved = true;
      scroller.current.setPointerCapture(e.pointerId);
      scroller.current.classList.add("cursor-grabbing");
    }
    scroller.current.scrollLeft = d.startLeft - dx;
  };
  const endDrag = () => {
    drag.current.active = false;
    scroller.current?.classList.remove("cursor-grabbing");
  };
  // Swallow the click that ends a drag, so releasing over a story does not open it.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  const myGroup = groups.find((g) => g.user.id === me?.id);
  const hasMyStory = !!myGroup && myGroup.items.length > 0;

  return (
    <div className="relative mx-1 mt-2 mb-3 md:mx-0 md:mt-4 md:mb-4 bg-card rounded-3xl border border-border overflow-hidden">
      <div
        ref={scroller}
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 md:cursor-grab select-none touch-pan-x"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {/* Your Today */}
        <div
          className="flex flex-col items-center gap-1 w-[100px] shrink-0 -translate-x-2 cursor-pointer"
          onClick={() => (hasMyStory ? ui.openStories(me!.username) : ui.openCreate("photo"))}
        >
          <div className="relative">
            <StoryRing viewed={hasMyStory} size={96}>


              <Avatar path={me?.avatar_url} alt="Your Today" size={86} />
            </StoryRing>
            {!hasMyStory && (
              <PlusCircle className="absolute -bottom-0.5 -right-0.5 h-6 w-6 text-primary fill-background rounded-full" />
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate w-full text-center">Your Today</span>
        </div>

        {groups.filter((g) => g.user.id !== me?.id).map((g) => (
          <div
            key={g.user.id}
            className="flex flex-col items-center gap-1 w-[100px] shrink-0 cursor-pointer"
            onClick={() => ui.openStories(g.user.username)}
          >
            <StoryRing viewed={g.allViewed} size={96}>
              <Avatar path={g.user.avatar_url} alt={g.user.username} size={86} />
            </StoryRing>
            <span className="text-xs truncate w-full text-center">{g.user.username}</span>
          </div>
        ))}
      </div>

      <MoodBox />

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
