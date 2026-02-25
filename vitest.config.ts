import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/demo.tsx",
        "**/test-utils.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    environment: "node",
    globals: true,
  },
});
