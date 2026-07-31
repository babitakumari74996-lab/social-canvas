import { useState } from "react";
import { Image, Video, SmilePlus } from "lucide-react";
import { useMyProfile } from "@/lib/auth";
import { TodayModal } from "./TodayModal";
import { Avatar } from "./PostCard";

export function PostComposer() {
  const { data: me } = useMyProfile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="card-social p-4 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-300"
        onClick={() => setOpen(true)}
      >
        <Avatar path={me?.avatar_url} alt={me?.username ?? "You"} size={40} />
        <div className="flex-1 bg-muted/40 dark:bg-muted/20 rounded-full px-4 py-2.5 text-sm text-muted-foreground/70 hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors">
          What's on your mind?
        </div>
        <div className="flex items-center gap-1">
          <div className="h-9 w-9 rounded-full hover:bg-muted/60 dark:hover:bg-muted/30 flex items-center justify-center text-emerald-500 transition-colors">
            <Image className="h-5 w-5" />
          </div>
          <div className="h-9 w-9 rounded-full hover:bg-muted/60 dark:hover:bg-muted/30 flex items-center justify-center text-blue-500 transition-colors">
            <Video className="h-5 w-5" />
          </div>
          <div className="h-9 w-9 rounded-full hover:bg-muted/60 dark:hover:bg-muted/30 flex items-center justify-center text-amber-500 transition-colors">
            <SmilePlus className="h-5 w-5" />
          </div>
        </div>
      </div>

      <TodayModal open={open} onOpenChange={setOpen} />
    </>
  );
}
