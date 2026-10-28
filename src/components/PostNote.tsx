import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Notepad-with-pencil icon, drawn in currentColor so it follows the theme.
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 540 540"
      fill="none"
      stroke="url(#sv-note-grad)"
      strokeWidth={40}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="inline-block h-[1.25em] w-[1.25em] mr-1.5"
      style={{ verticalAlign: "-0.2em" }}
    >
      {/* Socialverse gradient: teal -> indigo -> violet (same as the logo) */}
      <defs>
        <linearGradient id="sv-note-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d="M250 435 H205 C160 435 133 405 133 365 V185 C133 155 155 140 185 140 H330 C360 140 378 160 378 190 V245" />
      <path d="M133 210 H378" />
      <path d="M185 110 V140 M255 110 V140 M325 110 V140" />
      <path d="M185 268 H325 M185 323 H300 M185 379 H255" />
      <path d="M290 428 L282 388 L398 272 Q412 258 426 272 Q440 286 426 300 L314 418 Z" />
      <path d="M375 292 L408 325" />
    </svg>
  );
}

// Same width as the icon, used in the measuring copy so the cut is exact.
function IconSpacer() {
  return <span className="inline-block h-[1.25em] w-[1.25em] mr-1.5" style={{ verticalAlign: "-0.2em", color: "oklch(0.62 0.19 244)" }} />;
}

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

    // Keep the icon spacer (first child); replace everything after it with the given text.
    const setMeasure = (plain: string, withMore: boolean) => {
      while (m.childNodes.length > 1) m.removeChild(m.lastChild!);
      m.append(document.createTextNode(plain));
      if (withMore) {
        // Same markup as the real line: the "more" is bold, so it must be measured bold too.
        const more = document.createElement("span");
        more.style.fontWeight = "600";
        more.textContent = "more";
        m.append(more);
      }
    };

    setMeasure(text, false);
    if (m.offsetHeight <= maxH) {
      setCut(null);
      return;
    }
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      setMeasure(text.slice(0, mid).trimEnd() + "… ", true);
      if (m.offsetHeight <= maxH) lo = mid;
      else hi = mid - 1;
    }
    setCut(lo);
  }, [text, open, tick]);

  // Verify against the real rendered line: if the note is still taller than 2 lines (the measuring copy can differ
  // slightly from the real text, e.g. a font or the button), take a few more characters off until it fits.
  useLayoutEffect(() => {
    const p = ref.current;
    if (!p || open) return;
    const lh = parseFloat(getComputedStyle(p).lineHeight) || 20;
    if (p.scrollHeight > lh * 2 + 1) {
      setCut((c) => (c === null ? text.length - 4 : Math.max(0, c - 4)));
    }
  }, [text, open, cut]);

  // Re-measure when the note's width changes, and once the web font has loaded (a late font swap changes the wrap).
  useEffect(() => {
    const redo = () => setTick((t) => t + 1);
    const el = ref.current;
    const ro = el && typeof ResizeObserver !== "undefined" ? new ResizeObserver(redo) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", redo);
    document.fonts?.ready.then(redo);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", redo);
    };
  }, []);

  const truncated = !open && cut !== null;

  return (
    <div className="mx-3 mt-2 mb-2 rounded-xl border border-border bg-card px-3 py-2 md:mx-0">
      <div className="relative">
        <p ref={ref} className="text-sm leading-5 whitespace-pre-wrap break-words">
          <NoteIcon />
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
        >
          <IconSpacer />
        </div>
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
