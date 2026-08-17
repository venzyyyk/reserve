import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws by design outside a server bundle; tests exercise
      // server modules directly, so it resolves to a no-op here.
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // The `.mongo.test.ts` suites need a real database and run separately
    // (`npm run test:mongo`). Keeping them out here is what lets the fast
    // suite stay runnable with nothing installed.
    exclude: [...configDefaults.exclude, "src/**/*.mongo.test.ts"],
    coverage: { include: ["src/shared/**"] },
  },
});
