import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Background URLs come from arbitrary user-supplied origins — keep unoptimized.
  images: {
    unoptimized: true,
  },

  // Enable gzip/brotli response compression in the built-in server.
  compress: true,

  // Produce smaller client bundles by removing dead code via SWC.
  compiler: {
    // Remove console.log in production, keep console.error/warn.
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  experimental: {
    // Deduplicate identical CSS chunks across pages.
    optimizeCss: false, // requires critters — leave off unless critters is installed

    // Inline the Next.js server runtime into each page bundle (reduces round trips).
    // serverMinification: true, // available in Next 15+
  },

  // Suppress build-time traces for cleaner CI output (no perf impact).
  // generateBuildId: () => 'build',
};

export default nextConfig;
