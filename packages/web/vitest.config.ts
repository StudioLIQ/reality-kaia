import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/__tests__/**/*.(test|spec).{ts,tsx}"],
    css: false
  },
  esbuild: {
    jsx: "automatic",
    jsxDev: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@/app": path.resolve(__dirname, "app"),
      "@/components": path.resolve(__dirname, "components"),
      "@/lib": path.resolve(__dirname, "lib")
    }
  }
});