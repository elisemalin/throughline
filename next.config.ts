import type { NextConfig } from 'next';

// WHY: Strict mode catches double-effect bugs in dev; production unaffected.
// poweredByHeader removed because the `X-Powered-By` header advertises the
// framework to anyone scanning headers — no upside, slight downside.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
