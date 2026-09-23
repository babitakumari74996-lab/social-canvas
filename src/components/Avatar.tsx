import { useSignedUrl } from "@/lib/media";

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
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
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
        background: viewed ? "var(--color-border)" : "linear-gradient(45deg, #FEDA75, #FA7E1E, #D62976, #962FBF, #4F5BD5)",
      }}
    >
      <span className="block rounded-full bg-background p-[2px] w-full h-full">{children}</span>
    </button>
  );
}
