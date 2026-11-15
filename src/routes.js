import { assetBase } from "./shared/site.js";

/**
 * @typedef {import("react").ComponentType} PageComponent
 * @typedef {{ file: string, load: () => Promise<{ default: PageComponent }> }} PageModule
 */

// `file` is the module's key in the Vite build manifest (path from the
// project root); scripts/prerender.mjs uses it to emit modulepreload hints.
const HOME = { file: "src/pages/Home.jsx", load: () => import("./pages/Home.jsx") };
const PLACEHOLDER = { file: "src/pages/Placeholder.jsx", load: () => import("./pages/Placeholder.jsx") };

/** @type {Record<string, PageModule>} */
const PAGES = {
  "": HOME,
  resume: { file: "src/pages/Resume.jsx", load: () => import("./pages/Resume.jsx") },
  "projects/orderops": { file: "src/pages/OrderOps.jsx", load: () => import("./pages/OrderOps.jsx") },
  "projects/knowledgeguard": {
    file: "src/pages/LegalPipeline.jsx",
    load: () => import("./pages/LegalPipeline.jsx"),
  },
  "projects/docparse": { file: "src/pages/DocParse.jsx", load: () => import("./pages/DocParse.jsx") },
  "projects/clinicflow": { file: "src/pages/ClinicFlow.jsx", load: () => import("./pages/ClinicFlow.jsx") },
};

export const ROUTE_TITLES = {
  "": "Ximing Tao | AI Workflow Systems",
  resume: "Resume | Ximing Tao",
  "projects/orderops": "Sales Order Automation | Ximing Tao",
  "projects/knowledgeguard": "Legal QA Pipeline | Ximing Tao",
  "projects/docparse": "Document Intelligence Platform | Ximing Tao",
  "projects/clinicflow": "Clinical Workflow App | Ximing Tao",
};

/**
 * @param {string} pathname
 * @returns {string} route slug without leading/trailing slashes ("" is home)
 */
export function pathToSlug(pathname) {
  let path = pathname;
  if (path.startsWith(assetBase)) path = path.slice(assetBase.length);
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Unknown `projects/*` slugs get the placeholder; any other unknown slug
 * renders the home page.
 * @param {string} slug
 * @returns {PageModule}
 */
export function pageModuleFor(slug) {
  if (Object.hasOwn(PAGES, slug)) return PAGES[slug];
  return slug.startsWith("projects/") ? PLACEHOLDER : HOME;
}

/**
 * Resolves the page component for a slug. Repeat calls reuse the module
 * system's cache, so this doubles as a prefetch.
 * @param {string} slug
 * @returns {Promise<PageComponent>}
 */
export async function loadRoute(slug) {
  const module = await pageModuleFor(slug).load();
  return module.default;
}
