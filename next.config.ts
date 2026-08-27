import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained dist/standalone/server.js with only the
  // traced production node_modules bundled in — needed for a lean Docker
  // image (see Dockerfile); has no effect on plain `next dev`/`next start`.
  output: "standalone",
};

export default nextConfig;
