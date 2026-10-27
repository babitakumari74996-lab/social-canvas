import { useEffect, useLayoutEffect, useRef, useState } from "react";

// A short note shown above a post on Home. It shows 2 lines. When the text is longer, the text is cut where it
// fits and "… more" follows inline at the end of the 2nd line; "more" reveals the full note.
export function PostNote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  // Characters shown before "… more". null = the whole note fits in 2 lines (no "more").
  const [cut, setCut] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Measure with a hidden copy of the text at the same width: find the longest cut that fits in 2 lines with "… more".
  useLayoutEffect(() => {
    const p = ref.current;
    const m = measureRef.current;
    if (!p || !m || open) return;
    const lh = parseFloat(getComputedStyle(p).lineHeight) || 20;
    const maxH = lh * 2 + 1;
    m.style.width = `${p.clientWidth}px`;
    m.textContent = text;
    if (m.offsetHeight <= maxH) {
      setCut(null);
      return;
    }
    // Same markup as the real line: the "more" is bold, so it must be measured bold too.
    const measureCut = (n: number) => {
      m.textContent = "";
      m.append(document.createTextNode(text.slice(0, n).trimEnd() + "… "));
      const more = document.createElement("span");
      more.style.fontWeight = "600";
      more.textContent = "more";
      m.append(more);
    };
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      measureCut(mid);
      if (m.offsetHeight <= maxH) lo = mid;
      else hi = mid - 1;
    }
    setCut(lo);
  }, [text, open, tick]);

  // Re-measure when the window width changes (the text wraps differently).
  useEffect(() => {
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const truncated = !open && cut !== null;

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <p ref={ref} className="text-sm leading-5 whitespace-pre-wrap break-words">
          {truncated ? (
            <>
              {text.slice(0, cut).trimEnd()}… <button
                type="button"
                onClick={() => setOpen(true)}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                more
              </button>
            </>
          ) : (
            text
          )}
        </p>
        {/* Hidden copy used only for measuring the cut. */}
        <div
          ref={measureRef}
          aria-hidden
          className="invisible pointer-events-none absolute left-0 top-0 text-sm leading-5 whitespace-pre-wrap break-words"
        />
      </div>
      {open && cut !== null && (
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
