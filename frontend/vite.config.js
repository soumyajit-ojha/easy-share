import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// new line
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
