const fs = require('fs');
const path = require('path');
const workboxBuild = require('workbox-build');

const APP_ORIGIN = 'https://rorabina.github.io';
const APP_API_URL = 'https://api.github.com/repos/rorabina/app/contents/?ref=gh-pages';

async function fetchRemoteAppFiles() {
  try {
    const res = await fetch(APP_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'rorabina-pwa-builder'
      }
    });
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && item.type === 'file' && item.name && item.name.toLowerCase() !== 'readme.md')
      .map((item) => ({
        path: `/app/${item.name}`,
        size: Number(item.size) || 0
      }));
  } catch (err) {
    console.warn('Could not fetch rorabina/app gh-pages file list:', err.message);
    return [];
  }
}

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
        urlPattern: ({ url }) =>
          url.origin === APP_ORIGIN && url.pathname.startsWith('/app/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rorabina-web-utilities-app',
          expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
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
  let totalCount = Number(count) || 0;

  for (const entry of manifestEntries || []) {
    const normalizedUrl = entry.url.startsWith('/') ? entry.url : '/' + entry.url;
    const entrySize = Number(entry.size) || 0;
    files[normalizedUrl] = entrySize;
    calculatedBytes += entrySize;
  }

  const remoteAppFiles = await fetchRemoteAppFiles();
  for (const appFile of remoteAppFiles) {
    if (!(appFile.path in files)) {
      files[appFile.path] = appFile.size;
      calculatedBytes += appFile.size;
      totalCount += 1;
    }
  }

  const totalBytes =
    calculatedBytes > 0 ? calculatedBytes : Number(size) || 0;

  fs.writeFileSync(
    path.join('./', 'precache-manifest.json'),
    JSON.stringify({ totalBytes, count: totalCount, files }, null, 2),
    'utf8'
  );

  console.log(
    `Successfully generated sw.js: ${totalCount} files (${totalBytes} bytes) including ${remoteAppFiles.length} live /app/ files.`
  );
};
