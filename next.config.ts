import type { NextConfig } from "next";

const nextConfig: any = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gscjqrejmnzsrkghasuos.supabase.co',
        port: '',
        pathname: '**',
      },
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    }
  },
  typescript: {
    ignoreBuildErrors: true,
  },

};

export default nextConfig;
