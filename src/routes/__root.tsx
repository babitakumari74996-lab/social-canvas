import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Socialverse — Share moments" },
      { name: "author", content: "Socialverse" },
      { name: "description", content: "Socialverse is a minimal social network for photos, stories, reels, and direct messages." },
      { property: "og:title", content: "Socialverse" },
      { property: "og:description", content: "Share photos, stories, reels, and DMs on a clean, minimal social network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Splash shown while the first screen loads. It is part of the server HTML. It fades out once the page
// is hydrated and the first screen's images are done (min 1.2s), with a 2s CSS fallback. It only changes
// an attribute on <html>, so the app is never re-rendered or remounted.
const SPLASH_CSS = `
#sv-splash{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:sv-splash-out .3s ease-in 2s forwards}
html[data-sv-done] #sv-splash{animation:sv-splash-out .3s ease-in 0s forwards}
@keyframes sv-splash-out{to{opacity:0;visibility:hidden}}
html[data-embed] #sv-splash{display:none}
`;

function SplashLogo() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <linearGradient id="sv-logo-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.6" stopColor="#D62976" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="26" fill="url(#sv-logo-grad)" />
      <text x="48" y="68" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="56" fill="#fff">
        S
      </text>
    </svg>
  );
}

function Splash() {
  return (
    <div id="sv-splash" aria-hidden="true">
      <style>{SPLASH_CSS}</style>
      <SplashLogo />
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: "-0.01em",
          background: "linear-gradient(90deg,#D62976,#962FBF,#4F5BD5)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Socialverse
      </div>
    </div>
  );
}

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Splash />
        {/* Embedded pages (the swipe preview) never show the splash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "if(/[?&]embed=/.test(location.search))document.documentElement.setAttribute('data-embed','')",
          }}
        />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // Hydrated (this effect runs only on the client). Wait for the first screen's images, then hide the splash.
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const firstScreen = [...document.images].filter((im) => {
        const r = im.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      });
      const imagesDone = firstScreen.every((im) => im.complete);
      if (imagesDone && performance.now() >= 1200) {
        document.documentElement.setAttribute("data-sv-done", "");
        return;
      }
      setTimeout(check, 50);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
