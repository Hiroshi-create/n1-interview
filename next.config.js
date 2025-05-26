/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 既存のwebpack設定
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

    // コメントアウトされている部分はそのまま保持
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
  transpilePackages: [
    // 既存のパッケージ
    '@algolia/autocomplete-js',
    '@algolia/autocomplete-theme-classic',
    // 新しく追加するパッケージ
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    'reagraph',
    // 必要に応じて、three.jsエコシステムの他のライブラリも追加
    // (例: leva, postprocessing など、エラーや警告が出るもの)
  ],
};

module.exports = nextConfig;