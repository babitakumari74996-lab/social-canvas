import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, Flag, Link, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface PostActionMenuProps {
  postId: string;
  isOwnPost: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PostActionMenu({ postId, isOwnPost, onEdit, onDelete }: PostActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const actions: {
    label: string;
    icon: React.ReactNode;
    action: () => void;
    destructive?: boolean;
  }[] = [];

  if (isOwnPost) {
    if (onEdit) {
      actions.push({
        label: "Edit post",
        icon: <Pencil className="h-4 w-4" />,
        action: () => {
          setOpen(false);
          onEdit();
        },
      });
    }
    if (onDelete) {
      actions.push({
        label: "Delete post",
        icon: <Trash2 className="h-4 w-4" />,
        action: () => {
          setOpen(false);
          onDelete();
        },
        destructive: true,
      });
    }
  }

  actions.push(
    {
      label: "Copy link",
      icon: <Link className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard?.writeText(url);
        toast.success("Link copied to clipboard");
      },
    },
    {
      label: "Hide post",
      icon: <EyeOff className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        toast.success("Post hidden from feed");
      },
    },
    {
      label: "Report post",
      icon: <Flag className="h-4 w-4" />,
      action: () => {
        setOpen(false);
        toast.success("Report submitted");
      },
    },
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted/50 dark:hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all duration-200"
        aria-label="Post options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border/40 dark:border-border/20 rounded-xl shadow-lg z-50 py-1.5 animate-in-fade dark:dark-card-glow">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.action}
              className={`w-full flex items-center gap-3 px-3.5 py-2 text-sm transition-colors ${
                a.destructive
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-foreground hover:bg-muted/50 dark:hover:bg-muted/30"
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
