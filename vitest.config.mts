import path from "node:path";
import { defineConfig } from "vitest/config";

/** Pruebas unitarias: lógica pura (precios, formato), sin base de datos. */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"),
    },
  },
});
