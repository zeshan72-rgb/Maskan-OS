import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// .mts so vitest loads this as ESM; vite-tsconfig-paths is ESM-only.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The `server-only` package throws on import outside a React Server
      // Component. That guard is exactly what we want in the app, but it
      // also stops Vitest importing pure functions like landingPathFor from
      // a server-marked module. Aliasing it to a no-op keeps the production
      // guarantee while letting the unit tests run.
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
