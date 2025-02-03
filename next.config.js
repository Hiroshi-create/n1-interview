/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 既存の設定
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

    // config.module.rules.push({
    //   test: /\.(mp3|wav)$/,
    //   use: {
    //     loader: 'file-loader',
    //     options: {
    //       name: '[name].[ext]',
    //       publicPath: `/_next/static/audio/`,
    //       outputPath: `${isServer ? '../' : ''}static/audio/`,
    //     },
    //   },
    // });

    return config;
  },
  transpilePackages: ['@algolia/autocomplete-js', '@algolia/autocomplete-theme-classic'],
  env: {
    ROOT_DOMAIN: process.env.ROOT_DOMAIN || 'http://localhost:3000'
  }
};

module.exports = nextConfig;