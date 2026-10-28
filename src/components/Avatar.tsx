import { useEffect, useRef, useState } from "react";
import { useSignedUrl } from "@/lib/media";

/**
 * Fade-in for a photo. The photo starts transparent and eases to full opacity once loaded. The
 * shimmer is drawn on the photo's parent (see `img[data-fade]` rules in styles.css), so it stays
 * visible while the photo is still transparent. Callers that set their own opacity (e.g. a dimmed
 * poster) keep it and get no fade. Handles photos that finished loading before hydration.
 */
// Image URLs that have already loaded in this session. When a page remounts (tab switch), its images
// are shown at once instead of fading in again, so the page does not look like it reloaded.
const loadedSrcs = new Set<string>();

export function useImageFade(callerClassName = "", src?: string | null) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(() => !!src && loadedSrcs.has(src));
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) {
      if (src) loadedSrcs.add(src);
      setLoaded(true);
    }
  }, [src]);
  const ownOpacity = /(^|\s)opacity-/.test(callerClassName);
  const props = ownOpacity
    ? {}
    : { "data-fade": "", "data-loaded": loaded ? "" : undefined };
  return {
    ref,
    onLoad: () => {
      if (src) loadedSrcs.add(src);
      setLoaded(true);
    },
    props,
  };
}

function isDirectSrc(path?: string | null) {
  return !!path && (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:") || path.startsWith("/"));
}

export function Avatar({
  path,
  alt = "",
  size = 32,
  className = "",
}: {
  path?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const direct = isDirectSrc(path);
  const { data: signed } = useSignedUrl(direct ? null : path);
  const src = direct ? path! : signed ?? null;

  if (!src) {
    return (
      <div
        className={`rounded-full bg-gradient-to-tr from-[#5EEAD4] via-[#6366F1] to-[#4338CA] flex items-center justify-center text-white font-semibold select-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-label={alt}
      >
        {(alt || "?").trim().charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <AvatarImg src={src} alt={alt} size={size} className={className} />
  );
}

function AvatarImg({ src, alt, size, className }: { src: string; alt: string; size: number; className: string }) {
  const fade = useImageFade(className, src);
  return (
    <img
      ref={fade.ref}
      {...fade.props}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onLoad={fade.onLoad}
      className={`rounded-full object-cover bg-muted select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Instagram-style gradient story ring wrapper. */
export function StoryRing({
  viewed = false,
  size = 56,
  onClick,
  children,
  className = "",
}: {
  viewed?: boolean;
  size?: number;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full p-[2.5px] transition-transform active:scale-95 ${className}`}
      style={{
        width: size,
        height: size,
        background: viewed ? "var(--color-border)" : "linear-gradient(45deg, #5EEAD4, #2DD4BF, #6366F1, #7C3AED, #4338CA)",
      }}
    >
      <span className="block rounded-full bg-background p-[2px] w-full h-full">{children}</span>
    </button>
  );
}
