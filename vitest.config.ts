import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@/ui": fileURLToPath(new URL("./components/ui", import.meta.url)),
      "@/features": fileURLToPath(new URL("./components/features", import.meta.url)),
      "@/services": fileURLToPath(new URL("./lib/services", import.meta.url)),
      "@/hooks": fileURLToPath(new URL("./lib/hooks", import.meta.url)),
      "@/utils": fileURLToPath(new URL("./lib/utils", import.meta.url)),
      "@/schemas": fileURLToPath(new URL("./lib/schemas", import.meta.url)),
      "@/shared": fileURLToPath(new URL("./components/shared", import.meta.url)),
      "@/layouts": fileURLToPath(new URL("./components/layouts", import.meta.url)),
      "@/types": fileURLToPath(new URL("./types", import.meta.url)),
      "@/api": fileURLToPath(new URL("./app/api", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}", // Keep existing tests/ directory for helpers
      "tests/**/*.spec.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/e2e/**",
      "**/playwright/**",
      "**/.claude/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "clover"],
      reportsDirectory: "./coverage",
      thresholds: {
        // A ratchet, not a target: these are the current actuals rounded down, so the gate
        // cannot fail today but blocks any change that makes coverage worse. Raise them as
        // real tests land.
        //
        // These keys must stay flat. Vitest reads a nested key under `thresholds` as a glob
        // pattern, so the previous `global: { ... }` wrapper (the Vitest 0.x/Jest shape)
        // matched no files and silently enforced nothing — coverage sat at 48% against a
        // notional 70% for as long as it was written that way.
        statements: 49,
        branches: 36,
        functions: 35,
        lines: 51,
      },
    },
  },
});
