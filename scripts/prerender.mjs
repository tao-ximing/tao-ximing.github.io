// Build-time prerender: renders each route to static HTML with
// per-route title/description/OG tags, so crawlers that never
// execute JS still see the full content.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { render } = await import(pathToFileURL(path.join(root, "dist-ssr", "entry-server.js")).href);

const BASE = "/";
const SITE = "https://tao-ximing.github.io/";

const ROUTES = [
  {
    slug: "",
    title: "Ximing Tao | AI Workflow Systems",
    description:
      "Reliable AI systems for real-world business workflows: document intelligence, RAG, workflow automation, and human-in-the-loop review.",
  },
  {
    slug: "resume",
    title: "Resume | Ximing Tao",
    description:
      "Production-focused AI Engineer with 5 years of experience across agentic workflow automation, retrieval, document intelligence, structured extraction, and LLM evaluation.",
  },
  {
    slug: "projects/orderops",
    title: "Sales Order Automation | Ximing Tao",
    description:
      "Interactive case study: a hybrid AI-deterministic sales order automation platform. 95% extraction accuracy, 70% of eligible orders fully automated, every AI step wrapped in deterministic validation.",
  },
  {
    slug: "projects/knowledgeguard",
    title: "Legal QA Pipeline | Ximing Tao",
    description:
      "Grounded legal Q&A that routes enquiries to verified, versioned answer records with multi-LLM routing, confidence gates, and human fallback.",
  },
  {
    slug: "projects/docparse",
    title: "Document Intelligence Platform | Ximing Tao",
    description:
      "PaddleOCR-based layout analysis for complex business documents: 65% baseline to 92% post-processed accuracy, cutting cloud API reliance by 60%.",
  },
  {
    slug: "projects/clinicflow",
    title: "Clinical Workflow App | Ximing Tao",
    description:
      "A clinician-in-the-loop application for patient management, movement assessments, and approval-controlled patient reports.",
  },
];

const template = readFileSync(path.join(root, "dist", "index.html"), "utf8");

const escapeAttr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const replaceMeta = (html, marker, value) =>
  html.replace(new RegExp(`(${marker}[\\s\\S]{0,30}?content=")[^"]*`), `$1${value}`);

for (const route of ROUTES) {
  const appHtml = render(BASE + route.slug);
  const canonical = SITE + (route.slug ? `${route.slug}/` : "");

  let html = template.replace("<!--app-html-->", appHtml);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`);
  html = replaceMeta(html, 'name="description"', escapeAttr(route.description));
  html = replaceMeta(html, 'property="og:title"', escapeAttr(route.title));
  html = replaceMeta(html, 'property="og:description"', escapeAttr(route.description));
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'name="twitter:title"', escapeAttr(route.title));
  html = replaceMeta(html, 'name="twitter:description"', escapeAttr(route.description));

  const dir = path.join(root, "dist", route.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), html);
  console.log(`prerendered /${route.slug}`);
}

// SPA fallback for unknown paths on GitHub Pages.
writeFileSync(path.join(root, "dist", "404.html"), readFileSync(path.join(root, "dist", "index.html")));
console.log("wrote 404.html");
