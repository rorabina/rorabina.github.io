const fs = require('fs');
const path = require('path');
const workboxBuild = require('workbox-build');

module.exports = async function generateServiceWorker() {
  const { count, size, manifestEntries } = await workboxBuild.generateSW({
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
      'precache-manifest.json',
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
        handler: 'NetworkFirst',
        options: {
          cacheName: 'rorabina-html-pages',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 50 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: ({ request, url }) =>
          request.destination === 'style' ||
          request.destination === 'script' ||
          request.destination === 'image' ||
          request.destination === 'font' ||
          url.pathname.includes('/assets/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rorabina-assets',
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      }
    ]
  });

  const files = {};
  let calculatedBytes = 0;

  for (const entry of manifestEntries || []) {
    const normalizedUrl = entry.url.startsWith('/') ? entry.url : '/' + entry.url;
    const entrySize = Number(entry.size) || 0;
    files[normalizedUrl] = entrySize;
    calculatedBytes += entrySize;
  }

  const totalBytes = Number(size) > 0 ? Number(size) : calculatedBytes;

  fs.writeFileSync(
    path.join('./', 'precache-manifest.json'),
    JSON.stringify({ totalBytes, count, files }, null, 2),
    'utf8'
  );

  console.log(`Successfully generated sw.js: precached ${count} files (${totalBytes} bytes) and wrote precache-manifest.json.`);
};
