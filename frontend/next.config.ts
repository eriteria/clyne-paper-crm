import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Prevent aggressive caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.zoho.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: __dirname, // Use frontend directory as the root
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Note: missingSuspenseWithCSRBailout was removed in newer Next.js versions
  },
};

export default nextConfig;
