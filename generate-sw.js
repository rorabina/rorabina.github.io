const workboxBuild = require('workbox-build');

module.exports = async function generateServiceWorker() {
  const { count, size } = await workboxBuild.generateSW({
    globDirectory: './',
    globPatterns: [
      '**/*.html',
      'assets/**/*.css',
      'assets/**/*.js',
      'assets/**/*.{png,jpg,jpeg,svg,gif,woff,woff2,ttf,eot}',
      'manifest.json'
    ],
    globIgnores: [
      'node_modules/**/*',
      'layout-protections.js',
      'inject-dynamics.js',
      'generate-sw.js',
      'build-sw.js',
      'sw.js',
      'workbox-*.js',
      'releases/**/*',
      '.github/**/*'
    ],
    swDest: 'sw.js',
    inlineWorkboxRuntime: true,
    ignoreURLParametersMatching: [/./],
    clientsClaim: true,
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'rorabina-html-pages', expiration: { maxEntries: 50 } },
      },
      {
        urlPattern: ({ request, url }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font' || url.pathname.includes('/assets/'),
        handler: 'CacheFirst',
        options: { cacheName: 'rorabina-assets', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } },
      },
    ],
  });
  console.log(`Successfully generated sw.js: precached ${count} files (${size} bytes).`);
};
