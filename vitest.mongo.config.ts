import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * The MongoDB suite. Separate from the fast unit suite on purpose: it needs
 * a real database, so it runs on demand and in CI rather than on every save.
 *
 * Files run sequentially. They share one database and several of them
 * deliberately race the same table, so parallel files would be racing each
 * other rather than the code under test.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.mongo.test.ts"],
    setupFiles: ["./test/mongo-setup.ts"],
    fileParallelism: false,
    // A cold Atlas connection plus index creation is slower than a unit test.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
