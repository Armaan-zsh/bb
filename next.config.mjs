/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent better-sqlite3 from being bundled by webpack (native module)
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
