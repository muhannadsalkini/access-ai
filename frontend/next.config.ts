import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  compiler: {
    removeConsole: true, // removes all console.* calls in production
  },
};

export default nextConfig;
