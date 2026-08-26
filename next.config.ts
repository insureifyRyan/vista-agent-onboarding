import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The onboarding page reads UTM query params on first load, so it must never
  // be served from a static/edge cache with a stale query string attached.
  async headers() {
    return [
      {
        source: '/onboarding',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
