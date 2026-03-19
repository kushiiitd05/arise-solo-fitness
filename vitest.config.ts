import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    environmentMatchGlobs: [
      // Any test file inside components/ gets jsdom environment for React Testing Library
      ["src/components/**/*.test.{ts,tsx}", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
