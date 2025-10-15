import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Do not fail production builds on ESLint errors. We'll fix lints incrementally.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
