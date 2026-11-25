import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end tests build into their own folder, so they never touch the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // A self-contained server (.next/standalone) for the Docker image. `next dev` is not affected.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
