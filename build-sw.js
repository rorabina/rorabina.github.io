const workboxBuild = require('workbox-build');
const fs = require('fs');

async function buildSW() {
  console.log('Cleaning HTML files, injecting manifest, adding sw-register, and building SW...');
  const htmlFiles = fs.readdirSync('./').filter(file => file.endsWith('.html'));

  // Record exact ISO build timestamp for client local timezone conversion
  const buildTimeISO = new Date().toISOString();

  htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Remove Mobirise engine sections, containers, and backlinks completely
    content = content.replace(/<(section|div|footer|p)[^>]*>(?:(?!<\/(?:section|div|footer|p)>)[\s\S])*?href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[\s\S]*?<\/\1>/gi, '');
    content = content.replace(/<a[^>]*href="https?:\/\/(www\.)?(mobirise\.com|mobiri\.se)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');

    // 2. Remove duplicate inline PWA installers from app.html
    content = content.replace(/<script[^>]*id="pwa-android-installer"[^>]*>[\s\S]*?<\/script>/gi, '');

    // 3. Fix broken Capgo CapacitorUpdater CDN import
    content = content.replace(
      /<script[^>]*type="module"[^>]*>[\s\S]*?import\s*\{\s*CapacitorUpdater\s*\}\s*from\s*['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@capgo\/capacitor-updater[^'"]*['"];?[\s\S]*?<\/script>/gi,
      `<script>
  document.addEventListener('deviceready', () => {
    const { CapacitorUpdater } = window.Capacitor?.Plugins || {};
    if (CapacitorUpdater) {
      CapacitorUpdater.notifyAppReady();
    }
  });
</script>`
    );

    // 4. Inject CSS Fail-Safe
    if (!content.includes('/* Mobirise Fail-Safe */')) {
      const styleInject = `
<style id="mobirise-cleaner">
  /* Mobirise Fail-Safe */
  [class*="engine"], [id*="mobirise"], a[href*="mobiri.se"], a[href*="mobirise.com"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
  }
</style>
`;
      content = content.replace(/<\/head>/i, `${styleInject}\n</head>`);
    }

    // 5. Inject Web App Manifest link if missing
    if (!content.includes('rel="manifest"')) {
      content = content.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n</head>');
    }

    // 6. Inject Service Worker registration script into ALL HTML pages if missing
    if (!content.includes('sw-register.js')) {
      content = content.replace(/<\/body>/i, '  <script src="sw-register.js"></script>\n</body>');
    }

    // 7. Inject Build Timestamp for NUL1
    content = content.replace(/NUL1/g, buildTimeISO);

    fs.writeFileSync(file, content, 'utf8');
  });

  // 8. Generate Workbox Service Worker
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
    navigateFallback: 'index.html',
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'rorabina-html-pages',
          expiration: { maxEntries: 50 },
        },
      },
      {
        urlPattern: ({ request, url }) =>
          request.destination === 'style' ||
          request.destination === 'script' ||
          request.destination === 'image' ||
          request.destination === 'font' ||
          url.pathname.includes('/assets/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'rorabina-assets',
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 60 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  });

  console.log(`Generated sw.js: precatching ${count} files (${size} bytes).`);

  // 9. Inject Progress Reporting into sw.js
  const swPath = './sw.js';
  if (fs.existsSync(swPath)) {
    let swCode = fs.readFileSync(swPath, 'utf8');
    const trackingScript = `

/* --- Progress Reporting Extension --- */
let totalPrecacheItems = ${count};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_PROGRESS') {
    broadcastProgress();
  }
});

function broadcastProgress() {
  caches.open(workbox.core.cacheNames.precache).then((cache) => {
    cache.keys().then((keys) => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'CACHE_PROGRESS',
            current: keys.length,
            total: totalPrecacheItems
          });
        });
      });
    });
  });
}
`;
    fs.writeFileSync(swPath, swCode + trackingScript, 'utf8');
    console.log('Successfully injected progress tracking listener into sw.js');
  }
}

buildSW().catch(console.error);
