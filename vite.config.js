import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
   base: process.env.VITE_BASE_PATH || "/",
   plugins: [react(), tailwindcss()],
   resolve: {
      alias: {
         "@": fileURLToPath(new URL("./src", import.meta.url))
      }
   },
   server: {
      host: "127.0.0.1",
      fs: {
         strict: true,
         allow: [fileURLToPath(new URL(".", import.meta.url))],
         deny: ["quelldaten*.geojson", "**/quelldaten*.geojson"]
      }
   }
});
