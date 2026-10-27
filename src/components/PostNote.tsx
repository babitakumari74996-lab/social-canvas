import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A short note shown above a post on Home. It shows 2 lines; when the text is longer, a "more" button sits at
// the end of the 2nd line and reveals the full note.
export function PostNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Overflow check: the clamped box is shorter than its full text.
  const measure = () => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > el.clientHeight + 1);
  };
  useLayoutEffect(measure, [text, open]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="mx-3 mb-2 rounded-xl border border-border bg-card px-3 py-2 text-sm md:mx-0">
      <div className="relative">
        <p ref={ref} className={`whitespace-pre-wrap break-words ${open ? "" : "line-clamp-2"}`}>
          {text}
        </p>
        {clamped && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute bottom-0 right-0 bg-card pl-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            more
          </button>
        )}
      </div>
      {open && clamped && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          show less
        </button>
      )}
    </div>
  );
}
