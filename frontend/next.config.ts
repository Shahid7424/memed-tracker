import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces a self-contained server for the Docker image. Vercel ignores this.
  output: 'standalone',
};

export default nextConfig;
