import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* other config options here */
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;