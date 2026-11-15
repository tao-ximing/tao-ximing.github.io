import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.jsx";
import { loadRoute, pathToSlug } from "./routes.js";

const base = import.meta.env.BASE_URL;

// Legacy hash URLs (#/projects/x) shared before the history-routing
// migration redirect to their path equivalents.
let redirected = false;
if (window.location.hash.startsWith("#/")) {
  const slug = window.location.hash.slice(2).replace(/^\/+/, "");
  window.history.replaceState(null, "", base + slug);
  redirected = true;
}

async function mount() {
  const slug = pathToSlug(window.location.pathname);
  // Resolved before hydrating so the first client render matches the
  // prerendered markup synchronously.
  const page = await loadRoute(slug);
  const app = <App initialSlug={slug} initialPage={page} />;

  const container = document.getElementById("root");
  if (!redirected && container.firstElementChild) {
    hydrateRoot(container, app);
  } else {
    container.innerHTML = "";
    createRoot(container).render(app);
  }
}

mount().catch((error) => {
  console.error("Failed to start the app.", error);
});
