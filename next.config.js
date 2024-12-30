/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "export",
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ffmpeg/core': '@ffmpeg/core/dist/ffmpeg-core.js',
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;