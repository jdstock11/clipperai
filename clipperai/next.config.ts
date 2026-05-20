import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
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
    }
    // In production, the API routes handle the proxying themselves, or we'd need to rewrite to the external backend.
    // However, rewrites to external domains in Vercel count as Edge Function invocations and might have timeouts.
    // Next.js config doesn't have access to NEXT_PUBLIC_API_URL at build time if it's dynamic.
    // It's safer to rely on the Next.js API route proxies we have for the main endpoints,
    // and if auth/admin need it, they should use process.env.NEXT_PUBLIC_API_URL dynamically in the client or a proxy route.
    return [];
  },
};

export default nextConfig;
