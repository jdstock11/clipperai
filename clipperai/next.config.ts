import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:4000/api/auth/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:4000/api/admin/:path*',
      },
    ];
  },
};

export default nextConfig;
