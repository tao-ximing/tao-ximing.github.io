import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./a11y.js";
import { ROUTE_TITLES, loadRoute, pathToSlug } from "./routes.js";
import { assetBase, email, githubUrl, to } from "./shared/site.js";
import "./styles.css";

function runViewTransition(update) {
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    update();
    return;
  }
  document.startViewTransition(update);
}

/**
 * The internal-route anchor an event came from, or null for external links,
 * new-tab targets and downloads.
 * @param {EventTarget | null} target
 * @returns {HTMLAnchorElement | null}
 */
function internalAnchor(target) {
  const anchor = target instanceof Element ? target.closest("a") : null;
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return null;
  const href = anchor.getAttribute("href") || "";
  return href.startsWith(assetBase) ? anchor : null;
}

function useRoute(initialSlug, initialPage) {
  const [route, setRoute] = useState({ slug: initialSlug, Page: initialPage });
  const navigatedRef = useRef(false);
  const latestNavigation = useRef(0);

  useEffect(() => {
    const onNavigate = async () => {
      const navigation = ++latestNavigation.current;
      const next = pathToSlug(window.location.pathname);
      let Page;
      try {
        Page = await loadRoute(next);
      } catch (error) {
        if (navigation !== latestNavigation.current) return;
        console.error(`Failed to load the page for /${next}; reloading.`, error);
        window.location.assign(window.location.href);
        return;
      }
      if (navigation !== latestNavigation.current) return;
      navigatedRef.current = true;
      // The view transition snapshots the new state when the callback returns,
      // so the route must be committed synchronously inside it.
      runViewTransition(() => flushSync(() => setRoute({ slug: next, Page })));
    };
    window.addEventListener("popstate", onNavigate);
    return () => window.removeEventListener("popstate", onNavigate);
  }, []);

  return { ...route, navigatedRef };
}

/**
 * @param {{ initialSlug: string, initialPage: import("react").ComponentType }} props
 *   `initialPage` must already be resolved (via loadRoute) for `initialSlug`,
 *   so the first render is synchronous on both server and client.
 */
export default function App({ initialSlug, initialPage }) {
  const { slug, Page, navigatedRef } = useRoute(initialSlug, initialPage);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = ROUTE_TITLES[slug] || ROUTE_TITLES[""];
    if (navigatedRef.current) {
      document.querySelector("main h1")?.focus({ preventScroll: true });
    }
  }, [slug, navigatedRef]);

  useEffect(() => {
    function onClick(event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = internalAnchor(event.target);
      if (!anchor) return;
      event.preventDefault();
      window.history.pushState(null, "", anchor.getAttribute("href"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    // Warms the route chunk on hover/focus; pointerenter does not bubble,
    // so it is caught in the capture phase.
    function onIntent(event) {
      const anchor = internalAnchor(event.target);
      if (!anchor) return;
      const { pathname } = new URL(anchor.getAttribute("href"), window.location.href);
      loadRoute(pathToSlug(pathname)).catch(() => {});
    }

    document.addEventListener("click", onClick);
    document.addEventListener("pointerenter", onIntent, true);
    document.addEventListener("focusin", onIntent);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerenter", onIntent, true);
      document.removeEventListener("focusin", onIntent);
    };
  }, []);

  return (
    <div>
      <SiteHeader slug={slug} />
      <main>
        {/* Keyed so a new route always remounts, even when two slugs share a page. */}
        <Page key={slug} />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-identity">
        <strong>Ximing Tao</strong>
        <span>AI Engineer / Melbourne, Australia</span>
      </div>
      <nav className="footer-links" aria-label="Contact links">
        <a href={`mailto:${email}`}>{email}</a>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={to("resume")}>Resume</a>
      </nav>
    </footer>
  );
}

function SiteHeader({ slug }) {
  const currentFor = (target) => (slug === target ? "page" : undefined);

  return (
    <header className="site-header">
      <a href={to("")} className="brand" aria-label="Ximing Tao home">
        <span>XT</span>
        Ximing Tao
      </a>
      <nav aria-label="Main">
        <a href={to("")} aria-current={currentFor("")}>Home</a>
        <a href={to("resume")} aria-current={currentFor("resume")}>Resume</a>
      </nav>
    </header>
  );
}
