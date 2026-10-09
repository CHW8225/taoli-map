import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/_AMapService/:path*", destination: "/api/amap/:path*" }];
  }
};

export default nextConfig;

