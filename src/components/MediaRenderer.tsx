import { useState } from "react";
import { useSignedUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Play, ExternalLink, ImageOff } from "lucide-react";

function SingleImage({ path }: { path: string }) {
  const { data, isLoading } = useSignedUrl(path);
  const [error, setError] = useState(false);

  if (isLoading) {
    return <div className="w-full aspect-video bg-muted animate-pulse rounded-none" />;
  }

  if (error || !data) {
    return (
      <div className="w-full aspect-video bg-muted/50 flex items-center justify-center text-muted-foreground rounded-none">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="w-full bg-muted/20 overflow-hidden rounded-none">
      <img
        src={data}
        alt=""
        className="w-full h-auto max-h-[600px] object-contain mx-auto"
        loading="lazy"
        onError={() => setError(true)}
      />
    </div>
  );
}

function MultiImageGrid({ paths }: { paths: string[] }) {
  const count = Math.min(paths.length, 4);

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden">
        {paths.slice(0, 2).map((p, i) => (
          <GridImage key={i} path={p} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden">
        <GridImage path={paths[0]} className="row-span-2 aspect-square" />
        <GridImage path={paths[1]} className="aspect-square" />
        <GridImage path={paths[2]} className="aspect-square" />
      </div>
    );
  }

  if (count >= 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5 overflow-hidden">
        {paths.slice(0, 4).map((p, i) => (
          <GridImage key={i} path={p} className="aspect-square" />
        ))}
      </div>
    );
  }

  return <SingleImage path={paths[0]} />;
}

function GridImage({ path, className }: { path: string; className?: string }) {
  const { data } = useSignedUrl(path);
  const [error, setError] = useState(false);

  return (
    <div className={cn("bg-muted/20 overflow-hidden", className)}>
      {data && !error ? (
        <img
          src={data}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function VideoPlayer({ path }: { path: string }) {
  const { data } = useSignedUrl(path);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="w-full bg-black/5 relative group">
      {playing && data ? (
        <video
          src={data}
          controls
          autoPlay
          className="w-full max-h-[600px] mx-auto"
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div
          className="aspect-video bg-muted/30 flex items-center justify-center cursor-pointer"
          onClick={() => setPlaying(true)}
        >
          {data ? (
            <img src={data} alt="" className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="w-full h-full bg-muted animate-pulse" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play className="h-6 w-6 text-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkPreview({ url }: { url: string }) {
  let displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (displayUrl.length > 40) displayUrl = displayUrl.slice(0, 40) + "…";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mx-4 my-2 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <ExternalLink className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground truncate">{displayUrl}</div>
          <div className="text-xs text-muted-foreground truncate">{url}</div>
        </div>
      </div>
    </a>
  );
}

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

interface MediaRendererProps {
  mediaUrls: string[];
  caption?: string | null;
}

export function MediaRenderer({ mediaUrls, caption }: MediaRendererProps) {
  const images: string[] = [];
  const videos: string[] = [];

  for (const url of mediaUrls) {
    const ext = url.split(".").pop()?.toLowerCase();
    if (ext && ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
      videos.push(url);
    } else {
      images.push(url);
    }
  }

  const hasLinkPreview = caption && extractUrls(caption).length > 0;
  const firstUrl = hasLinkPreview ? extractUrls(caption!)[0] : null;

  return (
    <div className="space-y-0.5">
      {images.length === 1 && <SingleImage path={images[0]} />}
      {images.length > 1 && <MultiImageGrid paths={images} />}
      {videos.length > 0 && <VideoPlayer path={videos[0]} />}
      {images.length === 0 && videos.length === 0 && firstUrl && (
        <LinkPreview url={firstUrl} />
      )}
    </div>
  );
}
