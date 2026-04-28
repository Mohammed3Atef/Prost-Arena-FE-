/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // allow any https image in dev
    ],
  },
  // Silence the "metadataBase not set" warning in dev
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  // Cap build worker count — many parallel workers each loading mongoose
  // crash with memory access violations on Windows. One CPU keeps it stable.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  // Don't bundle mongoose for the server runtime; load it from node_modules at
  // request time. Avoids serialization bombs that crash build workers on Windows.
  serverExternalPackages: ['mongoose', 'bcryptjs'],
};

module.exports = nextConfig;
