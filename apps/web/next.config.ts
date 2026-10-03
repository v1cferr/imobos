import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, which is what the container image ships.
  output: "standalone",
  // pnpm keeps dependencies in the monorepo root, so tracing has to start there to find them.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
