import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot', 'recharts'],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
