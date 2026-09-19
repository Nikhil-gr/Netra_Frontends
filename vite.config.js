import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  envPrefix: ["VITE_", "NETRA_"],

  plugins: [react(), tailwindcss()],

  server: {
    host: "0.0.0.0",

    allowedHosts: [".ngrok-free.dev"],

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
