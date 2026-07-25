import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./main.jsx";

const base = import.meta.env.BASE_URL;

// Legacy hash URLs (#/projects/x) shared before the history-routing
// migration redirect to their path equivalents.
let redirected = false;
if (window.location.hash.startsWith("#/")) {
  const slug = window.location.hash.slice(2).replace(/^\/+/, "");
  window.history.replaceState(null, "", base + slug);
  redirected = true;
}

const container = document.getElementById("root");
if (!redirected && container.firstElementChild) {
  hydrateRoot(container, <App />);
} else {
  container.innerHTML = "";
  createRoot(container).render(<App />);
}
