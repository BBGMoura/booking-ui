import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/bookings', destination: '/calendar', permanent: true }];
  },
};

export default nextConfig;
