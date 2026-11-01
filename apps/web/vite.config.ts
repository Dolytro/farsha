import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The editor is served under /app; the Next.js site (apps/site) owns /.
export default defineConfig({ base: "/app/", plugins: [react()], server: { port: 5173 } });
