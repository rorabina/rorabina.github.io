const workboxBuild = require('workbox-build');

workboxBuild.generateSW({
  globDirectory: './',
  globPatterns: [
    '**/*.{html,css,js,png,jpg,svg,json}'
  ],
  swDest: './sw.js',
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
      },
    }
  ]
}).then(({count, size, warnings}) => {
  if (warnings.length > 0) {
    console.warn('Workbox build warnings:', warnings.join('\n'));
  }
  console.log(`Service worker successfully generated. ${count} files precached, totaling ${size} bytes.`);
}).catch(err => {
  console.error('Workbox build failed:', err);
});
