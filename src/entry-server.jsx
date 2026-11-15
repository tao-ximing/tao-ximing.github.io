import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App.jsx";
import { loadRoute, pageModuleFor, pathToSlug } from "./routes.js";

/**
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function render(path) {
  const slug = pathToSlug(path);
  const Page = await loadRoute(slug);
  return renderToString(<App initialSlug={slug} initialPage={Page} />);
}

/**
 * Build-manifest key of the page module that renders `path`.
 * @param {string} path
 * @returns {string}
 */
export function pageFileFor(path) {
  return pageModuleFor(pathToSlug(path)).file;
}
