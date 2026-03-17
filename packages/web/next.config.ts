import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // ESLint flat config has module resolution issues in Docker builds;
    // lint is run separately in dev / CI, so skip it during `next build`.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
