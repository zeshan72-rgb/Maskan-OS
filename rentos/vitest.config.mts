import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// .mts so vitest loads this as ESM. vite-tsconfig-paths is ESM-only and
// cannot be required from a .ts config.
// The recovered tests import through the @/ alias, so the plugin is required
// for them to resolve outside Next's own bundler.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
