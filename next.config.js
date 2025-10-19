/** @type {import('next').NextConfig} */

// セキュリティヘッダーの設定
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()'
  },
  // Content Security Policy - Report Only mode for safe implementation
  {
    key: 'Content-Security-Policy-Report-Only',
    value: process.env.NODE_ENV === 'production' 
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://api.stripe.com; media-src 'self' blob: data:; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src *; media-src *; frame-src *;"
  },
  // Additional security headers
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  }
];

const nextConfig = {
  // セキュリティヘッダーを全てのルートに適用
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
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