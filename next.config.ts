import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // mongodb 드라이버는 서버에서만 사용 — 클라이언트 번들에 포함되지 않도록 명시
  serverExternalPackages: ['mongodb'],
};

export default nextConfig;
