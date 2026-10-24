import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { applyDemoSnapshot, hydrateDemo } from "@/lib/demo-store";
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
      // App-like launch: white background and the Socialverse icon, same as the splash.
      { name: "theme-color", content: "#ffffff" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Socialverse" },
    ],
    links: [
      // Splash logo is preloaded so it paints with the first frame.
      { rel: "preload", href: "/splash-logo.png", as: "image", type: "image/png" },
      // Not render-blocking: a print-media stylesheet does not hold back the first paint.
      // The body script switches it to "all" as soon as it has loaded.
      {
        rel: "stylesheet",
        href: appCss,
        media: "print",
        id: "sv-app-css",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Splash shown while the first screen loads. It is part of the server HTML. It fades out once the page
// is hydrated and the first screen's images are done (min 1.2s), with a CSS fallback that hides it by 2s. It only changes
// an attribute on <html>, so the app is never re-rendered or remounted.
const SPLASH_CSS = `
#sv-splash{position:fixed;inset:0;z-index:2147483000;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;animation:sv-splash-out .2s ease-in 1.8s forwards}
html[data-sv-done] #sv-splash{animation:sv-splash-out .2s ease-in 0s forwards}
@keyframes sv-splash-out{to{opacity:0;visibility:hidden}}
html[data-embed] #sv-splash{display:none}
`;

function Splash() {
  return (
    <div id="sv-splash" aria-hidden="true">
      <style>{SPLASH_CSS}</style>
      <img src="/splash-logo.png" width={312} height={222} alt="" fetchPriority="high" style={{ width: 312, maxWidth: "80vw", height: "auto" }} />
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
        {import.meta.env.PROD && (
          <script
            dangerouslySetInnerHTML={{
              __html: "if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}",
            }}
          />
        )}
        {/* Embedded pages (the swipe preview) never show the splash. Hard stop: splash is gone by 2s after navigation start (fade starts at 1.8s). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){var l=document.getElementById('sv-app-css');if(!l)return;function on(){l.media='all'}if(l.sheet)on();else l.addEventListener('load',on)})();if(/[?&]embed=/.test(location.search))document.documentElement.setAttribute('data-embed','');var done=function(){document.documentElement.setAttribute('data-sv-done','')};var css=document.getElementById('sv-app-css');var wait=function(){if(css&&css.media!=='all'){css.addEventListener('load',done)}else done()};setTimeout(wait,Math.max(0,1800-performance.now()))",
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
    // Swipe preview pages (embed mode) take the opening page's state, so the preview shows the same
    // content as the page that opens. The parent sends it when this page says it is ready and on each swipe.
    if (!document.documentElement.hasAttribute("data-embed")) return;
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      if (e.data?.type === "sv-embed-refresh") {
        if (e.data.demo) applyDemoSnapshot(e.data.demo);
        void queryClient.invalidateQueries();
      }
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "sv-embed-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, [queryClient]);

  useEffect(() => {
    // Hydrated: apply the saved demo changes (swipe previews get the opening page's state instead).
    if (!document.documentElement.hasAttribute("data-embed")) hydrateDemo();
  }, []);

  useEffect(() => {
    // Hydrated (this effect runs only on the client). Wait for the first screen's images, then hide the splash.
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const firstScreen = [...document.images].filter((im) => {
        const r = im.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      });
      const cssReady = (document.getElementById("sv-app-css") as HTMLLinkElement | null)?.media === "all";
      // Wait for the first screen's photos to really load (not just "complete", which is also true on error), but never past 1.8s.
      const imagesDone = cssReady && firstScreen.every((im) => im.complete && im.naturalWidth > 0);
      const capped = performance.now() >= 1800;
      if ((imagesDone || capped) && performance.now() >= 1200) {
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
