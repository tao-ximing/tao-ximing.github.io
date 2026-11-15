import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  base: "/",
  build: {
    // scripts/prerender.mjs reads the client manifest to emit per-route
    // modulepreload hints.
    manifest: !isSsrBuild,
  },
  ssr: {
    noExternal: ["framer-motion", "lucide-react"],
  },
}));
