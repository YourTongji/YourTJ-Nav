import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/*
  `VITE_BASE` lets the same build serve from a domain root (`/`) or from a
  GitHub Pages project path (`/tj-nav/`). The deploy workflow fills it in from
  actions/configure-pages, so a project page and a custom domain both work
  without touching this file.
*/
const base = process.env.VITE_BASE || "/"

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
})
