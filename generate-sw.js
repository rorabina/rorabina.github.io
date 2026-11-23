const fs = require('fs');
const path = require('path');
const workboxBuild = require('workbox-build');

const APP_ORIGIN = 'https://rorabina.github.io';
const APP_TREE_API_URL =
  'https://api.github.com/repos/rorabina/app/git/trees/gh-pages?recursive=1';

async function fetchRemoteAppFiles() {
  try {
    const res = await fetch(APP_TREE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'rorabina-pwa-builder'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tree = Array.isArray(data?.tree) ? data.tree : [];

    return tree
      .filter((item) => {
        if (!item || item.type !== 'blob' || !item.path) return false;
        const lower = item.path.toLowerCase();
        return lower !== 'readme.md' && !lower.startsWith('.github/');
      })
      .map((item) => ({
        path: `/app/${item.path.replace(/^\/+/, '')}`,
        size: Number(item.size) || 0
      }));
  } catch (err) {
    console.warn('Could not fetch rorabina/app gh-pages tree:', err.message);
    return [];
  }
}

module.exports = async function generateServiceWorker() {
  const rootDir = process.cwd();

  const { count, size, manifestEntries } = await workboxBuild.generateSW({
    globDirectory: rootDir,
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
      'inject-sw.js',
      'generate-sw.js',
      'build-sw.js',
      'sw.js',
      'workbox-*.js',
      'precache-manifest.json',
      'releases/**/*',
      '.github/**/*'
    ],
    swDest: path.join(rootDir, 'sw.js'),
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
          expiration: { maxEntries: 150, maxAgeSeconds: 30 * 24 * 60 * 60 },
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
    let entrySize = Number(entry.size) || 0;
    if (!entrySize) {
      try {
        const relPath = decodeURIComponent(entry.url.replace(/^\/+/, ''));
        const localFilePath = path.join(rootDir, relPath);
        if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
          entrySize = fs.statSync(localFilePath).size;
        }
      } catch (_) {}
    }
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

  const totalBytes = calculatedBytes > 0 ? calculatedBytes : Number(size) || 0;
  const manifestPayload = { totalBytes, count: totalCount, files };

  fs.writeFileSync(
    path.join(rootDir, 'precache-manifest.json'),
    JSON.stringify(manifestPayload, null, 2),
    'utf8'
  );

  const swRegisterPath = path.join(rootDir, 'sw-register.js');
  if (fs.existsSync(swRegisterPath)) {
    const existing = fs
      .readFileSync(swRegisterPath, 'utf8')
      .replace(/^window\.__PWA_BUNDLE_BYTES__\s*=\s*\d+;\n/, '');
    fs.writeFileSync(
      swRegisterPath,
      `window.__PWA_BUNDLE_BYTES__ = ${totalBytes};\n` + existing,
      'utf8'
    );
  }

  console.log(
    `Successfully generated sw.js: ${totalCount} files (${totalBytes} bytes) including ${remoteAppFiles.length} live /app/ files.`
  );
};