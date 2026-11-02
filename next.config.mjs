/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle, so the Cloud Run image is the Node
  // runtime plus this app rather than the whole node_modules tree.
  output: 'standalone',
};

export default nextConfig;
