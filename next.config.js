/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@azure/cosmos', '@azure/storage-blob', '@azure/search-documents'],
  env: {
    NEXT_PUBLIC_APP_NAME: 'ARIA',
  },
}

module.exports = nextConfig
