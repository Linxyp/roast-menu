import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Pruebas de integración: los servicios reales contra la base aislada roast_test
 * (DATABASE_URL_TEST). preparar.ts aplica las migraciones antes de empezar y cada
 * archivo deja las tablas limpias al iniciar.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integracion/**/*.test.ts"],
    globalSetup: ["tests/integracion/preparar.ts"],
    setupFiles: ["tests/integracion/entorno.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"),
    },
  },
});
