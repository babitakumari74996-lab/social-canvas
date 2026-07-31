import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count?: number;
  dot?: boolean;
  priority?: "high" | "medium" | "low";
  className?: string;
}

const variants = {
  high: "bg-primary/10 text-primary ring-1 ring-primary/20",
  medium: "bg-primary/10 text-primary ring-1 ring-primary/20",
  low: "bg-muted-foreground/10 text-muted-foreground",
};

export function NotificationBadge({
  count,
  dot,
  priority = "medium",
  className,
}: NotificationBadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(
          "absolute top-0.5 right-0.5 h-[7px] w-[7px] rounded-full",
          "ring-1.5 ring-background",
          priority === "high" && "bg-primary",
          priority === "medium" && "bg-primary/50",
          priority === "low" && "bg-muted-foreground/30",
          className,
        )}
      />
    );
  }

  if (!count || count <= 0) return null;

  const display = count > 9 ? "9+" : String(count);

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1",
        "flex items-center justify-center",
        "text-[10px] font-semibold leading-none",
        "rounded-full min-w-[18px] h-[18px] px-1",
        variants[priority],
        className,
      )}
      aria-label={`${count} notifications`}
    >
      {display}
    </span>
  );
}
