import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/bookings', destination: '/calendar', permanent: true },
      { source: '/admin/rates', destination: '/admin/floor-fees', permanent: true },
    ];
  },
};

export default nextConfig;
