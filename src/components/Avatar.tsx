import { useEffect, useRef, useState } from "react";
import { useSignedUrl } from "@/lib/media";

/**
 * Fades an <img> in once it has loaded, instead of popping it in from a blank placeholder.
 * Handles images that finished loading before hydration (no onLoad event then).
 */
export function useImageFade() {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);
  return {
    ref,
    onLoad: () => setLoaded(true),
    className: `transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`,
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
        className={`rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] flex items-center justify-center text-white font-semibold select-none ${className}`}
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
  const fade = useImageFade();
  return (
    <img
      ref={fade.ref}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onLoad={fade.onLoad}
      className={`rounded-full object-cover bg-muted select-none ${fade.className} ${className}`}
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
        background: viewed ? "var(--color-border)" : "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)",
      }}
    >
      <span className="block rounded-full bg-background p-[2px] w-full h-full">{children}</span>
    </button>
  );
}
