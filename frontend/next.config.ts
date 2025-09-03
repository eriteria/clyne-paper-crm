import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname, // Use frontend directory as the root
  },
};

export default nextConfig;
