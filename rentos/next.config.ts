import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The recovered tree carries an old single-file HTML demo under demo/.
  // It is not part of the app and must not be compiled.
  outputFileTracingExcludes: { "*": ["./demo/**"] },
};

export default nextConfig;
