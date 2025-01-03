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
};

module.exports = nextConfig;
